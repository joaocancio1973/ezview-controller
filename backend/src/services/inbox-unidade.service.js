import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

const STATUS_INBOX = new Set(["ativo", "inativo", "bloqueado"]);
const LIMITE_INBOX_UNIDADE = 10;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

async function getMoradorTitularContexto(usuarioId) {
  const [rows] = await db.query(
    `
    SELECT
      uu.unidade_id,
      u.condominio_id,
      u.identificacao AS unidade_identificacao,
      c.nome_fantasia AS condominio_nome,
      t.nome AS torre_nome
    FROM unidade_usuarios uu
    INNER JOIN unidades u ON u.id = uu.unidade_id
    INNER JOIN condominios c ON c.id = u.condominio_id
    LEFT JOIN torres t ON t.id = u.torre_id
    WHERE uu.usuario_id = ?
      AND uu.ativo = 1
      AND uu.papel = 'titular'
    ORDER BY uu.criado_em ASC
    LIMIT 1
    `,
    [usuarioId],
  );

  if (!rows.length) {
    const error = new Error("Somente o titular ativo da unidade pode gerir o inBox");
    error.status = 403;
    throw error;
  }

  return rows[0];
}

async function getAdminScopedUnit(adminUsuarioId, condominioId, unidadeId) {
  const [rows] = await db.query(
    `
    SELECT
      u.id AS unidade_id,
      u.condominio_id,
      u.identificacao AS unidade_identificacao,
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

async function resolveInboxContext(usuario, filtros = {}) {
  if (usuario.perfil === "morador") {
    return getMoradorTitularContexto(usuario.id);
  }

  if (usuario.perfil === "admin") {
    const condominioId = normalizeText(filtros.condominio_id);
    const unidadeId = normalizeText(filtros.unidade_id);
    if (!condominioId || !unidadeId) {
      const error = new Error("Condominio e unidade sao obrigatorios");
      error.status = 400;
      throw error;
    }
    return getAdminScopedUnit(usuario.id, condominioId, unidadeId);
  }

  if (usuario.perfil === "funcionario") {
    const [rows] = await db.query(
      `
      SELECT
        f.condominio_id,
        c.nome_fantasia AS condominio_nome
      FROM funcionarios f
      INNER JOIN condominios c ON c.id = f.condominio_id
      WHERE f.usuario_id = ?
      LIMIT 1
      `,
      [usuario.id],
    );

    if (!rows.length) {
      const error = new Error("Funcionario sem contexto condominial");
      error.status = 404;
      throw error;
    }

    return {
      condominio_id: rows[0].condominio_id,
      condominio_nome: rows[0].condominio_nome,
      unidade_id: normalizeText(filtros.unidade_id) || null,
      unidade_identificacao: null,
    };
  }

  const error = new Error("Perfil sem permissao para acessar o inBox");
  error.status = 403;
  throw error;
}

function parseInboxPayload(data) {
  const nomeCompleto = normalizeText(data.nome_completo);
  const documento = normalizeText(data.documento);
  const telefone = normalizeText(data.telefone);
  const parentescoRelacao = normalizeText(data.parentesco_relacao);
  const observacoes = normalizeText(data.observacoes);
  const fotoIdentificacaoUrl = normalizeText(data.foto_identificacao_url);

  if (!nomeCompleto) {
    const error = new Error("Nome completo e obrigatorio");
    error.status = 400;
    throw error;
  }

  return {
    nomeCompleto,
    documento,
    telefone,
    parentescoRelacao,
    observacoes,
    fotoIdentificacaoUrl,
  };
}

async function ensureInboxLimit(unidadeId, currentId = null) {
  const params = [unidadeId];
  let extraWhere = "";
  if (currentId) {
    extraWhere = " AND id <> ?";
    params.push(currentId);
  }

  const [rows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM inbox_visitantes_unidade
    WHERE unidade_id = ?${extraWhere}
      AND status <> 'inativo'
    `,
    params,
  );

  if (Number(rows[0]?.total || 0) >= LIMITE_INBOX_UNIDADE) {
    const error = new Error(`O inBox da unidade suporta ate ${LIMITE_INBOX_UNIDADE} pessoas ativas`);
    error.status = 409;
    throw error;
  }
}

export async function listInboxUnidadeService(usuario, filtros = {}) {
  const contexto = await resolveInboxContext(usuario, filtros);
  const params = [contexto.condominio_id];
  let where = " WHERE iu.condominio_id = ?";

  if (contexto.unidade_id) {
    where += " AND iu.unidade_id = ?";
    params.push(contexto.unidade_id);
  }

  if (filtros.status && STATUS_INBOX.has(filtros.status)) {
    where += " AND iu.status = ?";
    params.push(filtros.status);
  }

  if (filtros.busca) {
    where += " AND (iu.nome_completo LIKE ? OR iu.documento LIKE ? OR iu.telefone LIKE ? OR iu.parentesco_relacao LIKE ?)";
    const like = `%${normalizeText(filtros.busca)}%`;
    params.push(like, like, like, like);
  }

  const [rows] = await db.query(
    `
    SELECT
      iu.id,
      iu.condominio_id,
      iu.unidade_id,
      iu.nome_completo,
      iu.documento,
      iu.telefone,
      iu.parentesco_relacao,
      iu.observacoes,
      iu.status,
      iu.foto_identificacao_url,
      iu.ultimo_acesso_em,
      iu.criado_em,
      iu.atualizado_em,
      c.nome_fantasia AS condominio_nome,
      u.identificacao AS unidade_identificacao,
      usr.nome_completo AS cadastrado_por_nome
    FROM inbox_visitantes_unidade iu
    INNER JOIN condominios c ON c.id = iu.condominio_id
    INNER JOIN unidades u ON u.id = iu.unidade_id
    INNER JOIN usuarios usr ON usr.id = iu.cadastrado_por_usuario_id
    ${where}
    ORDER BY u.identificacao ASC, iu.nome_completo ASC
    `,
    params,
  );

  return {
    limite_por_unidade: LIMITE_INBOX_UNIDADE,
    contexto: {
      condominio_id: contexto.condominio_id,
      condominio_nome: contexto.condominio_nome,
      unidade_id: contexto.unidade_id || null,
      unidade_identificacao: contexto.unidade_identificacao || null,
    },
    pessoas: rows,
  };
}

export async function createInboxUnidadeService(usuario, data) {
  const payload = parseInboxPayload(data);
  const contexto = await resolveInboxContext(usuario, data);

  if (!contexto.unidade_id) {
    const error = new Error("Unidade obrigatoria para cadastrar pessoa no inBox");
    error.status = 400;
    throw error;
  }

  await ensureInboxLimit(contexto.unidade_id);

  const id = uuidv4();
  await db.query(
    `
    INSERT INTO inbox_visitantes_unidade
      (id, condominio_id, unidade_id, nome_completo, documento, telefone, parentesco_relacao, observacoes, foto_identificacao_url, cadastrado_por_usuario_id)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      contexto.condominio_id,
      contexto.unidade_id,
      payload.nomeCompleto,
      payload.documento || null,
      payload.telefone || null,
      payload.parentescoRelacao || null,
      payload.observacoes || null,
      payload.fotoIdentificacaoUrl || null,
      usuario.id,
    ],
  );

  return {
    pessoa: {
      id,
      nome_completo: payload.nomeCompleto,
      documento: payload.documento || null,
      telefone: payload.telefone || null,
      parentesco_relacao: payload.parentescoRelacao || null,
      observacoes: payload.observacoes || null,
      foto_identificacao_url: payload.fotoIdentificacaoUrl || null,
      status: "ativo",
    },
    contexto: {
      condominio_id: contexto.condominio_id,
      condominio_nome: contexto.condominio_nome,
      unidade_id: contexto.unidade_id,
      unidade_identificacao: contexto.unidade_identificacao,
      limite_por_unidade: LIMITE_INBOX_UNIDADE,
    },
  };
}

async function getScopedInboxItem(usuario, id, filtros = {}) {
  const contexto = await resolveInboxContext(usuario, filtros);
  const params = [id, contexto.condominio_id];
  let where = " WHERE iu.id = ? AND iu.condominio_id = ?";
  if (contexto.unidade_id) {
    where += " AND iu.unidade_id = ?";
    params.push(contexto.unidade_id);
  }

  const [rows] = await db.query(
    `
    SELECT iu.*
    FROM inbox_visitantes_unidade iu
    ${where}
    LIMIT 1
    `,
    params,
  );

  if (!rows.length) {
    const error = new Error("Pessoa do inBox nao encontrada no contexto informado");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

export async function updateInboxUnidadeService(usuario, id, data) {
  const item = await getScopedInboxItem(usuario, id, data);
  const payload = parseInboxPayload(data);

  await db.query(
    `
    UPDATE inbox_visitantes_unidade
    SET
      nome_completo = ?,
      documento = ?,
      telefone = ?,
      parentesco_relacao = ?,
      observacoes = ?,
      foto_identificacao_url = ?
    WHERE id = ?
    `,
    [
      payload.nomeCompleto,
      payload.documento || null,
      payload.telefone || null,
      payload.parentescoRelacao || null,
      payload.observacoes || null,
      payload.fotoIdentificacaoUrl || null,
      item.id,
    ],
  );

  return { sucesso: true };
}

export async function updateInboxUnidadeStatusService(usuario, id, status, filtros = {}) {
  const normalizedStatus = normalizeText(status);
  if (!STATUS_INBOX.has(normalizedStatus)) {
    const error = new Error("Status invalido para o inBox");
    error.status = 400;
    throw error;
  }

  const item = await getScopedInboxItem(usuario, id, filtros);

  if (normalizedStatus !== item.status && normalizedStatus !== "inativo") {
    await ensureInboxLimit(item.unidade_id, item.id);
  }

  await db.query(
    `
    UPDATE inbox_visitantes_unidade
    SET status = ?
    WHERE id = ?
    `,
    [normalizedStatus, item.id],
  );

  return { sucesso: true };
}

export async function listInboxSugestoesService(usuario, filtros = {}) {
  const contexto = await resolveInboxContext(usuario, filtros);
  const params = [contexto.condominio_id];
  let where = " WHERE iu.condominio_id = ?";

  if (contexto.unidade_id) {
    where += " AND iu.unidade_id = ?";
    params.push(contexto.unidade_id);
  } else if (filtros.unidade_id) {
    where += " AND iu.unidade_id = ?";
    params.push(filtros.unidade_id);
  }

  if (filtros.apenas_ativos !== "0") {
    where += " AND iu.status = 'ativo'";
  }

  if (filtros.termo) {
    where += " AND (iu.nome_completo LIKE ? OR iu.documento LIKE ? OR iu.telefone LIKE ?)";
    const like = `%${normalizeText(filtros.termo)}%`;
    params.push(like, like, like);
  }

  const [rows] = await db.query(
    `
    SELECT
      iu.id,
      iu.unidade_id,
      iu.nome_completo,
      iu.documento,
      iu.telefone,
      iu.parentesco_relacao,
      iu.observacoes,
      iu.status,
      iu.foto_identificacao_url,
      iu.ultimo_acesso_em,
      u.identificacao AS unidade_identificacao
    FROM inbox_visitantes_unidade iu
    INNER JOIN unidades u ON u.id = iu.unidade_id
    ${where}
    ORDER BY iu.nome_completo ASC
    LIMIT 20
    `,
    params,
  );

  return rows;
}
