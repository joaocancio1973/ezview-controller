import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

const FUNCOES_COLABORADOR = new Set([
  "secretaria_lar",
  "diarista",
  "baba",
  "cuidador",
  "motorista",
  "jardineiro",
  "outro",
]);
const STATUS_COLABORADOR = new Set(["ativo", "inativo", "bloqueado"]);

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
      u.identificacao AS unidade_identificacao,
      c.nome_fantasia AS condominio_nome
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
    WHERE c.admin_id = ?
      AND u.condominio_id = ?
      AND u.id = ?
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

async function getScopedColaborador(usuario, colaboradorId) {
  if (usuario.perfil === "admin") {
    const [rows] = await db.query(
      `
      SELECT cu.*
      FROM colaboradores_unidade cu
      INNER JOIN condominios c ON c.id = cu.condominio_id
      WHERE cu.id = ? AND c.admin_id = ?
      LIMIT 1
      `,
      [colaboradorId, usuario.id],
    );

    if (!rows.length) {
      const error = new Error("Colaborador nao encontrado no escopo do admin");
      error.status = 404;
      throw error;
    }

    return rows[0];
  }

  if (usuario.perfil === "morador") {
    const contexto = await getMoradorContexto(usuario.id);
    const [rows] = await db.query(
      `
      SELECT *
      FROM colaboradores_unidade
      WHERE id = ? AND condominio_id = ? AND unidade_id = ?
      LIMIT 1
      `,
      [colaboradorId, contexto.condominio_id, contexto.unidade_id],
    );

    if (!rows.length) {
      const error = new Error("Colaborador nao encontrado no contexto da unidade");
      error.status = 404;
      throw error;
    }

    return rows[0];
  }

  const error = new Error("Perfil sem permissao para acessar colaboradores da unidade");
  error.status = 403;
  throw error;
}

function parseColaboradorPayload(data) {
  const nomeCompleto = normalizeText(data.nome_completo);
  const documento = normalizeText(data.documento);
  const telefone = normalizeText(data.telefone);
  const fotoIdentificacaoUrl = normalizeText(data.foto_identificacao_url);
  const funcao = normalizeText(data.funcao || "outro");
  const empresa = normalizeText(data.empresa);
  const observacoes = normalizeText(data.observacoes);
  const podeAutorizarTerceiros = normalizeBoolean(data.pode_autorizar_terceiros);

  if (!nomeCompleto || !funcao) {
    const error = new Error("Nome completo e funcao sao obrigatorios");
    error.status = 400;
    throw error;
  }

  if (!FUNCOES_COLABORADOR.has(funcao)) {
    const error = new Error("Funcao de colaborador invalida");
    error.status = 400;
    throw error;
  }

  return {
    nomeCompleto,
    documento,
    telefone,
    fotoIdentificacaoUrl,
    funcao,
    empresa,
    observacoes,
    podeAutorizarTerceiros,
  };
}

export async function listColaboradoresUnidadeService(usuario, filtros = {}) {
  const params = [];
  let where = " WHERE 1 = 1";

  if (usuario.perfil === "admin") {
    where += " AND c.admin_id = ?";
    params.push(usuario.id);

    if (filtros.condominio_id) {
      where += " AND cu.condominio_id = ?";
      params.push(filtros.condominio_id);
    }

    if (filtros.unidade_id) {
      where += " AND cu.unidade_id = ?";
      params.push(filtros.unidade_id);
    }
  } else if (usuario.perfil === "morador") {
    const contexto = await getMoradorContexto(usuario.id);
    where += " AND cu.condominio_id = ? AND cu.unidade_id = ?";
    params.push(contexto.condominio_id, contexto.unidade_id);
  } else {
    const error = new Error("Perfil sem permissao para listar colaboradores da unidade");
    error.status = 403;
    throw error;
  }

  if (filtros.status && STATUS_COLABORADOR.has(filtros.status)) {
    where += " AND cu.status = ?";
    params.push(filtros.status);
  }

  if (filtros.funcao && FUNCOES_COLABORADOR.has(filtros.funcao)) {
    where += " AND cu.funcao = ?";
    params.push(filtros.funcao);
  }

  const [rows] = await db.query(
    `
    SELECT
      cu.id,
      cu.condominio_id,
      cu.unidade_id,
      cu.nome_completo,
      cu.documento,
      cu.telefone,
      cu.foto_identificacao_url,
      cu.funcao,
      cu.empresa,
      cu.observacoes,
      cu.pode_autorizar_terceiros,
      cu.status,
      cu.cadastrado_por_usuario_id,
      cu.criado_em,
      cu.atualizado_em,
      c.nome_fantasia AS condominio_nome,
      u.identificacao AS unidade_identificacao,
      usr.nome_completo AS cadastrado_por_nome
    FROM colaboradores_unidade cu
    INNER JOIN condominios c ON c.id = cu.condominio_id
    INNER JOIN unidades u ON u.id = cu.unidade_id
    INNER JOIN usuarios usr ON usr.id = cu.cadastrado_por_usuario_id
    ${where}
    ORDER BY c.nome_fantasia ASC, u.identificacao ASC, cu.nome_completo ASC
    `,
    params,
  );

  return rows;
}

export async function createColaboradorUnidadeService(usuario, data) {
  const payload = parseColaboradorPayload(data);
  let contexto;

  if (usuario.perfil === "admin") {
    const condominioId = normalizeText(data.condominio_id);
    const unidadeId = normalizeText(data.unidade_id);

    if (!condominioId || !unidadeId) {
      const error = new Error("Condominio e unidade sao obrigatorios");
      error.status = 400;
      throw error;
    }

    contexto = await getAdminScopedUnit(usuario.id, condominioId, unidadeId);
  } else if (usuario.perfil === "morador") {
    contexto = await getMoradorContexto(usuario.id);
  } else {
    const error = new Error("Perfil sem permissao para criar colaborador da unidade");
    error.status = 403;
    throw error;
  }

  const id = uuidv4();

  await db.query(
    `
    INSERT INTO colaboradores_unidade
      (id, condominio_id, unidade_id, nome_completo, documento, telefone, foto_identificacao_url, funcao, empresa, observacoes, pode_autorizar_terceiros, status, cadastrado_por_usuario_id)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?)
    `,
    [
      id,
      contexto.condominio_id,
      contexto.unidade_id,
      payload.nomeCompleto,
      payload.documento || null,
      payload.telefone || null,
      payload.fotoIdentificacaoUrl || null,
      payload.funcao,
      payload.empresa || null,
      payload.observacoes || null,
      payload.podeAutorizarTerceiros ? 1 : 0,
      usuario.id,
    ],
  );

  return {
    colaborador: {
      id,
      condominio_id: contexto.condominio_id,
      unidade_id: contexto.unidade_id,
      nome_completo: payload.nomeCompleto,
      documento: payload.documento || null,
      telefone: payload.telefone || null,
      foto_identificacao_url: payload.fotoIdentificacaoUrl || null,
      funcao: payload.funcao,
      empresa: payload.empresa || null,
      observacoes: payload.observacoes || null,
      pode_autorizar_terceiros: payload.podeAutorizarTerceiros,
      status: "ativo",
    },
  };
}

export async function updateColaboradorUnidadeService(usuario, colaboradorId, data) {
  const colaborador = await getScopedColaborador(usuario, colaboradorId);
  const payload = parseColaboradorPayload(data);

  await db.query(
    `
    UPDATE colaboradores_unidade
    SET nome_completo = ?,
        documento = ?,
        telefone = ?,
        foto_identificacao_url = ?,
        funcao = ?,
        empresa = ?,
        observacoes = ?,
        pode_autorizar_terceiros = ?
    WHERE id = ?
    `,
    [
      payload.nomeCompleto,
      payload.documento || null,
      payload.telefone || null,
      payload.fotoIdentificacaoUrl || null,
      payload.funcao,
      payload.empresa || null,
      payload.observacoes || null,
      payload.podeAutorizarTerceiros ? 1 : 0,
      colaborador.id,
    ],
  );

  return {
    colaborador: {
      id: colaborador.id,
      nome_completo: payload.nomeCompleto,
      documento: payload.documento || null,
      telefone: payload.telefone || null,
      foto_identificacao_url: payload.fotoIdentificacaoUrl || null,
      funcao: payload.funcao,
      empresa: payload.empresa || null,
      observacoes: payload.observacoes || null,
      pode_autorizar_terceiros: payload.podeAutorizarTerceiros,
      status: colaborador.status,
    },
  };
}

export async function updateColaboradorUnidadeStatusService(usuario, colaboradorId, data) {
  const colaborador = await getScopedColaborador(usuario, colaboradorId);
  const status = normalizeText(data.status);

  if (!STATUS_COLABORADOR.has(status)) {
    const error = new Error("Status de colaborador invalido");
    error.status = 400;
    throw error;
  }

  await db.query(
    `
    UPDATE colaboradores_unidade
    SET status = ?
    WHERE id = ?
    `,
    [status, colaborador.id],
  );

  return {
    colaborador: {
      id: colaborador.id,
      status,
    },
  };
}
