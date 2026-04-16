import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const TIPOS_ORIGEM = new Set(["preventiva", "corretiva", "reforma", "derivada_ocorrencia", "avulsa"]);
const ALVOS_TIPO = new Set(["area_comum", "torre", "unidade", "estrutura_geral"]);
const PRIORIDADES = new Set(["baixa", "media", "alta", "critica"]);
const STATUS = new Set(["aberta", "planejada", "em_execucao", "aguardando_terceiro", "concluida", "cancelada"]);
const TIPOS_EVENTO = new Set([
  "abertura",
  "planejamento",
  "atribuicao",
  "inicio_execucao",
  "observacao",
  "pausa",
  "encaminhamento_terceiro",
  "reagendamento",
  "conclusao",
  "cancelamento",
  "reclassificacao",
]);
const MIME_EXTENSOES_ANEXO = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const TAMANHO_MAX_ANEXO_BYTES = 5 * 1024 * 1024;
const QUANTIDADE_MAX_ANEXOS = 3;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "../../../frontend");
const MANUTENCOES_UPLOAD_DIR = path.join(FRONTEND_ROOT, "uploads", "manutencoes");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
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

function parseAnexosPayload(rawAnexos) {
  if (!rawAnexos) return [];

  const anexos = Array.isArray(rawAnexos) ? rawAnexos : [rawAnexos];
  if (anexos.length > QUANTIDADE_MAX_ANEXOS) {
    const error = new Error(`Limite de ${QUANTIDADE_MAX_ANEXOS} fotos por ordem de servico`);
    error.status = 400;
    throw error;
  }

  return anexos.filter(Boolean).map((anexo, index) => {
    const nomeOriginal = normalizeText(anexo.nome_original || anexo.nome || `foto-${index + 1}`);
    const dataUrl = normalizeText(anexo.data_url || anexo.conteudo || anexo.base64);
    const match = dataUrl?.match(/^data:([^;]+);base64,(.+)$/);

    if (!match) {
      const error = new Error("Formato invalido de imagem");
      error.status = 400;
      throw error;
    }

    const mimeType = match[1];
    const base64 = match[2];
    const extensao = MIME_EXTENSOES_ANEXO[mimeType];
    if (!extensao) {
      const error = new Error("Somente imagens JPG, PNG ou WEBP sao aceitas");
      error.status = 400;
      throw error;
    }

    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length > TAMANHO_MAX_ANEXO_BYTES) {
      const error = new Error("Cada foto deve ter no maximo 5 MB");
      error.status = 400;
      throw error;
    }

    return { nomeOriginal, mimeType, extensao, buffer };
  });
}

async function persistirAnexos(connection, { ordemServicoId, condominioId, usuarioId, anexos }) {
  if (!anexos.length) return [];

  await fs.mkdir(MANUTENCOES_UPLOAD_DIR, { recursive: true });
  const registros = [];

  for (const anexo of anexos) {
    const id = uuidv4();
    const nomeArquivo = `${ordemServicoId}-${id}${anexo.extensao}`;
    const caminhoFisico = path.join(MANUTENCOES_UPLOAD_DIR, nomeArquivo);
    const caminhoRelativo = `/uploads/manutencoes/${nomeArquivo}`;

    await fs.writeFile(caminhoFisico, anexo.buffer);
    await connection.query(
      `
      INSERT INTO manutencoes_anexos
        (id, ordem_servico_id, condominio_id, usuario_id, nome_original, nome_arquivo, mime_type, caminho_relativo, tamanho_bytes)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [id, ordemServicoId, condominioId, usuarioId, anexo.nomeOriginal, nomeArquivo, anexo.mimeType, caminhoRelativo, anexo.buffer.length],
    );

    registros.push({
      id,
      nome_original: anexo.nomeOriginal,
      caminho_relativo: caminhoRelativo,
      mime_type: anexo.mimeType,
      tamanho_bytes: anexo.buffer.length,
    });
  }

  return registros;
}

async function getFuncionarioContexto(usuarioId) {
  const [rows] = await db.query(
    `
    SELECT f.id AS funcionario_id, f.condominio_id, f.area_atuacao, f.status, u.nome_completo AS funcionario_nome
    FROM funcionarios f
    INNER JOIN usuarios u ON u.id = f.usuario_id
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
    `SELECT id, nome_fantasia FROM condominios WHERE id = ? AND admin_id = ? LIMIT 1`,
    [condominioId, adminUsuarioId],
  );
  if (!rows.length) {
    const error = new Error("Condominio invalido ou fora do escopo do admin");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function validarOcorrenciaCondominio(condominioId, ocorrenciaId) {
  if (!ocorrenciaId) return null;
  const [rows] = await db.query(`SELECT id, titulo FROM ocorrencias WHERE id = ? AND condominio_id = ? LIMIT 1`, [ocorrenciaId, condominioId]);
  if (!rows.length) {
    const error = new Error("Ocorrencia invalida para este condominio");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function validarAreaCondominio(condominioId, areaId) {
  if (!areaId) return null;
  const [rows] = await db.query(`SELECT id, nome FROM areas_comuns WHERE id = ? AND condominio_id = ? LIMIT 1`, [areaId, condominioId]);
  if (!rows.length) {
    const error = new Error("Area comum invalida para este condominio");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function validarTorreCondominio(condominioId, torreId) {
  if (!torreId) return null;
  const [rows] = await db.query(`SELECT id, nome FROM torres WHERE id = ? AND condominio_id = ? LIMIT 1`, [torreId, condominioId]);
  if (!rows.length) {
    const error = new Error("Torre invalida para este condominio");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function validarUnidadeCondominio(condominioId, unidadeId) {
  if (!unidadeId) return null;
  const [rows] = await db.query(`SELECT id, identificacao FROM unidades WHERE id = ? AND condominio_id = ? LIMIT 1`, [unidadeId, condominioId]);
  if (!rows.length) {
    const error = new Error("Unidade invalida para este condominio");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function validarPrestadorCondominio(condominioId, prestadorId) {
  if (!prestadorId) return null;
  const [rows] = await db.query(
    `SELECT id, nome_prestador, status FROM prestadores_servico WHERE id = ? AND condominio_id = ? LIMIT 1`,
    [prestadorId, condominioId],
  );
  if (!rows.length) {
    const error = new Error("Prestador invalido para este condominio");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

async function validarFuncionarioCondominio(condominioId, funcionarioId) {
  if (!funcionarioId) return null;
  const [rows] = await db.query(
    `
    SELECT f.id, u.nome_completo AS funcionario_nome
    FROM funcionarios f
    INNER JOIN usuarios u ON u.id = f.usuario_id
    WHERE f.id = ? AND f.condominio_id = ?
    LIMIT 1
    `,
    [funcionarioId, condominioId],
  );
  if (!rows.length) {
    const error = new Error("Funcionario invalido para este condominio");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

function parsePayload(data) {
  const payload = {
    tipoOrigem: normalizeText(data.tipo_origem || "corretiva"),
    alvoTipo: normalizeText(data.alvo_tipo || "estrutura_geral"),
    titulo: normalizeText(data.titulo),
    descricaoTecnica: normalizeText(data.descricao_tecnica || data.descricao),
    localReferencia: normalizeText(data.local_referencia),
    prioridade: normalizeText(data.prioridade || "media"),
    status: normalizeText(data.status || "aberta"),
    prazoFinalEm: normalizeDateTime(data.prazo_final_em),
    dataPrevista: normalizeDateTime(data.data_prevista),
    custoPrevisto: data.custo_previsto === "" || data.custo_previsto == null ? null : Number(data.custo_previsto),
    custoRealizado: data.custo_realizado === "" || data.custo_realizado == null ? null : Number(data.custo_realizado),
    bloqueiaArea: normalizeBoolean(data.bloqueia_area),
    observacoesInternas: normalizeText(data.observacoes_internas),
  };

  if (!TIPOS_ORIGEM.has(payload.tipoOrigem)) {
    const error = new Error("Tipo de origem invalido");
    error.status = 400;
    throw error;
  }
  if (!ALVOS_TIPO.has(payload.alvoTipo)) {
    const error = new Error("Alvo tecnico invalido");
    error.status = 400;
    throw error;
  }
  if (!payload.titulo || !payload.descricaoTecnica) {
    const error = new Error("Titulo e descricao tecnica sao obrigatorios");
    error.status = 400;
    throw error;
  }
  if (!PRIORIDADES.has(payload.prioridade)) {
    const error = new Error("Prioridade invalida");
    error.status = 400;
    throw error;
  }
  if (!STATUS.has(payload.status)) {
    const error = new Error("Status invalido");
    error.status = 400;
    throw error;
  }
  return payload;
}

function mapStatusToEventType(status) {
  if (status === "planejada") return "planejamento";
  if (status === "em_execucao") return "inicio_execucao";
  if (status === "aguardando_terceiro") return "encaminhamento_terceiro";
  if (status === "concluida") return "conclusao";
  if (status === "cancelada") return "cancelamento";
  return "observacao";
}

async function insertEvento(connection, { ordemServicoId, condominioId, usuarioId, funcionarioId = null, tipoEvento, statusResultante = null, descricaoEvento = null, custoInformado = null }) {
  if (!TIPOS_EVENTO.has(tipoEvento)) {
    const error = new Error("Tipo de evento invalido");
    error.status = 400;
    throw error;
  }
  await connection.query(
    `
    INSERT INTO manutencoes_eventos
      (id, ordem_servico_id, condominio_id, usuario_id, funcionario_id, tipo_evento, status_resultante, descricao_evento, custo_informado)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [uuidv4(), ordemServicoId, condominioId, usuarioId, funcionarioId, tipoEvento, statusResultante, descricaoEvento, custoInformado],
  );
}

function buildScopedWhere(usuario, filtros, params) {
  const where = [];

  if (usuario.perfil === "admin") {
    if (!filtros.condominio_id) {
      const error = new Error("Selecione um condominio");
      error.status = 400;
      throw error;
    }
    where.push("mos.condominio_id = ?");
    params.push(filtros.condominio_id);
  } else if (usuario.perfil === "funcionario") {
    where.push("mos.condominio_id = ?");
    params.push(filtros.condominio_id);
  } else {
    const error = new Error("Perfil sem permissao para este modulo");
    error.status = 403;
    throw error;
  }

  if (filtros.status) {
    where.push("mos.status = ?");
    params.push(filtros.status);
  }
  if (filtros.prioridade) {
    where.push("mos.prioridade = ?");
    params.push(filtros.prioridade);
  }
  if (filtros.tipo_origem) {
    where.push("mos.tipo_origem = ?");
    params.push(filtros.tipo_origem);
  }

  return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

async function getScopedOrdem(usuario, ordemId) {
  const params = [ordemId];
  let scopeSql = "";

  if (usuario.perfil === "admin") {
    scopeSql = "AND c.admin_id = ?";
    params.push(usuario.id);
  } else if (usuario.perfil === "funcionario") {
    const contexto = await getFuncionarioContexto(usuario.id);
    scopeSql = "AND mos.condominio_id = ?";
    params.push(contexto.condominio_id);
  } else {
    const error = new Error("Perfil sem permissao para visualizar manutencao");
    error.status = 403;
    throw error;
  }

  const [rows] = await db.query(
    `
    SELECT
      mos.*,
      c.nome_fantasia AS condominio_nome,
      ac.nome AS area_nome,
      t.nome AS torre_nome,
      un.identificacao AS unidade_identificacao,
      oc.titulo AS ocorrencia_titulo,
      up.nome_prestador,
      uu.nome_completo AS criado_por_nome,
      ur.nome_completo AS responsavel_nome
    FROM manutencoes_ordens_servico mos
    INNER JOIN condominios c ON c.id = mos.condominio_id
    LEFT JOIN areas_comuns ac ON ac.id = mos.area_comum_id
    LEFT JOIN torres t ON t.id = mos.torre_id
    LEFT JOIN unidades un ON un.id = mos.unidade_id
    LEFT JOIN ocorrencias oc ON oc.id = mos.ocorrencia_id
    LEFT JOIN prestadores_servico up ON up.id = mos.prestador_servico_id
    LEFT JOIN usuarios uu ON uu.id = mos.criado_por_usuario_id
    LEFT JOIN funcionarios fr ON fr.id = mos.funcionario_responsavel_id
    LEFT JOIN usuarios ur ON ur.id = fr.usuario_id
    WHERE mos.id = ?
      ${scopeSql}
    LIMIT 1
    `,
    params,
  );

  if (!rows.length) {
    const error = new Error("Ordem de servico nao encontrada");
    error.status = 404;
    throw error;
  }
  return rows[0];
}

export async function listManutencoesService(usuario, filtros = {}) {
  const effectiveFilters = { ...filtros };
  if (usuario.perfil === "funcionario") {
    const contexto = await getFuncionarioContexto(usuario.id);
    effectiveFilters.condominio_id = contexto.condominio_id;
  } else if (usuario.perfil === "admin" && filtros.condominio_id) {
    await validarCondominioAdmin(usuario.id, filtros.condominio_id);
  }

  const params = [];
  const whereSql = buildScopedWhere(usuario, effectiveFilters, params);
  const [rows] = await db.query(
    `
    SELECT
      mos.id,
      mos.condominio_id,
      mos.ocorrencia_id,
      mos.tipo_origem,
      mos.alvo_tipo,
      mos.titulo,
      mos.local_referencia,
      mos.prioridade,
      mos.status,
      mos.data_prevista,
      mos.prazo_final_em,
      mos.iniciada_em,
      mos.concluida_em,
      mos.bloqueia_area,
      c.nome_fantasia AS condominio_nome,
      ac.nome AS area_nome,
      t.nome AS torre_nome,
      un.identificacao AS unidade_identificacao,
      ps.nome_prestador,
      uu.nome_completo AS criado_por_nome,
      ur.nome_completo AS responsavel_nome
    FROM manutencoes_ordens_servico mos
    INNER JOIN condominios c ON c.id = mos.condominio_id
    LEFT JOIN areas_comuns ac ON ac.id = mos.area_comum_id
    LEFT JOIN torres t ON t.id = mos.torre_id
    LEFT JOIN unidades un ON un.id = mos.unidade_id
    LEFT JOIN prestadores_servico ps ON ps.id = mos.prestador_servico_id
    LEFT JOIN usuarios uu ON uu.id = mos.criado_por_usuario_id
    LEFT JOIN funcionarios fr ON fr.id = mos.funcionario_responsavel_id
    LEFT JOIN usuarios ur ON ur.id = fr.usuario_id
    ${whereSql}
    ORDER BY
      CASE mos.status
        WHEN 'em_execucao' THEN 0
        WHEN 'aguardando_terceiro' THEN 1
        WHEN 'planejada' THEN 2
        WHEN 'aberta' THEN 3
        WHEN 'concluida' THEN 4
        ELSE 5
      END,
      COALESCE(mos.data_prevista, mos.prazo_final_em, mos.criado_em) DESC,
      mos.criado_em DESC
    `,
    params,
  );
  return rows;
}

export async function createManutencaoService(usuario, data) {
  if (!["admin", "funcionario"].includes(usuario.perfil)) {
    const error = new Error("Perfil sem permissao para criar ordem de servico");
    error.status = 403;
    throw error;
  }

  const payload = parsePayload(data);
  const anexos = parseAnexosPayload(data.anexos);

  let condominioId;
  let funcionarioExecutorId = null;
  if (usuario.perfil === "admin") {
    condominioId = normalizeText(data.condominio_id);
    if (!condominioId) {
      const error = new Error("Condominio obrigatorio");
      error.status = 400;
      throw error;
    }
    await validarCondominioAdmin(usuario.id, condominioId);
  } else {
    const contexto = await getFuncionarioContexto(usuario.id);
    condominioId = contexto.condominio_id;
    funcionarioExecutorId = contexto.funcionario_id;
  }

  const [ocorrencia, area, torre, unidade, prestador, funcionarioResponsavel] = await Promise.all([
    validarOcorrenciaCondominio(condominioId, normalizeText(data.ocorrencia_id)),
    validarAreaCondominio(condominioId, normalizeText(data.area_comum_id)),
    validarTorreCondominio(condominioId, normalizeText(data.torre_id)),
    validarUnidadeCondominio(condominioId, normalizeText(data.unidade_id)),
    validarPrestadorCondominio(condominioId, normalizeText(data.prestador_servico_id)),
    validarFuncionarioCondominio(condominioId, normalizeText(data.funcionario_responsavel_id)).catch((error) => {
      if (normalizeText(data.funcionario_responsavel_id)) throw error;
      return null;
    }),
  ]);

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const id = uuidv4();
    await connection.query(
      `
      INSERT INTO manutencoes_ordens_servico
        (id, condominio_id, ocorrencia_id, area_comum_id, torre_id, unidade_id, prestador_servico_id, funcionario_responsavel_id,
         criado_por_usuario_id, tipo_origem, alvo_tipo, titulo, descricao_tecnica, local_referencia, prioridade, status,
         prazo_final_em, data_prevista, custo_previsto, custo_realizado, bloqueia_area, observacoes_internas)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        condominioId,
        ocorrencia?.id || null,
        area?.id || null,
        torre?.id || null,
        unidade?.id || null,
        prestador?.id || null,
        funcionarioResponsavel?.id || null,
        usuario.id,
        payload.tipoOrigem,
        payload.alvoTipo,
        payload.titulo,
        payload.descricaoTecnica,
        payload.localReferencia || null,
        payload.prioridade,
        payload.status,
        payload.prazoFinalEm,
        payload.dataPrevista,
        payload.custoPrevisto,
        payload.custoRealizado,
        payload.bloqueiaArea ? 1 : 0,
        payload.observacoesInternas || null,
      ],
    );

    await insertEvento(connection, {
      ordemServicoId: id,
      condominioId,
      usuarioId: usuario.id,
      funcionarioId: funcionarioExecutorId,
      tipoEvento: "abertura",
      statusResultante: payload.status,
      descricaoEvento: "Ordem de servico criada",
      custoInformado: payload.custoPrevisto,
    });

    if (funcionarioResponsavel?.id) {
      await insertEvento(connection, {
        ordemServicoId: id,
        condominioId,
        usuarioId: usuario.id,
        funcionarioId: funcionarioResponsavel.id,
        tipoEvento: "atribuicao",
        statusResultante: payload.status,
        descricaoEvento: `Responsavel definido: ${funcionarioResponsavel.funcionario_nome}`,
      });
    }

    const anexosPersistidos = await persistirAnexos(connection, {
      ordemServicoId: id,
      condominioId,
      usuarioId: usuario.id,
      anexos,
    });

    await connection.commit();
    return {
      ordem_servico: {
        id,
        condominio_id: condominioId,
        ocorrencia_id: ocorrencia?.id || null,
        area_comum_id: area?.id || null,
        torre_id: torre?.id || null,
        unidade_id: unidade?.id || null,
        prestador_servico_id: prestador?.id || null,
        funcionario_responsavel_id: funcionarioResponsavel?.id || null,
        tipo_origem: payload.tipoOrigem,
        alvo_tipo: payload.alvoTipo,
        titulo: payload.titulo,
        status: payload.status,
      },
      anexos: anexosPersistidos,
    };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export async function updateManutencaoStatusService(usuario, ordemId, data) {
  if (!["admin", "funcionario"].includes(usuario.perfil)) {
    const error = new Error("Perfil sem permissao para atualizar ordem");
    error.status = 403;
    throw error;
  }

  const ordem = await getScopedOrdem(usuario, ordemId);
  const status = normalizeText(data.status);
  if (!STATUS.has(status)) {
    const error = new Error("Status invalido");
    error.status = 400;
    throw error;
  }
  const observacao = normalizeText(data.descricao_evento || data.observacao);
  const custoInformado = data.custo_informado === "" || data.custo_informado == null ? null : Number(data.custo_informado);
  const funcionarioExecutorId = usuario.perfil === "funcionario" ? (await getFuncionarioContexto(usuario.id)).funcionario_id : null;

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE manutencoes_ordens_servico
      SET status = ?,
          iniciada_em = CASE WHEN ? = 'em_execucao' AND iniciada_em IS NULL THEN NOW() ELSE iniciada_em END,
          concluida_em = CASE WHEN ? = 'concluida' THEN NOW() WHEN ? <> 'concluida' THEN NULL ELSE concluida_em END,
          custo_realizado = COALESCE(?, custo_realizado)
      WHERE id = ?
      `,
      [status, status, status, status, custoInformado, ordem.id],
    );

    await insertEvento(connection, {
      ordemServicoId: ordem.id,
      condominioId: ordem.condominio_id,
      usuarioId: usuario.id,
      funcionarioId: funcionarioExecutorId,
      tipoEvento: mapStatusToEventType(status),
      statusResultante: status,
      descricaoEvento: observacao || `Status alterado para ${status}`,
      custoInformado,
    });

    await connection.commit();
    return { sucesso: true, status };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export async function updateManutencaoResponsavelService(usuario, ordemId, data) {
  if (usuario.perfil !== "admin") {
    const error = new Error("Somente admin pode atribuir responsavel");
    error.status = 403;
    throw error;
  }
  const ordem = await getScopedOrdem(usuario, ordemId);
  const funcionario = await validarFuncionarioCondominio(ordem.condominio_id, normalizeText(data.funcionario_responsavel_id)).catch((error) => {
    if (normalizeText(data.funcionario_responsavel_id)) throw error;
    return null;
  });

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    await connection.query(`UPDATE manutencoes_ordens_servico SET funcionario_responsavel_id = ? WHERE id = ?`, [funcionario?.id || null, ordem.id]);
    await insertEvento(connection, {
      ordemServicoId: ordem.id,
      condominioId: ordem.condominio_id,
      usuarioId: usuario.id,
      funcionarioId: funcionario?.id || null,
      tipoEvento: "atribuicao",
      statusResultante: ordem.status,
      descricaoEvento: funcionario ? `Responsavel definido: ${funcionario.funcionario_nome}` : "Responsavel removido",
    });
    await connection.commit();
    return { sucesso: true, funcionario_responsavel_id: funcionario?.id || null };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export async function getManutencaoHistoricoService(usuario, ordemId) {
  const ordem = await getScopedOrdem(usuario, ordemId);
  const [eventos] = await db.query(
    `
    SELECT
      me.id,
      me.tipo_evento,
      me.status_resultante,
      me.descricao_evento,
      me.custo_informado,
      me.criado_em,
      uu.nome_completo AS usuario_nome,
      uf.nome_completo AS funcionario_nome
    FROM manutencoes_eventos me
    INNER JOIN usuarios uu ON uu.id = me.usuario_id
    LEFT JOIN funcionarios f ON f.id = me.funcionario_id
    LEFT JOIN usuarios uf ON uf.id = f.usuario_id
    WHERE me.ordem_servico_id = ?
    ORDER BY me.criado_em ASC
    `,
    [ordem.id],
  );
  const [anexos] = await db.query(
    `
    SELECT id, nome_original, nome_arquivo, mime_type, caminho_relativo, tamanho_bytes, criado_em
    FROM manutencoes_anexos
    WHERE ordem_servico_id = ?
    ORDER BY criado_em ASC
    `,
    [ordem.id],
  );

  return { ordem_servico: ordem, eventos, anexos };
}
