import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

const CATEGORIAS_SERVICO = new Set([
  "energia_eletrica",
  "agua_hidraulica",
  "construcao_civil",
  "internet_tv_rede",
  "saude",
  "personal",
  "setor_comercial",
  "automotivo",
  "limpeza",
  "manutencao_geral",
  "entrega_tecnica",
  "outro",
]);

const STATUS_PRESTADOR = new Set(["ativo", "inativo", "bloqueado"]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
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

async function getMoradorContexto(usuarioId) {
  const [rows] = await db.query(
    `
    SELECT
      uu.unidade_id,
      u.condominio_id,
      c.nome_fantasia AS condominio_nome,
      u.identificacao AS unidade_identificacao
    FROM unidade_usuarios uu
    INNER JOIN unidades u ON u.id = uu.unidade_id
    INNER JOIN condominios c ON c.id = u.condominio_id
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

async function getFuncionarioContexto(usuarioId) {
  const [rows] = await db.query(
    `
    SELECT
      f.id AS funcionario_id,
      f.condominio_id,
      f.area_atuacao,
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

async function validarCondominioAdmin(adminUsuarioId, condominioId) {
  const [rows] = await db.query(
    `
    SELECT id, nome_fantasia
    FROM condominios
    WHERE id = ? AND admin_id = ?
    LIMIT 1
    `,
    [condominioId, adminUsuarioId],
  );

  if (!rows.length) {
    const error = new Error("Condominio invalido ou fora do escopo do admin");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

async function getScopedPrestador(usuario, prestadorId) {
  let rows = [];

  if (usuario.perfil === "admin") {
    [rows] = await db.query(
      `
      SELECT ps.*
      FROM prestadores_servico ps
      INNER JOIN condominios c ON c.id = ps.condominio_id
      WHERE ps.id = ? AND c.admin_id = ?
      LIMIT 1
      `,
      [prestadorId, usuario.id],
    );
  } else if (usuario.perfil === "funcionario") {
    const contexto = await getFuncionarioContexto(usuario.id);
    [rows] = await db.query(
      `
      SELECT ps.*
      FROM prestadores_servico ps
      WHERE ps.id = ? AND ps.condominio_id = ?
      LIMIT 1
      `,
      [prestadorId, contexto.condominio_id],
    );
  } else {
    const error = new Error("Perfil sem permissao para acessar prestadores");
    error.status = 403;
    throw error;
  }

  if (!rows.length) {
    const error = new Error("Prestador nao encontrado no escopo informado");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

function parsePrestadorPayload(data) {
  const nomePrestador = normalizeText(data.nome_prestador);
  const documento = normalizeText(data.documento);
  const empresa = normalizeText(data.empresa);
  const telefone = normalizeText(data.telefone);
  const telefoneSecundario = normalizeText(data.telefone_secundario);
  const whatsapp = normalizeText(data.whatsapp);
  const email = normalizeText(data.email);
  const placa = normalizeText(data.placa)?.toUpperCase() || null;
  const veiculoDescricao = normalizeText(data.veiculo_descricao);
  const responsavelNome = normalizeText(data.responsavel_nome);
  const categoriaServico = normalizeText(data.categoria_servico);
  const observacoes = normalizeText(data.observacoes);
  const contatoUtilitario = normalizeBoolean(data.contato_utilitario);
  const atende24h = normalizeBoolean(data.atende_24h);

  if (!nomePrestador || !categoriaServico) {
    const error = new Error("Nome do prestador e categoria do servico sao obrigatorios");
    error.status = 400;
    throw error;
  }

  if (!CATEGORIAS_SERVICO.has(categoriaServico)) {
    const error = new Error("Categoria de servico invalida");
    error.status = 400;
    throw error;
  }

  return {
    nomePrestador,
    documento,
    empresa,
    telefone,
    telefoneSecundario,
    whatsapp,
    email,
    placa,
    veiculoDescricao,
    responsavelNome,
    categoriaServico,
    observacoes,
    contatoUtilitario,
    atende24h,
  };
}

export async function listPrestadoresServicoService(usuario, filtros = {}) {
  const params = [];
  let where = " WHERE 1 = 1";

  if (usuario.perfil === "admin") {
    where += " AND c.admin_id = ?";
    params.push(usuario.id);

    if (filtros.condominio_id) {
      where += " AND ps.condominio_id = ?";
      params.push(filtros.condominio_id);
    }
  } else if (usuario.perfil === "funcionario") {
    const contexto = await getFuncionarioContexto(usuario.id);
    where += " AND ps.condominio_id = ?";
    params.push(contexto.condominio_id);
  } else {
    const error = new Error("Perfil sem permissao para listar prestadores");
    error.status = 403;
    throw error;
  }

  if (filtros.categoria_servico && CATEGORIAS_SERVICO.has(filtros.categoria_servico)) {
    where += " AND ps.categoria_servico = ?";
    params.push(filtros.categoria_servico);
  }

  if (filtros.status && STATUS_PRESTADOR.has(filtros.status)) {
    where += " AND ps.status = ?";
    params.push(filtros.status);
  }

  if (filtros.contato_utilitario !== undefined && filtros.contato_utilitario !== "") {
    where += " AND ps.contato_utilitario = ?";
    params.push(normalizeBoolean(filtros.contato_utilitario) ? 1 : 0);
  }

  const busca = normalizeText(filtros.busca);
  if (busca) {
    where += `
      AND (
        ps.nome_prestador LIKE ?
        OR ps.empresa LIKE ?
        OR ps.documento LIKE ?
        OR ps.placa LIKE ?
        OR ps.responsavel_nome LIKE ?
        OR ps.telefone LIKE ?
        OR ps.whatsapp LIKE ?
      )
    `;
    const like = `%${busca}%`;
    params.push(like, like, like, like, like, like, like);
  }

  const [rows] = await db.query(
    `
    SELECT
      ps.id,
      ps.condominio_id,
      ps.nome_prestador,
      ps.documento,
      ps.empresa,
      ps.telefone,
      ps.telefone_secundario,
      ps.whatsapp,
      ps.email,
      ps.placa,
      ps.veiculo_descricao,
      ps.responsavel_nome,
      ps.categoria_servico,
      ps.observacoes,
      ps.contato_utilitario,
      ps.atende_24h,
      ps.status,
      ps.ultimo_acesso_em,
      ps.cadastrado_por_usuario_id,
      ps.criado_em,
      ps.atualizado_em,
      c.nome_fantasia AS condominio_nome,
      u.nome_completo AS cadastrado_por_nome,
      COALESCE(stats.total_acessos, 0) AS total_acessos,
      COALESCE(ps.ultimo_acesso_em, stats.ultimo_acesso_evento) AS ultimo_acesso_referencia
    FROM prestadores_servico ps
    INNER JOIN condominios c ON c.id = ps.condominio_id
    INNER JOIN usuarios u ON u.id = ps.cadastrado_por_usuario_id
    LEFT JOIN (
      SELECT
        prestador_servico_id,
        COUNT(*) AS total_acessos,
        MAX(inicio_previsto) AS ultimo_acesso_evento
      FROM acessos_autorizacoes
      WHERE prestador_servico_id IS NOT NULL
      GROUP BY prestador_servico_id
    ) stats ON stats.prestador_servico_id = ps.id
    ${where}
    ORDER BY ps.contato_utilitario DESC, ps.nome_prestador ASC
    `,
    params,
  );

  return rows;
}

export async function listContatosPrestadoresService(usuario, filtros = {}) {
  let condominioId;

  if (usuario.perfil === "morador") {
    const contexto = await getMoradorContexto(usuario.id);
    condominioId = contexto.condominio_id;
  } else if (usuario.perfil === "admin") {
    condominioId = normalizeText(filtros.condominio_id);
    if (condominioId) {
      await validarCondominioAdmin(usuario.id, condominioId);
    }
  } else {
    const error = new Error("Perfil sem permissao para listar contatos utilitarios");
    error.status = 403;
    throw error;
  }

  const params = [];
  let where = " WHERE ps.status = 'ativo' AND ps.contato_utilitario = 1";

  if (usuario.perfil === "morador") {
    where += " AND ps.condominio_id = ?";
    params.push(condominioId);
  } else if (condominioId) {
    where += " AND ps.condominio_id = ?";
    params.push(condominioId);
  } else {
    where += " AND c.admin_id = ?";
    params.push(usuario.id);
  }

  if (filtros.categoria_servico && CATEGORIAS_SERVICO.has(filtros.categoria_servico)) {
    where += " AND ps.categoria_servico = ?";
    params.push(filtros.categoria_servico);
  }

  if (filtros.atende_24h !== undefined && filtros.atende_24h !== "") {
    where += " AND ps.atende_24h = ?";
    params.push(normalizeBoolean(filtros.atende_24h) ? 1 : 0);
  }

  const busca = normalizeText(filtros.busca);
  if (busca) {
    where += " AND (ps.nome_prestador LIKE ? OR ps.empresa LIKE ? OR ps.telefone LIKE ? OR ps.whatsapp LIKE ?)";
    const like = `%${busca}%`;
    params.push(like, like, like, like);
  }

  const [rows] = await db.query(
    `
    SELECT
      ps.id,
      ps.condominio_id,
      ps.nome_prestador,
      ps.empresa,
      ps.telefone,
      ps.telefone_secundario,
      ps.whatsapp,
      ps.email,
      ps.categoria_servico,
      ps.atende_24h,
      ps.observacoes,
      ps.responsavel_nome,
      c.nome_fantasia AS condominio_nome
    FROM prestadores_servico ps
    INNER JOIN condominios c ON c.id = ps.condominio_id
    ${where}
    ORDER BY ps.atende_24h DESC, ps.nome_prestador ASC
    `,
    params,
  );

  return rows;
}

export async function listPrestadoresServicoSugestoesService(usuario, filtros = {}) {
  let condominioId = normalizeText(filtros.condominio_id);

  if (usuario.perfil === "admin") {
    if (condominioId) {
      await validarCondominioAdmin(usuario.id, condominioId);
    } else {
      const error = new Error("Condominio e obrigatorio para sugerir prestadores no contexto do admin");
      error.status = 400;
      throw error;
    }
  } else if (usuario.perfil === "funcionario") {
    const contexto = await getFuncionarioContexto(usuario.id);
    condominioId = contexto.condominio_id;
  } else if (usuario.perfil === "morador") {
    const contexto = await getMoradorContexto(usuario.id);
    condominioId = contexto.condominio_id;
  } else {
    const error = new Error("Perfil sem permissao para sugerir prestadores");
    error.status = 403;
    throw error;
  }

  const termo = normalizeText(filtros.termo || filtros.busca);
  const categoriaServico = normalizeText(filtros.categoria_servico);
  const params = [condominioId];
  let where = " WHERE ps.condominio_id = ? AND ps.status = 'ativo'";

  if (categoriaServico && CATEGORIAS_SERVICO.has(categoriaServico)) {
    where += " AND ps.categoria_servico = ?";
    params.push(categoriaServico);
  }

  if (termo) {
    where += `
      AND (
        ps.nome_prestador LIKE ?
        OR ps.empresa LIKE ?
        OR ps.documento LIKE ?
        OR ps.placa LIKE ?
        OR ps.responsavel_nome LIKE ?
      )
    `;
    const like = `%${termo}%`;
    params.push(like, like, like, like, like);
  }

  const [rows] = await db.query(
    `
    SELECT
      ps.id,
      ps.nome_prestador,
      ps.documento,
      ps.empresa,
      ps.telefone,
      ps.whatsapp,
      ps.placa,
      ps.veiculo_descricao,
      ps.responsavel_nome,
      ps.categoria_servico,
      ps.observacoes,
      ps.contato_utilitario,
      ps.atende_24h,
      COALESCE(ps.ultimo_acesso_em, stats.ultimo_acesso_evento) AS ultimo_acesso_referencia
    FROM prestadores_servico ps
    LEFT JOIN (
      SELECT
        prestador_servico_id,
        MAX(inicio_previsto) AS ultimo_acesso_evento
      FROM acessos_autorizacoes
      WHERE prestador_servico_id IS NOT NULL
      GROUP BY prestador_servico_id
    ) stats ON stats.prestador_servico_id = ps.id
    ${where}
    ORDER BY COALESCE(ps.ultimo_acesso_em, stats.ultimo_acesso_evento) DESC, ps.nome_prestador ASC
    LIMIT 12
    `,
    params,
  );

  return rows;
}

export async function createPrestadorServicoService(usuario, data) {
  let condominioId = normalizeText(data.condominio_id);

  if (usuario.perfil === "admin") {
    if (!condominioId) {
      const error = new Error("Condominio e obrigatorio");
      error.status = 400;
      throw error;
    }
    await validarCondominioAdmin(usuario.id, condominioId);
  } else if (usuario.perfil === "funcionario") {
    const contexto = await getFuncionarioContexto(usuario.id);
    if (contexto.area_atuacao !== "portaria") {
      const error = new Error("Somente a portaria pode fazer cadastro rapido de prestador");
      error.status = 403;
      throw error;
    }
    condominioId = contexto.condominio_id;
  } else {
    const error = new Error("Perfil sem permissao para cadastrar prestadores");
    error.status = 403;
    throw error;
  }

  const payload = parsePrestadorPayload(data);
  const id = uuidv4();

  await db.query(
    `
    INSERT INTO prestadores_servico
      (id, condominio_id, nome_prestador, documento, empresa, telefone, telefone_secundario, whatsapp, email, placa, veiculo_descricao, responsavel_nome, categoria_servico, observacoes, contato_utilitario, atende_24h, status, cadastrado_por_usuario_id)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?)
    `,
    [
      id,
      condominioId,
      payload.nomePrestador,
      payload.documento || null,
      payload.empresa || null,
      payload.telefone || null,
      payload.telefoneSecundario || null,
      payload.whatsapp || null,
      payload.email || null,
      payload.placa || null,
      payload.veiculoDescricao || null,
      payload.responsavelNome || null,
      payload.categoriaServico,
      payload.observacoes || null,
      payload.contatoUtilitario ? 1 : 0,
      payload.atende24h ? 1 : 0,
      usuario.id,
    ],
  );

  return {
    prestador: {
      id,
      condominio_id: condominioId,
      nome_prestador: payload.nomePrestador,
      documento: payload.documento || null,
      empresa: payload.empresa || null,
      telefone: payload.telefone || null,
      telefone_secundario: payload.telefoneSecundario || null,
      whatsapp: payload.whatsapp || null,
      email: payload.email || null,
      placa: payload.placa || null,
      veiculo_descricao: payload.veiculoDescricao || null,
      responsavel_nome: payload.responsavelNome || null,
      categoria_servico: payload.categoriaServico,
      observacoes: payload.observacoes || null,
      contato_utilitario: payload.contatoUtilitario,
      atende_24h: payload.atende24h,
      status: "ativo",
    },
  };
}

export async function updatePrestadorServicoService(usuario, prestadorId, data) {
  const prestador = await getScopedPrestador(usuario, prestadorId);
  const payload = parsePrestadorPayload(data);

  await db.query(
    `
    UPDATE prestadores_servico
    SET nome_prestador = ?,
        documento = ?,
        empresa = ?,
        telefone = ?,
        telefone_secundario = ?,
        whatsapp = ?,
        email = ?,
        placa = ?,
        veiculo_descricao = ?,
        responsavel_nome = ?,
        categoria_servico = ?,
        observacoes = ?,
        contato_utilitario = ?,
        atende_24h = ?
    WHERE id = ?
    `,
    [
      payload.nomePrestador,
      payload.documento || null,
      payload.empresa || null,
      payload.telefone || null,
      payload.telefoneSecundario || null,
      payload.whatsapp || null,
      payload.email || null,
      payload.placa || null,
      payload.veiculoDescricao || null,
      payload.responsavelNome || null,
      payload.categoriaServico,
      payload.observacoes || null,
      payload.contatoUtilitario ? 1 : 0,
      payload.atende24h ? 1 : 0,
      prestador.id,
    ],
  );

  return {
    prestador: {
      id: prestador.id,
      condominio_id: prestador.condominio_id,
      nome_prestador: payload.nomePrestador,
      documento: payload.documento || null,
      empresa: payload.empresa || null,
      telefone: payload.telefone || null,
      telefone_secundario: payload.telefoneSecundario || null,
      whatsapp: payload.whatsapp || null,
      email: payload.email || null,
      placa: payload.placa || null,
      veiculo_descricao: payload.veiculoDescricao || null,
      responsavel_nome: payload.responsavelNome || null,
      categoria_servico: payload.categoriaServico,
      observacoes: payload.observacoes || null,
      contato_utilitario: payload.contatoUtilitario,
      atende_24h: payload.atende24h,
      status: prestador.status,
    },
  };
}

export async function updatePrestadorServicoStatusService(usuario, prestadorId, data) {
  const prestador = await getScopedPrestador(usuario, prestadorId);
  const status = normalizeText(data.status);

  if (!STATUS_PRESTADOR.has(status)) {
    const error = new Error("Status de prestador invalido");
    error.status = 400;
    throw error;
  }

  await db.query(
    `
    UPDATE prestadores_servico
    SET status = ?
    WHERE id = ?
    `,
    [status, prestador.id],
  );

  return {
    prestador: {
      id: prestador.id,
      status,
    },
  };
}

export async function getPrestadorServicoHistoricoService(usuario, prestadorId) {
  const prestador = await getScopedPrestador(usuario, prestadorId);

  const [eventos] = await db.query(
    `
    SELECT
      aa.id AS autorizacao_id,
      aa.nome_visitante,
      aa.tipo_acesso,
      aa.servico,
      aa.empresa,
      aa.placa,
      aa.destino_tipo,
      aa.destino_descricao,
      aa.status,
      aa.inicio_previsto,
      aa.criado_em,
      us.nome_completo AS solicitante_nome,
      u.identificacao AS unidade_identificacao,
      ae.tipo_evento AS ultimo_evento_tipo,
      ae.criado_em AS ultimo_evento_em,
      uf.nome_completo AS ultimo_evento_por_nome
    FROM acessos_autorizacoes aa
    LEFT JOIN usuarios us ON us.id = aa.solicitante_id
    LEFT JOIN unidades u ON u.id = aa.unidade_id
    LEFT JOIN (
      SELECT ae1.autorizacao_id, ae1.funcionario_id, ae1.tipo_evento, ae1.criado_em
      FROM acessos_eventos ae1
      INNER JOIN (
        SELECT autorizacao_id, MAX(criado_em) AS max_criado_em
        FROM acessos_eventos
        GROUP BY autorizacao_id
      ) ultimo ON ultimo.autorizacao_id = ae1.autorizacao_id AND ultimo.max_criado_em = ae1.criado_em
    ) ae ON ae.autorizacao_id = aa.id
    LEFT JOIN funcionarios ff ON ff.id = ae.funcionario_id
    LEFT JOIN usuarios uf ON uf.id = ff.usuario_id
    WHERE aa.prestador_servico_id = ?
    ORDER BY COALESCE(ae.criado_em, aa.inicio_previsto, aa.criado_em) DESC
    LIMIT 60
    `,
    [prestador.id],
  );

  const [[resumo]] = await db.query(
    `
    SELECT
      COUNT(*) AS total_acessos,
      SUM(CASE WHEN status = 'finalizado' THEN 1 ELSE 0 END) AS finalizados,
      SUM(CASE WHEN status = 'negado' THEN 1 ELSE 0 END) AS negados,
      SUM(CASE WHEN status IN ('pendente','autorizado','em_andamento') THEN 1 ELSE 0 END) AS abertos,
      MAX(inicio_previsto) AS ultimo_inicio_previsto
    FROM acessos_autorizacoes
    WHERE prestador_servico_id = ?
    `,
    [prestador.id],
  );

  return {
    prestador: {
      ...prestador,
      resumo: {
        total_acessos: Number(resumo?.total_acessos || 0),
        finalizados: Number(resumo?.finalizados || 0),
        negados: Number(resumo?.negados || 0),
        abertos: Number(resumo?.abertos || 0),
        ultimo_inicio_previsto: resumo?.ultimo_inicio_previsto || null,
      },
    },
    historico: eventos,
  };
}
