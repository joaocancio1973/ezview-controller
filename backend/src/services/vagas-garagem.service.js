import db from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeBoolean(value, fallback = 1) {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === true || value === "true" || value === 1 || value === "1") return 1;
  return 0;
}

async function getAdminScopedCondominio(adminUsuarioId, condominioId) {
  const [rows] = await db.query(
    `
    SELECT id, ativo
    FROM condominios
    WHERE id = ? AND admin_id = ?
    LIMIT 1
    `,
    [condominioId, adminUsuarioId],
  );

  if (!rows.length) {
    const error = new Error("Condominio invalido ou fora do escopo do admin logado");
    error.status = 404;
    throw error;
  }

  if (Number(rows[0].ativo) !== 1) {
    const error = new Error("Condominio inativo");
    error.status = 403;
    throw error;
  }

  return rows[0];
}

async function getAdminScopedUnidade(adminUsuarioId, condominioId, unidadeId) {
  if (!unidadeId) return null;

  const [rows] = await db.query(
    `
    SELECT u.id, u.ativo
    FROM unidades u
    INNER JOIN condominios c ON c.id = u.condominio_id
    WHERE u.id = ? AND u.condominio_id = ? AND c.admin_id = ?
    LIMIT 1
    `,
    [unidadeId, condominioId, adminUsuarioId],
  );

  if (!rows.length) {
    const error = new Error("Unidade invalida ou fora do escopo do admin logado");
    error.status = 404;
    throw error;
  }

  if (Number(rows[0].ativo) !== 1) {
    const error = new Error("Unidade inativa");
    error.status = 403;
    throw error;
  }

  return rows[0];
}

export async function listVagasGaragemService(adminUsuarioId, filtros = {}) {
  const params = [adminUsuarioId];
  let extraWhere = "";

  if (filtros.condominio_id) {
    extraWhere += " AND vg.condominio_id = ?";
    params.push(filtros.condominio_id);
  }

  if (filtros.unidade_id) {
    extraWhere += " AND vg.unidade_id = ?";
    params.push(filtros.unidade_id);
  }

  const [rows] = await db.query(
    `
    SELECT
      vg.id,
      vg.condominio_id,
      c.nome_fantasia AS condominio_nome,
      vg.unidade_id,
      u.identificacao AS unidade_identificacao,
      vg.identificacao,
      vg.tipo,
      vg.coberta,
      vg.ativa,
      vg.criado_em,
      vg.atualizado_em
    FROM vagas_garagem vg
    INNER JOIN condominios c ON c.id = vg.condominio_id
    LEFT JOIN unidades u ON u.id = vg.unidade_id
    WHERE c.admin_id = ?${extraWhere}
    ORDER BY c.nome_fantasia ASC, vg.identificacao ASC
    `,
    params,
  );

  return rows;
}

export async function createVagaGaragemService(adminUsuarioId, data) {
  const condominioId = normalizeText(data.condominio_id);
  const unidadeId = normalizeText(data.unidade_id);
  const identificacao = normalizeText(data.identificacao);
  const tipo = normalizeText(data.tipo);
  const coberta = normalizeBoolean(data.coberta, 1);
  const ativa = normalizeBoolean(data.ativa, 1);

  if (!condominioId || !identificacao || !tipo) {
    const error = new Error("Campos obrigatorios da vaga nao informados");
    error.status = 400;
    throw error;
  }

  if (!["carro", "moto", "bicicleta"].includes(tipo)) {
    const error = new Error("Tipo de vaga invalido");
    error.status = 400;
    throw error;
  }

  await getAdminScopedCondominio(adminUsuarioId, condominioId);
  await getAdminScopedUnidade(adminUsuarioId, condominioId, unidadeId);

  const [existingRows] = await db.query(
    `
    SELECT id
    FROM vagas_garagem
    WHERE condominio_id = ? AND identificacao = ?
    LIMIT 1
    `,
    [condominioId, identificacao],
  );

  if (existingRows.length) {
    const error = new Error("Ja existe uma vaga com esta identificacao neste condominio");
    error.status = 409;
    throw error;
  }

  const vagaId = uuidv4();

  await db.query(
    `
    INSERT INTO vagas_garagem
      (id, condominio_id, unidade_id, identificacao, tipo, coberta, ativa)
    VALUES
      (?, ?, ?, ?, ?, ?, ?)
    `,
    [vagaId, condominioId, unidadeId || null, identificacao, tipo, coberta, ativa],
  );

  return {
    id: vagaId,
    condominio_id: condominioId,
    unidade_id: unidadeId || null,
    identificacao,
    tipo,
    coberta,
    ativa,
  };
}
