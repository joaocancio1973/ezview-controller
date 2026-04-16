import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeBoolean(value, fallback = 1) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (value === true || value === "true" || value === 1 || value === "1") {
    return 1;
  }

  return 0;
}

function normalizeDecimal(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

async function validarCondominioDoAdmin(usuarioId, condominioId) {
  const [rows] = await db.query(
    `
    SELECT id, admin_id, ativo, nome_fantasia
    FROM condominios
    WHERE id = ? AND admin_id = ?
    LIMIT 1
    `,
    [condominioId, usuarioId],
  );

  if (!rows.length) {
    const error = new Error("Condominio invalido ou fora do contexto do admin logado");
    error.status = 404;
    throw error;
  }

  const condominio = rows[0];

  if (Number(condominio.ativo) !== 1) {
    const error = new Error("Condominio inativo");
    error.status = 403;
    throw error;
  }

  return condominio;
}

async function obterContextoMorador(usuarioId) {
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

export async function listAreasComunsService(usuario, filtros = {}) {
  if (usuario?.perfil === "morador") {
    const contexto = await obterContextoMorador(usuario.id);
    const params = [contexto.condominio_id];
    let extraWhere = "";

    if (filtros.condominio_id && filtros.condominio_id !== contexto.condominio_id) {
      return [];
    }

    if (filtros.exige_reserva !== undefined && filtros.exige_reserva !== null && filtros.exige_reserva !== "") {
      extraWhere += " AND a.exige_reserva = ?";
      params.push(Number(filtros.exige_reserva) === 1 ? 1 : 0);
    }

    const [rows] = await db.query(
      `
      SELECT
        a.id,
        a.condominio_id,
        c.nome_fantasia AS condominio_nome,
        a.nome,
        a.descricao,
        a.exige_reserva,
        a.exige_taxa,
        a.valor_taxa,
        a.ativo,
        a.criado_em
      FROM areas_comuns a
      INNER JOIN condominios c ON c.id = a.condominio_id
      WHERE a.condominio_id = ?
        AND a.ativo = 1${extraWhere}
      ORDER BY a.nome ASC
      `,
      params,
    );

    return rows;
  }

  const params = [usuario.id];
  let extraWhere = "";

  if (filtros.condominio_id) {
    extraWhere += " AND a.condominio_id = ?";
    params.push(filtros.condominio_id);
  }

  const [rows] = await db.query(
    `
    SELECT
      a.id,
      a.condominio_id,
      c.nome_fantasia AS condominio_nome,
      a.nome,
      a.descricao,
      a.exige_reserva,
      a.exige_taxa,
      a.valor_taxa,
      a.ativo,
      a.criado_em
    FROM areas_comuns a
    INNER JOIN condominios c ON c.id = a.condominio_id
    WHERE c.admin_id = ?${extraWhere}
    ORDER BY c.nome_fantasia ASC, a.nome ASC
    `,
    params,
  );

  return rows;
}

export async function createAreaComumService(usuarioId, data) {
  const condominioId = normalizeText(data.condominio_id);
  const nome = normalizeText(data.nome);
  const descricao = normalizeText(data.descricao);
  const exigeReserva = normalizeBoolean(data.exige_reserva, 1);
  const exigeTaxa = normalizeBoolean(data.exige_taxa, 0);
  const valorTaxa = normalizeDecimal(data.valor_taxa);
  const ativo = normalizeBoolean(data.ativo, 1);

  if (!condominioId || !nome) {
    const error = new Error("Condominio e nome da area sao obrigatorios");
    error.status = 400;
    throw error;
  }

  if (exigeTaxa === 1 && (valorTaxa === null || valorTaxa < 0)) {
    const error = new Error("Informe um valor de taxa valido quando a area exigir taxa");
    error.status = 400;
    throw error;
  }

  await validarCondominioDoAdmin(usuarioId, condominioId);

  const [existingRows] = await db.query(
    `
    SELECT id
    FROM areas_comuns
    WHERE condominio_id = ? AND nome = ?
    LIMIT 1
    `,
    [condominioId, nome],
  );

  if (existingRows.length > 0) {
    const error = new Error("Ja existe uma area comum com este nome neste condominio");
    error.status = 409;
    throw error;
  }

  const novoId = uuidv4();

  await db.query(
    `
    INSERT INTO areas_comuns (
      id,
      condominio_id,
      nome,
      descricao,
      exige_reserva,
      exige_taxa,
      valor_taxa,
      ativo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      novoId,
      condominioId,
      nome,
      descricao || null,
      exigeReserva,
      exigeTaxa,
      exigeTaxa ? valorTaxa : null,
      ativo,
    ],
  );

  return {
    id: novoId,
    condominio_id: condominioId,
    nome,
    descricao: descricao || null,
    exige_reserva: exigeReserva,
    exige_taxa: exigeTaxa,
    valor_taxa: exigeTaxa ? valorTaxa : null,
    ativo,
  };
}
