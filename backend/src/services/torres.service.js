import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeInteger(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizeStatus(value) {
  if (value === undefined || value === null || value === "") {
    return 1;
  }

  if (value === true || value === "true" || value === 1 || value === "1") {
    return 1;
  }

  return 0;
}

function calcularAndarFinal(andarInicial, quantidadeAndares) {
  return andarInicial + quantidadeAndares - 1;
}

export async function listTorresService(usuarioId, condominioId = null) {
  const params = [usuarioId];
  let extraWhere = "";

  if (condominioId) {
    extraWhere = " AND t.condominio_id = ?";
    params.push(condominioId);
  }

  const [rows] = await db.query(
    `
    SELECT
      t.id,
      t.condominio_id,
      c.nome_fantasia AS condominio_nome,
      t.nome,
      t.descricao,
      t.andar_inicial,
      t.quantidade_andares,
      (t.andar_inicial + t.quantidade_andares - 1) AS andar_final,
      t.ativo,
      t.criado_em,
      t.atualizado_em
    FROM torres t
    INNER JOIN condominios c ON c.id = t.condominio_id
    WHERE c.admin_id = ?${extraWhere}
    ORDER BY c.nome_fantasia ASC, t.nome ASC
    `,
    params,
  );

  return rows;
}

export async function createTorresService(usuarioId, data) {
  const condominioId = normalizeText(data.condominio_id);
  const nome = normalizeText(data.nome);
  const descricao = normalizeText(data.descricao);
  const andarInicial = normalizeInteger(data.andar_inicial, 1);
  const quantidadeAndares = normalizeInteger(data.quantidade_andares, 1);
  const ativo = normalizeStatus(data.ativo);

  if (!condominioId || !nome) {
    const error = new Error("Campos obrigatorios nao informados");
    error.status = 400;
    throw error;
  }

  if (andarInicial < 0) {
    const error = new Error("O primeiro andar da torre nao pode ser negativo");
    error.status = 400;
    throw error;
  }

  if (quantidadeAndares < 1) {
    const error = new Error("A quantidade de andares deve ser maior que zero");
    error.status = 400;
    throw error;
  }

  const [condominioRows] = await db.query(
    `
    SELECT id, admin_id, ativo
    FROM condominios
    WHERE id = ? AND admin_id = ?
    LIMIT 1
    `,
    [condominioId, usuarioId],
  );

  if (condominioRows.length === 0) {
    const error = new Error("Condominio invalido ou nao pertence ao admin logado");
    error.status = 404;
    throw error;
  }

  const condominio = condominioRows[0];

  if (Number(condominio.ativo) !== 1) {
    const error = new Error("Condominio inativo");
    error.status = 403;
    throw error;
  }

  const [existingRows] = await db.query(
    `
    SELECT id
    FROM torres
    WHERE condominio_id = ? AND nome = ?
    LIMIT 1
    `,
    [condominioId, nome],
  );

  if (existingRows.length > 0) {
    const error = new Error("Ja existe uma torre com este nome neste condominio");
    error.status = 409;
    throw error;
  }

  const novoId = uuidv4();

  await db.query(
    `
    INSERT INTO torres (
      id,
      condominio_id,
      nome,
      descricao,
      andar_inicial,
      quantidade_andares,
      ativo
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [novoId, condominioId, nome, descricao, andarInicial, quantidadeAndares, ativo],
  );

  return {
    id: novoId,
    condominio_id: condominioId,
    nome,
    descricao,
    andar_inicial: andarInicial,
    quantidade_andares: quantidadeAndares,
    andar_final: calcularAndarFinal(andarInicial, quantidadeAndares),
    ativo,
  };
}
