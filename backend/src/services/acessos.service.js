import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

const TIPOS_ACESSO = new Set(["visitante", "prestador", "entrega", "outro"]);
const STATUS_AUTORIZACAO = new Set(["pendente", "autorizado", "em_andamento", "finalizado", "cancelado", "negado"]);
const TIPOS_EVENTO = new Set(["entrada", "saida", "tentativa", "negado", "ajuste"]);
const ORIGENS_EVENTO = new Set(["manual", "qrcode", "placa"]);
const ORIGENS_SOLICITACAO = new Set(["morador", "portaria", "admin"]);
const TIPOS_DESTINO = new Set(["unidade", "administracao", "area_comum", "outro"]);
const CATEGORIAS_PRESTADOR = {
  energia_eletrica: "Energia eletrica",
  agua_hidraulica: "Agua / hidraulica",
  construcao_civil: "Construcao civil",
  internet_tv_rede: "Internet / TV / rede",
  saude: "Saude",
  personal: "Personal",
  setor_comercial: "Setor comercial",
  automotivo: "Automotivo",
  limpeza: "Limpeza",
  manutencao_geral: "Manutencao geral",
  entrega_tecnica: "Entrega tecnica",
  outro: "Outro",
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeComparableText(value) {
  return normalizeText(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeDateTime(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "on", "sim", "yes"].includes(normalized);
  }
  return false;
}

async function getContextoMorador(usuarioId) {
  const [rows] = await db.query(
    `
    SELECT
      uu.unidade_id,
      uu.papel,
      u.condominio_id,
      u.identificacao AS unidade_identificacao,
      c.nome_fantasia AS condominio_nome,
      t.nome AS torre_nome
    FROM unidade_usuarios uu
    INNER JOIN unidades u ON u.id = uu.unidade_id
    INNER JOIN condominios c ON c.id = u.condominio_id
    LEFT JOIN torres t ON t.id = u.torre_id
    WHERE uu.usuario_id = ? AND uu.ativo = 1
    ORDER BY FIELD(uu.papel, 'titular', 'proprietario', 'dependente'), uu.criado_em ASC
    LIMIT 1
    `,
    [usuarioId],
  );

  if (!rows.length) {
    const error = new Error("Morador sem unidade ativa vinculada");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

async function getContextoFuncionario(usuarioId) {
  const [rows] = await db.query(
    `
    SELECT
      f.id AS funcionario_id,
      f.condominio_id,
      f.area_atuacao,
      f.cargo,
      f.status,
      c.nome_fantasia AS condominio_nome
    FROM funcionarios f
    INNER JOIN condominios c ON c.id = f.condominio_id
    WHERE f.usuario_id = ?
    LIMIT 1
    `,
    [usuarioId],
  );

  if (!rows.length) {
    const error = new Error("Cadastro funcional nao encontrado");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

async function getScopedColaboradorForAutorizacao(usuario, colaboradorId, condominioId, unidadeId) {
  if (!colaboradorId) return null;

  const [rows] = await db.query(
    `
    SELECT id, condominio_id, unidade_id, nome_completo, documento, empresa, funcao, status
    FROM colaboradores_unidade
    WHERE id = ? AND condominio_id = ? AND unidade_id = ?
    LIMIT 1
    `,
    [colaboradorId, condominioId, unidadeId],
  );

  if (!rows.length) {
    const error = new Error(
      usuario.perfil === "morador"
        ? "Colaborador recorrente nao pertence a sua unidade"
        : "Colaborador recorrente invalido para a unidade informada",
    );
    error.status = 404;
    throw error;
  }

  if (rows[0].status !== "ativo") {
    const error = new Error("Somente colaboradores ativos podem ser usados na liberacao recorrente");
    error.status = 409;
    throw error;
  }

  return rows[0];
}

async function getScopedPrestadorForAutorizacao(usuario, prestadorId, condominioId) {
  if (!prestadorId) return null;

  const [rows] = await db.query(
    `
    SELECT
      id,
      condominio_id,
      nome_prestador,
      documento,
      empresa,
      telefone,
      placa,
      veiculo_descricao,
      responsavel_nome,
      categoria_servico,
      status
    FROM prestadores_servico
    WHERE id = ? AND condominio_id = ?
    LIMIT 1
    `,
    [prestadorId, condominioId],
  );

  if (!rows.length) {
    const error = new Error(
      usuario.perfil === "morador"
        ? "Prestador recorrente nao pertence ao seu condominio"
        : "Prestador recorrente invalido para o condominio informado",
    );
    error.status = 404;
    throw error;
  }

  if (rows[0].status !== "ativo") {
    const error = new Error("Somente prestadores ativos podem ser usados na liberacao recorrente");
    error.status = 409;
    throw error;
  }

  return rows[0];
}

async function getScopedInboxVisitanteForAutorizacao(usuario, inboxVisitanteId, condominioId, unidadeId = null) {
  if (!inboxVisitanteId) return null;

  const params = [inboxVisitanteId, condominioId];
  let extraWhere = "";
  if (unidadeId) {
    extraWhere = " AND unidade_id = ?";
    params.push(unidadeId);
  }

  const [rows] = await db.query(
    `
    SELECT
      id,
      unidade_id,
      nome_completo,
      documento,
      telefone,
      parentesco_relacao,
      observacoes,
      status
    FROM inbox_visitantes_unidade
    WHERE id = ? AND condominio_id = ?${extraWhere}
    LIMIT 1
    `,
    params,
  );

  if (!rows.length) {
    const error = new Error("Pessoa do inBox nao encontrada para este contexto");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

async function findBlockedInboxMatch(condominioId, { inboxVisitanteId = null, nomeVisitante = null, documento = null }) {
  const documentoNormalizado = normalizeText(documento);
  const nomeNormalizado = normalizeComparableText(nomeVisitante);

  if (!inboxVisitanteId && !documentoNormalizado && !nomeNormalizado) {
    return null;
  }

  const [rows] = await db.query(
    `
    SELECT id, unidade_id, nome_completo, documento, status
    FROM inbox_visitantes_unidade
    WHERE condominio_id = ?
      AND status = 'bloqueado'
    `,
    [condominioId],
  );

  return (
    rows.find((item) => {
      if (inboxVisitanteId && item.id === inboxVisitanteId) return true;
      if (documentoNormalizado && item.documento && normalizeText(item.documento) === documentoNormalizado) return true;
      return Boolean(nomeNormalizado && normalizeComparableText(item.nome_completo) === nomeNormalizado);
    }) || null
  );
}

function formatarCategoriaPrestador(categoria) {
  return CATEGORIAS_PRESTADOR[categoria] || "Servico";
}

async function validarUnidadeDoCondominio(condominioId, unidadeId) {
  const [rows] = await db.query(
    `
    SELECT
      u.id AS unidade_id,
      u.identificacao AS unidade_identificacao,
      u.condominio_id,
      c.nome_fantasia AS condominio_nome
    FROM unidades u
    INNER JOIN condominios c ON c.id = u.condominio_id
    WHERE u.condominio_id = ? AND u.id = ?
    LIMIT 1
    `,
    [condominioId, unidadeId],
  );

  if (!rows.length) {
    const error = new Error("Unidade invalida para o condominio informado");
    error.status = 404;
    throw error;
  }

  return rows[0];
}
async function validarCondominioUnidadeAdmin(adminUsuarioId, condominioId, unidadeId) {
  const [rows] = await db.query(
    `
    SELECT
      u.id AS unidade_id,
      u.identificacao AS unidade_identificacao,
      u.condominio_id,
      c.nome_fantasia AS condominio_nome
    FROM unidades u
    INNER JOIN condominios c ON c.id = u.condominio_id
    WHERE c.admin_id = ? AND u.condominio_id = ? AND u.id = ?
    LIMIT 1
    `,
    [adminUsuarioId, condominioId, unidadeId],
  );

  if (!rows.length) {
    const error = new Error("Unidade invalida ou fora do escopo do admin");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

async function obterPorteirosAtivos(condominioId) {
  const [rows] = await db.query(
    `
    SELECT
      fs.id AS sessao_id,
      fs.funcionario_id,
      fs.iniciado_em,
      fs.ultimo_ping_em
    FROM funcionarios_sessoes fs
    INNER JOIN funcionarios f ON f.id = fs.funcionario_id
    WHERE fs.condominio_id = ?
      AND fs.status = 'ativa'
      AND f.status = 'ativo'
      AND f.area_atuacao = 'portaria'
      AND fs.ultimo_ping_em >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    ORDER BY fs.iniciado_em ASC, fs.criado_em ASC
    `,
    [condominioId],
  );

  return rows;
}

async function escolherPorteiroDestino(condominioId) {
  const porteiros = await obterPorteirosAtivos(condominioId);

  if (!porteiros.length) {
    return null;
  }

  if (porteiros.length === 1) {
    return porteiros[0].funcionario_id;
  }

  const ids = porteiros.map((porteiro) => porteiro.funcionario_id);
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await db.query(
    `
    SELECT destinado_para_funcionario_id
    FROM acessos_autorizacoes
    WHERE condominio_id = ?
      AND destinado_para_funcionario_id IN (${placeholders})
    ORDER BY criado_em DESC
    LIMIT 1
    `,
    [condominioId, ...ids],
  );

  if (!rows.length || !rows[0].destinado_para_funcionario_id) {
    return porteiros[0].funcionario_id;
  }

  const ultimoId = rows[0].destinado_para_funcionario_id;
  const indexAtual = porteiros.findIndex((porteiro) => porteiro.funcionario_id === ultimoId);

  if (indexAtual === -1) {
    return porteiros[0].funcionario_id;
  }

  const proximoIndex = (indexAtual + 1) % porteiros.length;
  return porteiros[proximoIndex].funcionario_id;
}

function descreverStatusParaEvento(tipoEvento) {
  if (tipoEvento === "entrada") return "em_andamento";
  if (tipoEvento === "saida") return "finalizado";
  if (tipoEvento === "negado") return "negado";
  return null;
}

export async function createAutorizacaoAcessoService(usuario, data) {
  const tipoAcesso = normalizeText(data.tipo_acesso);
  const colaboradorUnidadeId = normalizeText(data.colaborador_unidade_id);
  const inboxVisitanteId = normalizeText(data.inbox_visitante_id);
  const prestadorServicoId = normalizeText(data.prestador_servico_id);
  const nomeVisitante = normalizeText(data.nome_visitante);
  const documento = normalizeText(data.documento);
  const empresa = normalizeText(data.empresa);
  const servico = normalizeText(data.servico);
  const placa = normalizeText(data.placa)?.toUpperCase();
  const veiculoDescricao = normalizeText(data.veiculo_descricao);
  const urgente = normalizeBoolean(data.urgente);
  const inicioPrevisto = normalizeDateTime(data.inicio_previsto);
  const fimPrevisto = normalizeDateTime(data.fim_previsto);
  const origemSolicitacaoInformada = normalizeText(data.origem_solicitacao);
  const destinoTipoInformado = normalizeText(data.destino_tipo) || "unidade";
  const destinoDescricao = normalizeText(data.destino_descricao);
  const contatoDestino = normalizeText(data.contato_destino);

  if (!TIPOS_ACESSO.has(tipoAcesso)) {
    const error = new Error("Tipo de acesso invalido");
    error.status = 400;
    throw error;
  }

  if (!inicioPrevisto) {
    const error = new Error("Inicio previsto e obrigatorio");
    error.status = 400;
    throw error;
  }

  if (!TIPOS_DESTINO.has(destinoTipoInformado)) {
    const error = new Error("Destino invalido para a autorizacao");
    error.status = 400;
    throw error;
  }

  if (tipoAcesso === "prestador" && !servico && !colaboradorUnidadeId) {
    const error = new Error("Prestador de servico exige detalhamento do servico");
    error.status = 400;
    throw error;
  }

  let condominioId;
  let unidadeId = normalizeText(data.unidade_id);
  let solicitanteId = usuario.id;
  let criadoPor = usuario.id;
  let contextoUnidade = null;
  let colaborador = null;
  let inboxVisitante = null;
  let prestador = null;
  let origemSolicitacao = origemSolicitacaoInformada;
  let destinoTipo = destinoTipoInformado;
  let destinadoParaFuncionarioId = null;
  let assumidoPorFuncionarioId = null;

  if (usuario.perfil === "morador") {
    const contexto = await getContextoMorador(usuario.id);
    condominioId = contexto.condominio_id;
    unidadeId = contexto.unidade_id;
    contextoUnidade = contexto;
    origemSolicitacao = "morador";
    destinoTipo = "unidade";
  } else if (usuario.perfil === "admin") {
    condominioId = normalizeText(data.condominio_id);
    unidadeId = normalizeText(data.unidade_id);
    solicitanteId = normalizeText(data.solicitante_id) || usuario.id;
    origemSolicitacao = origemSolicitacao && ORIGENS_SOLICITACAO.has(origemSolicitacao) ? origemSolicitacao : "admin";

    if (!condominioId || !unidadeId) {
      const error = new Error("Condominio e unidade sao obrigatorios para criacao assistida do admin");
      error.status = 400;
      throw error;
    }

    contextoUnidade = await validarCondominioUnidadeAdmin(usuario.id, condominioId, unidadeId);
  } else if (usuario.perfil === "funcionario") {
    const contexto = await getContextoFuncionario(usuario.id);

    if (contexto.area_atuacao !== "portaria") {
      const error = new Error("Somente funcionarios de portaria podem criar entradas espontaneas");
      error.status = 403;
      throw error;
    }

    condominioId = contexto.condominio_id;
    solicitanteId = usuario.id;
    origemSolicitacao = "portaria";
    destinadoParaFuncionarioId = contexto.funcionario_id;
    assumidoPorFuncionarioId = contexto.funcionario_id;

    if (destinoTipo === "unidade" && unidadeId) {
      contextoUnidade = await validarUnidadeDoCondominio(condominioId, unidadeId);
    } else if (destinoTipo !== "unidade") {
      unidadeId = null;
    }

    if (!unidadeId && !destinoDescricao) {
      const error = new Error("Informe para onde a pessoa vai ou com quem vai falar");
      error.status = 400;
      throw error;
    }
  } else {
    const error = new Error("Perfil sem permissao para criar autorizacao");
    error.status = 403;
    throw error;
  }

  if (!ORIGENS_SOLICITACAO.has(origemSolicitacao)) {
    const error = new Error("Origem da solicitacao invalida");
    error.status = 400;
    throw error;
  }

  colaborador = unidadeId
    ? await getScopedColaboradorForAutorizacao(usuario, colaboradorUnidadeId, condominioId, unidadeId)
    : null;
  inboxVisitante = await getScopedInboxVisitanteForAutorizacao(usuario, inboxVisitanteId, condominioId, unidadeId);
  if (!unidadeId && inboxVisitante?.unidade_id && destinoTipo === "unidade") {
    unidadeId = inboxVisitante.unidade_id;
    contextoUnidade = await validarUnidadeDoCondominio(condominioId, unidadeId);
  }
  prestador = await getScopedPrestadorForAutorizacao(usuario, prestadorServicoId, condominioId);

  const blockedInboxMatch = await findBlockedInboxMatch(condominioId, {
    inboxVisitanteId,
    nomeVisitante: nomeVisitante || inboxVisitante?.nome_completo,
    documento: documento || inboxVisitante?.documento,
  });

  if (inboxVisitante?.status === "bloqueado" || blockedInboxMatch) {
    const error = new Error("Esta pessoa do inBox esta bloqueada e exige liberacao manual");
    error.status = 409;
    throw error;
  }

  const nomeVisitanteFinal = nomeVisitante || prestador?.nome_prestador || colaborador?.nome_completo || inboxVisitante?.nome_completo;
  const documentoFinal = documento || prestador?.documento || colaborador?.documento || inboxVisitante?.documento || null;
  const empresaFinal = empresa || prestador?.empresa || colaborador?.empresa || null;
  const servicoFinal =
    servico ||
    (prestador ? formatarCategoriaPrestador(prestador.categoria_servico) : null) ||
    (colaborador ? colaborador.funcao.replaceAll("_", " ") : null);
  const placaFinal = placa || prestador?.placa || null;
  const veiculoDescricaoFinal = veiculoDescricao || prestador?.veiculo_descricao || null;

  if (!nomeVisitanteFinal) {
    const error = new Error("Nome e inicio previsto sao obrigatorios");
    error.status = 400;
    throw error;
  }

  if (tipoAcesso === "prestador" && !servicoFinal) {
    const error = new Error("Prestador de servico exige detalhamento do servico");
    error.status = 400;
    throw error;
  }

  if (!destinadoParaFuncionarioId) {
    destinadoParaFuncionarioId = await escolherPorteiroDestino(condominioId);
  }

  const autorizacaoId = uuidv4();

  await db.query(
    `
    INSERT INTO acessos_autorizacoes
      (id, condominio_id, unidade_id, colaborador_unidade_id, solicitante_id, origem_solicitacao, tipo_acesso, destino_tipo, destino_descricao, contato_destino, nome_visitante, documento, empresa, servico, placa, veiculo_descricao, inicio_previsto, fim_previsto, urgente, status, destinado_para_funcionario_id, assumido_por_funcionario_id, assumido_em, criado_por)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?, ?)
    `,
    [
      autorizacaoId,
      condominioId,
      unidadeId || null,
      colaboradorUnidadeId || null,
      solicitanteId,
      origemSolicitacao,
      tipoAcesso,
      destinoTipo,
      destinoDescricao || contextoUnidade?.unidade_identificacao || null,
      contatoDestino || null,
      nomeVisitanteFinal,
      documentoFinal,
      empresaFinal,
      servicoFinal,
      placaFinal,
      veiculoDescricaoFinal,
      inicioPrevisto,
      fimPrevisto || null,
      urgente ? 1 : 0,
      destinadoParaFuncionarioId,
      assumidoPorFuncionarioId || null,
      assumidoPorFuncionarioId ? new Date() : null,
      criadoPor,
    ],
  );

  if (inboxVisitanteId) {
    await db.query(
      `
      UPDATE acessos_autorizacoes
      SET inbox_visitante_id = ?
      WHERE id = ?
      `,
      [inboxVisitanteId, autorizacaoId],
    );

    await db.query(
      `
      UPDATE inbox_visitantes_unidade
      SET ultimo_acesso_em = NOW()
      WHERE id = ?
      `,
      [inboxVisitanteId],
    );
  }

  if (prestadorServicoId) {
    await db.query(
      `
      UPDATE acessos_autorizacoes
      SET prestador_servico_id = ?
      WHERE id = ?
      `,
      [prestadorServicoId, autorizacaoId],
    );

    await db.query(
      `
      UPDATE prestadores_servico
      SET ultimo_acesso_em = NOW()
      WHERE id = ?
      `,
      [prestadorServicoId],
    );
  }

  return {
    autorizacao: {
      id: autorizacaoId,
      inbox_visitante_id: inboxVisitanteId || null,
      prestador_servico_id: prestadorServicoId || null,
      origem_solicitacao: origemSolicitacao,
      tipo_acesso: tipoAcesso,
      destino_tipo: destinoTipo,
      destino_descricao: destinoDescricao || contextoUnidade?.unidade_identificacao || null,
      contato_destino: contatoDestino || null,
      nome_visitante: nomeVisitanteFinal,
      status: "pendente",
      urgente,
      colaborador_unidade_id: colaboradorUnidadeId || null,
      documento: documentoFinal,
      empresa: empresaFinal,
      servico: servicoFinal,
      placa: placaFinal,
      veiculo_descricao: veiculoDescricaoFinal,
      inicio_previsto: inicioPrevisto,
      fim_previsto: fimPrevisto || null,
      destinado_para_funcionario_id: destinadoParaFuncionarioId,
      assumido_por_funcionario_id: assumidoPorFuncionarioId || null,
    },
    contexto: {
      condominio_id: condominioId,
      unidade_id: unidadeId || null,
      unidade_identificacao: contextoUnidade?.unidade_identificacao || null,
      condominio_nome: contextoUnidade?.condominio_nome || null,
    },
  };
}

export async function listAutorizacoesAcessoService(usuario, filtros = {}) {
  const params = [];
  let where = " WHERE 1 = 1";

  if (usuario.perfil === "morador") {
    const contexto = await getContextoMorador(usuario.id);
    where += " AND aa.condominio_id = ? AND aa.unidade_id = ? AND aa.solicitante_id = ?";
    params.push(contexto.condominio_id, contexto.unidade_id, usuario.id);
  } else if (usuario.perfil === "funcionario") {
    const contexto = await getContextoFuncionario(usuario.id);
    where += " AND aa.condominio_id = ?";
    params.push(contexto.condominio_id);
  } else if (usuario.perfil === "admin") {
    where += " AND c.admin_id = ?";
    params.push(usuario.id);
  } else {
    const error = new Error("Perfil sem permissao para consultar autorizacoes");
    error.status = 403;
    throw error;
  }

  if (filtros.condominio_id && usuario.perfil === "admin") {
    where += " AND aa.condominio_id = ?";
    params.push(filtros.condominio_id);
  }

  if (filtros.status && STATUS_AUTORIZACAO.has(filtros.status)) {
    where += " AND aa.status = ?";
    params.push(filtros.status);
  }

  const [rows] = await db.query(
    `
    SELECT
      aa.id,
      aa.condominio_id,
      c.nome_fantasia AS condominio_nome,
      aa.unidade_id,
      u.identificacao AS unidade_identificacao,
      aa.solicitante_id,
      us.nome_completo AS solicitante_nome,
      aa.colaborador_unidade_id,
      cu.nome_completo AS colaborador_nome,
      cu.funcao AS colaborador_funcao,
      aa.inbox_visitante_id,
      iu.nome_completo AS inbox_visitante_nome,
      iu.parentesco_relacao AS inbox_parentesco_relacao,
      iu.status AS inbox_status,
      aa.prestador_servico_id,
      ps.nome_prestador AS prestador_nome,
      ps.categoria_servico AS prestador_categoria_servico,
      aa.origem_solicitacao,
      aa.tipo_acesso,
      aa.destino_tipo,
      aa.destino_descricao,
      aa.contato_destino,
      aa.nome_visitante,
      aa.documento,
      aa.empresa,
      aa.servico,
      aa.placa,
      aa.veiculo_descricao,
      aa.inicio_previsto,
      aa.fim_previsto,
      aa.status,
      aa.urgente,
      aa.destinado_para_funcionario_id,
      fd.usuario_id AS destinado_usuario_id,
      ud.nome_completo AS destinado_nome,
      aa.assumido_por_funcionario_id,
      fa.usuario_id AS assumido_usuario_id,
      ua.nome_completo AS assumido_nome,
      aa.assumido_em,
      aa.validado_por,
      aa.validado_em,
      ae_last.funcionario_sessao_id AS ultima_acao_sessao_id,
      ae_last.tipo_evento AS ultima_acao_tipo,
      ae_last.criado_em AS ultima_acao_em,
      ul.nome_completo AS ultima_acao_por_nome,
      aa.criado_em
    FROM acessos_autorizacoes aa
    INNER JOIN condominios c ON c.id = aa.condominio_id
    LEFT JOIN unidades u ON u.id = aa.unidade_id
    INNER JOIN usuarios us ON us.id = aa.solicitante_id
    LEFT JOIN colaboradores_unidade cu ON cu.id = aa.colaborador_unidade_id
    LEFT JOIN inbox_visitantes_unidade iu ON iu.id = aa.inbox_visitante_id
    LEFT JOIN prestadores_servico ps ON ps.id = aa.prestador_servico_id
    LEFT JOIN funcionarios fd ON fd.id = aa.destinado_para_funcionario_id
    LEFT JOIN usuarios ud ON ud.id = fd.usuario_id
    LEFT JOIN funcionarios fa ON fa.id = aa.assumido_por_funcionario_id
    LEFT JOIN usuarios ua ON ua.id = fa.usuario_id
    LEFT JOIN (
      SELECT ae1.autorizacao_id, ae1.funcionario_id, ae1.funcionario_sessao_id, ae1.tipo_evento, ae1.criado_em
      FROM acessos_eventos ae1
      INNER JOIN (
        SELECT autorizacao_id, MAX(criado_em) AS max_criado_em
        FROM acessos_eventos
        GROUP BY autorizacao_id
      ) ultimo ON ultimo.autorizacao_id = ae1.autorizacao_id AND ultimo.max_criado_em = ae1.criado_em
    ) ae_last ON ae_last.autorizacao_id = aa.id
    LEFT JOIN funcionarios fl ON fl.id = ae_last.funcionario_id
    LEFT JOIN usuarios ul ON ul.id = fl.usuario_id
    ${where}
    ORDER BY COALESCE(ae_last.criado_em, aa.atualizado_em, aa.criado_em, aa.inicio_previsto) DESC, aa.inicio_previsto DESC
    `,
    params,
  );

  return rows;
}

export async function listFilaPortariaService(usuario, filtros = {}) {
  let condominioId;
  let funcionarioId = null;

  if (usuario.perfil === "funcionario") {
    const contexto = await getContextoFuncionario(usuario.id);
    condominioId = contexto.condominio_id;
    funcionarioId = contexto.funcionario_id;
  } else if (usuario.perfil === "admin") {
    const error = new Error("Para a fase 1, a fila da portaria prioriza acesso pelo funcionario logado");
    error.status = 400;
    throw error;
  } else {
    const error = new Error("Perfil sem permissao para acessar a fila da portaria");
    error.status = 403;
    throw error;
  }

  const visao = normalizeText(filtros.visao) || "ativos";
  let whereVisao = `
      AND aa.status IN ('pendente','autorizado','em_andamento')
      AND DATE(aa.inicio_previsto) <= CURDATE() + INTERVAL 1 DAY
  `;
  let orderBy = "ORDER BY prioridade_urgencia ASC, prioridade_fila ASC, aa.inicio_previsto ASC, aa.criado_em ASC";

  if (visao === "finalizados") {
    whereVisao = `
      AND aa.status = 'finalizado'
      AND DATE(COALESCE(ae_last.criado_em, aa.atualizado_em, aa.criado_em)) = CURDATE()
    `;
    orderBy = "ORDER BY COALESCE(ae_last.criado_em, aa.atualizado_em, aa.criado_em) DESC";
  } else if (visao === "negados") {
    whereVisao = `
      AND aa.status = 'negado'
      AND DATE(COALESCE(ae_last.criado_em, aa.atualizado_em, aa.criado_em)) = CURDATE()
    `;
    orderBy = "ORDER BY COALESCE(ae_last.criado_em, aa.atualizado_em, aa.criado_em) DESC";
  } else if (visao === "todos_hoje") {
    whereVisao = `
      AND (
        (aa.status IN ('pendente','autorizado','em_andamento') AND DATE(aa.inicio_previsto) <= CURDATE() + INTERVAL 1 DAY)
        OR
        (aa.status IN ('finalizado','negado','cancelado') AND DATE(COALESCE(ae_last.criado_em, aa.atualizado_em, aa.criado_em)) = CURDATE())
      )
    `;
    orderBy = "ORDER BY prioridade_urgencia ASC, COALESCE(ae_last.criado_em, aa.atualizado_em, aa.criado_em) DESC";
  }

  const [rows] = await db.query(
    `
    SELECT
      aa.id,
      aa.tipo_acesso,
      aa.nome_visitante,
      aa.documento,
      aa.empresa,
      aa.servico,
      aa.placa,
      aa.inicio_previsto,
      aa.fim_previsto,
      aa.status,
      aa.urgente,
      aa.unidade_id,
      u.identificacao AS unidade_identificacao,
      aa.solicitante_id,
      us.nome_completo AS solicitante_nome,
      aa.origem_solicitacao,
      aa.prestador_servico_id,
      ps.nome_prestador AS prestador_nome,
      ps.categoria_servico AS prestador_categoria_servico,
      aa.destino_tipo,
      aa.destino_descricao,
      aa.contato_destino,
      aa.veiculo_descricao,
      aa.destinado_para_funcionario_id,
      fd.usuario_id AS destinado_usuario_id,
      ud.nome_completo AS destinado_nome,
      aa.assumido_por_funcionario_id,
      fa.usuario_id AS assumido_usuario_id,
      ua.nome_completo AS assumido_nome,
      aa.assumido_em,
      ae_last.funcionario_sessao_id AS ultima_acao_sessao_id,
      ae_last.tipo_evento AS ultima_acao_tipo,
      ae_last.criado_em AS ultima_acao_em,
      ul.nome_completo AS ultima_acao_por_nome,
      fs_last.iniciado_em AS ultima_acao_sessao_inicio,
      aa.atualizado_em,
      aa.criado_em,
      CASE
        WHEN aa.urgente = 1 THEN 0
        ELSE 1
      END AS prioridade_urgencia,
      CASE
        WHEN aa.assumido_por_funcionario_id = ? THEN 0
        WHEN aa.destinado_para_funcionario_id = ? THEN 1
        WHEN aa.destinado_para_funcionario_id IS NULL THEN 2
        ELSE 3
      END AS prioridade_fila
    FROM acessos_autorizacoes aa
    LEFT JOIN unidades u ON u.id = aa.unidade_id
    INNER JOIN usuarios us ON us.id = aa.solicitante_id
    LEFT JOIN prestadores_servico ps ON ps.id = aa.prestador_servico_id
    LEFT JOIN funcionarios fd ON fd.id = aa.destinado_para_funcionario_id
    LEFT JOIN usuarios ud ON ud.id = fd.usuario_id
    LEFT JOIN funcionarios fa ON fa.id = aa.assumido_por_funcionario_id
    LEFT JOIN usuarios ua ON ua.id = fa.usuario_id
    LEFT JOIN (
      SELECT ae1.autorizacao_id, ae1.funcionario_id, ae1.funcionario_sessao_id, ae1.tipo_evento, ae1.criado_em
      FROM acessos_eventos ae1
      INNER JOIN (
        SELECT autorizacao_id, MAX(criado_em) AS max_criado_em
        FROM acessos_eventos
        GROUP BY autorizacao_id
      ) ultimo ON ultimo.autorizacao_id = ae1.autorizacao_id AND ultimo.max_criado_em = ae1.criado_em
    ) ae_last ON ae_last.autorizacao_id = aa.id
    LEFT JOIN funcionarios fl ON fl.id = ae_last.funcionario_id
    LEFT JOIN usuarios ul ON ul.id = fl.usuario_id
    LEFT JOIN funcionarios_sessoes fs_last ON fs_last.id = ae_last.funcionario_sessao_id
    WHERE aa.condominio_id = ?
      ${whereVisao}
    ${orderBy}
    `,
    [funcionarioId, funcionarioId, condominioId],
  );

  const [[eventosHoje]] = await db.query(
    `
    SELECT
      SUM(CASE WHEN tipo_evento = 'entrada' THEN 1 ELSE 0 END) AS entradas_hoje,
      SUM(CASE WHEN tipo_evento = 'saida' THEN 1 ELSE 0 END) AS saidas_hoje
    FROM acessos_eventos
    WHERE condominio_id = ?
      AND DATE(criado_em) = CURDATE()
    `,
    [condominioId],
  );

  const [[abertosHoje]] = await db.query(
    `
    SELECT
      SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pendentes,
      SUM(CASE WHEN status = 'em_andamento' THEN 1 ELSE 0 END) AS em_andamento,
      SUM(CASE WHEN urgente = 1 AND status IN ('pendente','autorizado','em_andamento') THEN 1 ELSE 0 END) AS urgentes
    FROM acessos_autorizacoes
    WHERE condominio_id = ?
      AND DATE(inicio_previsto) <= CURDATE() + INTERVAL 1 DAY
    `,
    [condominioId],
  );

  return {
    fila: rows,
    resumo: {
      entradas_hoje: Number(eventosHoje?.entradas_hoje || 0),
      saidas_hoje: Number(eventosHoje?.saidas_hoje || 0),
      pendentes: Number(abertosHoje?.pendentes || 0),
      em_andamento: Number(abertosHoje?.em_andamento || 0),
      urgentes: Number(abertosHoje?.urgentes || 0),
    },
  };
}

export async function listSessoesPortariaService(usuario) {
  let condominioId;

  if (usuario.perfil === "funcionario") {
    const contexto = await getContextoFuncionario(usuario.id);
    condominioId = contexto.condominio_id;
  } else if (usuario.perfil === "admin") {
    const error = new Error("Para a fase 1, a visao de sessao da portaria prioriza acesso pelo funcionario logado");
    error.status = 400;
    throw error;
  } else {
    const error = new Error("Perfil sem permissao para consultar sessoes da portaria");
    error.status = 403;
    throw error;
  }

  const [ativas] = await db.query(
    `
    SELECT
      fs.id,
      fs.funcionario_id,
      fs.status,
      fs.origem,
      fs.iniciado_em,
      fs.ultimo_ping_em,
      fs.encerrado_em,
      f.area_atuacao,
      f.cargo,
      f.matricula,
      u.nome_completo AS funcionario_nome
    FROM funcionarios_sessoes fs
    INNER JOIN funcionarios f ON f.id = fs.funcionario_id
    INNER JOIN usuarios u ON u.id = f.usuario_id
    WHERE fs.condominio_id = ?
      AND f.area_atuacao = 'portaria'
      AND fs.status = 'ativa'
      AND fs.ultimo_ping_em >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    ORDER BY fs.iniciado_em ASC
    `,
    [condominioId],
  );

  const [recentes] = await db.query(
    `
    SELECT
      fs.id,
      fs.funcionario_id,
      fs.status,
      fs.origem,
      fs.iniciado_em,
      fs.ultimo_ping_em,
      fs.encerrado_em,
      f.area_atuacao,
      f.cargo,
      f.matricula,
      u.nome_completo AS funcionario_nome
    FROM funcionarios_sessoes fs
    INNER JOIN funcionarios f ON f.id = fs.funcionario_id
    INNER JOIN usuarios u ON u.id = f.usuario_id
    WHERE fs.condominio_id = ?
      AND f.area_atuacao = 'portaria'
      AND fs.status <> 'ativa'
      AND DATE(COALESCE(fs.encerrado_em, fs.ultimo_ping_em, fs.iniciado_em)) = CURDATE()
    ORDER BY COALESCE(fs.encerrado_em, fs.ultimo_ping_em, fs.iniciado_em) DESC
    LIMIT 6
    `,
    [condominioId],
  );

  return {
    ativas,
    recentes,
  };
}

export async function listHistoricoAcessoService(usuario, autorizacaoId) {
  const id = normalizeText(autorizacaoId);
  if (!id) {
    const error = new Error("Autorizacao invalida");
    error.status = 400;
    throw error;
  }

  const params = [id];
  let whereEscopo = "WHERE aa.id = ?";

  if (usuario.perfil === "morador") {
    const contexto = await getContextoMorador(usuario.id);
    whereEscopo += " AND aa.condominio_id = ? AND aa.unidade_id = ? AND aa.solicitante_id = ?";
    params.push(contexto.condominio_id, contexto.unidade_id, usuario.id);
  } else if (usuario.perfil === "funcionario") {
    const contexto = await getContextoFuncionario(usuario.id);
    whereEscopo += " AND aa.condominio_id = ?";
    params.push(contexto.condominio_id);
  } else if (usuario.perfil === "admin") {
    whereEscopo += " AND c.admin_id = ?";
    params.push(usuario.id);
  } else {
    const error = new Error("Perfil sem permissao para consultar historico");
    error.status = 403;
    throw error;
  }

  const [autorizacoes] = await db.query(
    `
    SELECT
      aa.id,
      aa.condominio_id,
      c.nome_fantasia AS condominio_nome,
      aa.unidade_id,
      u.identificacao AS unidade_identificacao,
      aa.solicitante_id,
      us.nome_completo AS solicitante_nome,
      aa.origem_solicitacao,
      aa.prestador_servico_id,
      ps.nome_prestador AS prestador_nome,
      ps.categoria_servico AS prestador_categoria_servico,
      aa.tipo_acesso,
      aa.destino_tipo,
      aa.destino_descricao,
      aa.contato_destino,
      aa.nome_visitante,
      aa.documento,
      aa.empresa,
      aa.servico,
      aa.placa,
      aa.veiculo_descricao,
      aa.status,
      aa.urgente,
      aa.inicio_previsto,
      aa.fim_previsto,
      aa.criado_em,
      aa.atualizado_em,
      ud.nome_completo AS destinado_nome,
      ua.nome_completo AS assumido_nome
    FROM acessos_autorizacoes aa
    INNER JOIN condominios c ON c.id = aa.condominio_id
    LEFT JOIN unidades u ON u.id = aa.unidade_id
    INNER JOIN usuarios us ON us.id = aa.solicitante_id
    LEFT JOIN prestadores_servico ps ON ps.id = aa.prestador_servico_id
    LEFT JOIN funcionarios fd ON fd.id = aa.destinado_para_funcionario_id
    LEFT JOIN usuarios ud ON ud.id = fd.usuario_id
    LEFT JOIN funcionarios fa ON fa.id = aa.assumido_por_funcionario_id
    LEFT JOIN usuarios ua ON ua.id = fa.usuario_id
    ${whereEscopo}
    LIMIT 1
    `,
    params,
  );

  if (!autorizacoes.length) {
    const error = new Error("Autorizacao nao encontrada no contexto informado");
    error.status = 404;
    throw error;
  }

  const autorizacao = autorizacoes[0];

  const [eventos] = await db.query(
    `
    SELECT
      ae.id,
      ae.tipo_evento,
      ae.origem,
      ae.observacao,
      ae.criado_em,
      u.nome_completo AS funcionario_nome,
      fs.iniciado_em AS sessao_iniciada_em
    FROM acessos_eventos ae
    LEFT JOIN funcionarios f ON f.id = ae.funcionario_id
    LEFT JOIN usuarios u ON u.id = f.usuario_id
    LEFT JOIN funcionarios_sessoes fs ON fs.id = ae.funcionario_sessao_id
    WHERE ae.autorizacao_id = ?
    ORDER BY ae.criado_em ASC
    `,
    [id],
  );

  return {
    autorizacao,
    eventos,
  };
}

export async function createAcessoEventoService(usuario, data) {
  if (usuario.perfil !== "funcionario") {
    const error = new Error("Somente funcionario pode registrar evento operacional");
    error.status = 403;
    throw error;
  }

  const autorizacaoId = normalizeText(data.autorizacao_id);
  const tipoEvento = normalizeText(data.tipo_evento);
  const origem = normalizeText(data.origem || "manual");
  const observacao = normalizeText(data.observacao);

  if (!autorizacaoId || !TIPOS_EVENTO.has(tipoEvento) || !ORIGENS_EVENTO.has(origem)) {
    const error = new Error("Dados do evento operacional invalidos");
    error.status = 400;
    throw error;
  }

  const contexto = await getContextoFuncionario(usuario.id);
  const [rows] = await db.query(
    `
    SELECT id, condominio_id, status
    FROM acessos_autorizacoes
    WHERE id = ? AND condominio_id = ?
    LIMIT 1
    `,
    [autorizacaoId, contexto.condominio_id],
  );

  if (!rows.length) {
    const error = new Error("Autorizacao nao encontrada no contexto da portaria");
    error.status = 404;
    throw error;
  }

  const autorizacao = rows[0];

  if (tipoEvento === "entrada" && autorizacao.status === "em_andamento") {
    const error = new Error("Entrada ja registrada para esta solicitacao");
    error.status = 409;
    throw error;
  }

  if (tipoEvento === "entrada" && ["finalizado", "negado", "cancelado"].includes(autorizacao.status)) {
    const error = new Error("Nao e possivel registrar entrada para uma solicitacao encerrada");
    error.status = 409;
    throw error;
  }

  if (tipoEvento === "saida" && autorizacao.status !== "em_andamento") {
    const error = new Error("A saida so pode ser registrada apos uma entrada valida");
    error.status = 409;
    throw error;
  }

  if (tipoEvento === "negado" && autorizacao.status === "em_andamento") {
    const error = new Error("Nao e possivel negar uma solicitacao que ja teve entrada registrada");
    error.status = 409;
    throw error;
  }

  const eventoId = uuidv4();
  const novoStatus = descreverStatusParaEvento(tipoEvento);

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
      INSERT INTO acessos_eventos
        (id, condominio_id, autorizacao_id, funcionario_id, funcionario_sessao_id, tipo_evento, origem, observacao)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [eventoId, contexto.condominio_id, autorizacaoId, contexto.funcionario_id, usuario.sessao_funcionario_id || null, tipoEvento, origem, observacao || null],
    );

    await connection.query(
      `
      UPDATE acessos_autorizacoes
      SET assumido_por_funcionario_id = COALESCE(assumido_por_funcionario_id, ?),
          assumido_em = COALESCE(assumido_em, NOW()),
          status = COALESCE(?, status),
          validado_por = CASE WHEN ? IN ('entrada','negado') THEN ? ELSE validado_por END,
          validado_em = CASE WHEN ? IN ('entrada','negado') THEN NOW() ELSE validado_em END
      WHERE id = ?
      `,
      [contexto.funcionario_id, novoStatus, tipoEvento, usuario.id, tipoEvento, autorizacaoId],
    );

    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }

  return {
    evento: {
      id: eventoId,
      autorizacao_id: autorizacaoId,
      tipo_evento: tipoEvento,
      origem,
      observacao: observacao || null,
    },
  };
}





