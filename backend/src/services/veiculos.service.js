import db from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeBoolean(value, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (value === true || value === "true" || value === 1 || value === "1") {
    return 1;
  }

  return 0;
}

function normalizePlaca(value) {
  const normalized = normalizeText(value)?.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized || null;
}

async function getAdminScopedCondominio(adminUsuarioId, condominioId) {
  const [rows] = await db.query(
    `
    SELECT id, nome_fantasia, ativo
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
  const [rows] = await db.query(
    `
    SELECT
      u.id,
      u.identificacao,
      u.ativo,
      u.condominio_id
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

async function getAdminScopedMorador(adminUsuarioId, condominioId, unidadeId, usuarioId) {
  const [rows] = await db.query(
    `
    SELECT
      usr.id,
      usr.nome_completo,
      usr.status
    FROM usuarios usr
    INNER JOIN unidade_usuarios uu ON uu.usuario_id = usr.id AND uu.ativo = 1
    INNER JOIN unidades u ON u.id = uu.unidade_id
    INNER JOIN condominios c ON c.id = u.condominio_id
    WHERE usr.id = ?
      AND u.id = ?
      AND u.condominio_id = ?
      AND c.admin_id = ?
    LIMIT 1
    `,
    [usuarioId, unidadeId, condominioId, adminUsuarioId],
  );

  if (!rows.length) {
    const error = new Error("Usuario invalido ou nao vinculado a unidade informada");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

async function getAdminScopedVaga(adminUsuarioId, condominioId, vagaId) {
  if (!vagaId) return null;

  const [rows] = await db.query(
    `
    SELECT
      vg.id,
      vg.identificacao,
      vg.ativa
    FROM vagas_garagem vg
    INNER JOIN condominios c ON c.id = vg.condominio_id
    WHERE vg.id = ? AND vg.condominio_id = ? AND c.admin_id = ?
    LIMIT 1
    `,
    [vagaId, condominioId, adminUsuarioId],
  );

  if (!rows.length) {
    const error = new Error("Vaga invalida ou fora do escopo do admin logado");
    error.status = 404;
    throw error;
  }

  if (Number(rows[0].ativa) !== 1) {
    const error = new Error("Vaga inativa");
    error.status = 403;
    throw error;
  }

  return rows[0];
}

async function getCatalogContext(tipo, marcaId, modeloId, modeloAnoId) {
  const [marcaRows] = await db.query(
    `
    SELECT id, nome, tipo
    FROM veiculo_marcas
    WHERE id = ? AND tipo = ? AND ativo = 1
    LIMIT 1
    `,
    [marcaId, tipo],
  );

  if (!marcaRows.length) {
    const error = new Error("Marca invalida para o tipo informado");
    error.status = 400;
    throw error;
  }

  const marca = marcaRows[0];

  const [modeloRows] = await db.query(
    `
    SELECT id, nome, marca_id
    FROM veiculo_modelos
    WHERE id = ? AND marca_id = ? AND ativo = 1
    LIMIT 1
    `,
    [modeloId, marca.id],
  );

  if (!modeloRows.length) {
    const error = new Error("Modelo invalido para a marca informada");
    error.status = 400;
    throw error;
  }

  const modelo = modeloRows[0];

  const [anoRows] = await db.query(
    `
    SELECT id, ano_modelo, combustivel, modelo_id
    FROM veiculo_modelo_anos
    WHERE id = ? AND modelo_id = ? AND ativo = 1
    LIMIT 1
    `,
    [modeloAnoId, modelo.id],
  );

  if (!anoRows.length) {
    const error = new Error("Ano invalido para o modelo informado");
    error.status = 400;
    throw error;
  }

  return {
    marca,
    modelo,
    ano: anoRows[0],
  };
}

async function getAdminScopedVeiculo(adminUsuarioId, veiculoId) {
  const [rows] = await db.query(
    `
    SELECT
      v.id,
      v.condominio_id,
      v.unidade_id,
      v.usuario_id,
      v.vaga_id,
      v.placa,
      v.placa_normalizada,
      v.tipo,
      v.marca,
      v.modelo,
      v.cor,
      v.ano_modelo,
      v.observacoes,
      v.modo_acesso_preferencial,
      v.principal,
      v.status,
      vm.id AS marca_id,
      vmo.id AS modelo_id,
      vma.id AS modelo_ano_id
    FROM veiculos v
    INNER JOIN condominios c ON c.id = v.condominio_id
    LEFT JOIN veiculo_marcas vm
      ON vm.tipo = v.tipo
     AND vm.nome = v.marca
     AND vm.ativo = 1
    LEFT JOIN veiculo_modelos vmo
      ON vmo.marca_id = vm.id
     AND vmo.nome = v.modelo
     AND vmo.ativo = 1
    LEFT JOIN veiculo_modelo_anos vma
      ON vma.modelo_id = vmo.id
     AND vma.ano_modelo = v.ano_modelo
     AND vma.ativo = 1
    WHERE v.id = ? AND c.admin_id = ?
    LIMIT 1
    `,
    [veiculoId, adminUsuarioId],
  );

  if (!rows.length) {
    const error = new Error("Veiculo invalido ou fora do escopo do admin logado");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

export async function listVeiculosService(adminUsuarioId, filtros = {}) {
  const params = [adminUsuarioId];
  let extraWhere = "";

  if (filtros.condominio_id) {
    extraWhere += " AND v.condominio_id = ?";
    params.push(filtros.condominio_id);
  }

  if (filtros.unidade_id) {
    extraWhere += " AND v.unidade_id = ?";
    params.push(filtros.unidade_id);
  }

  if (filtros.usuario_id) {
    extraWhere += " AND v.usuario_id = ?";
    params.push(filtros.usuario_id);
  }

  if (filtros.status) {
    extraWhere += " AND v.status = ?";
    params.push(filtros.status);
  }

  if (filtros.placa) {
    extraWhere += " AND v.placa_normalizada LIKE ?";
    params.push(`%${normalizePlaca(filtros.placa) || ""}%`);
  }

  const [rows] = await db.query(
    `
    SELECT
      v.id,
      v.condominio_id,
      c.nome_fantasia AS condominio_nome,
      v.unidade_id,
      u.identificacao AS unidade_identificacao,
      v.usuario_id,
      usr.nome_completo AS usuario_nome,
      v.vaga_id,
      vg.identificacao AS vaga_identificacao,
      v.placa,
      v.placa_normalizada,
      v.tipo,
      v.marca,
      v.modelo,
      v.cor,
      v.ano_modelo,
      v.observacoes,
      v.modo_acesso_preferencial,
      v.qrcode_ativo,
      v.principal,
      v.status,
      v.criado_em,
      v.atualizado_em
    FROM veiculos v
    INNER JOIN condominios c ON c.id = v.condominio_id
    INNER JOIN unidades u ON u.id = v.unidade_id
    INNER JOIN usuarios usr ON usr.id = v.usuario_id
    LEFT JOIN vagas_garagem vg ON vg.id = v.vaga_id
    WHERE c.admin_id = ?${extraWhere}
    ORDER BY c.nome_fantasia ASC, u.identificacao ASC, usr.nome_completo ASC, v.placa ASC
    `,
    params,
  );

  return rows;
}

export async function getVeiculoByIdService(adminUsuarioId, veiculoId) {
  return getAdminScopedVeiculo(adminUsuarioId, veiculoId);
}

export async function listVeiculoMarcasService(tipo) {
  const normalizedTipo = normalizeText(tipo);

  if (!normalizedTipo) {
    const error = new Error("Informe o tipo do veiculo para listar as marcas");
    error.status = 400;
    throw error;
  }

  const [rows] = await db.query(
    `
    SELECT
      id,
      tipo,
      nome,
      codigo_referencia
    FROM veiculo_marcas
    WHERE tipo = ? AND ativo = 1
    ORDER BY nome ASC
    `,
    [normalizedTipo],
  );

  return rows;
}

export async function listVeiculoModelosService(marcaId) {
  const normalizedMarcaId = normalizeText(marcaId);

  if (!normalizedMarcaId) {
    const error = new Error("Informe a marca para listar os modelos");
    error.status = 400;
    throw error;
  }

  const [rows] = await db.query(
    `
    SELECT
      mo.id,
      mo.nome,
      mo.codigo_referencia,
      mo.marca_id,
      ma.nome AS marca_nome,
      ma.tipo
    FROM veiculo_modelos mo
    INNER JOIN veiculo_marcas ma ON ma.id = mo.marca_id
    WHERE mo.marca_id = ? AND mo.ativo = 1 AND ma.ativo = 1
    ORDER BY mo.nome ASC
    `,
    [normalizedMarcaId],
  );

  return rows;
}

export async function listVeiculoModeloAnosService(modeloId) {
  const normalizedModeloId = normalizeText(modeloId);

  if (!normalizedModeloId) {
    const error = new Error("Informe o modelo para listar os anos");
    error.status = 400;
    throw error;
  }

  const [rows] = await db.query(
    `
    SELECT
      va.id,
      va.modelo_id,
      va.ano_modelo,
      va.combustivel,
      va.codigo_referencia,
      mo.nome AS modelo_nome,
      ma.nome AS marca_nome,
      ma.tipo
    FROM veiculo_modelo_anos va
    INNER JOIN veiculo_modelos mo ON mo.id = va.modelo_id
    INNER JOIN veiculo_marcas ma ON ma.id = mo.marca_id
    WHERE va.modelo_id = ? AND va.ativo = 1 AND mo.ativo = 1 AND ma.ativo = 1
    ORDER BY va.ano_modelo DESC, va.combustivel ASC
    `,
    [normalizedModeloId],
  );

  return rows;
}

export async function createVeiculoService(adminUsuarioId, data) {
  const condominioId = normalizeText(data.condominio_id);
  const unidadeId = normalizeText(data.unidade_id);
  const usuarioId = normalizeText(data.usuario_id);
  const vagaId = normalizeText(data.vaga_id);
  const tipo = normalizeText(data.tipo);
  const marcaId = normalizeText(data.marca_id);
  const modeloId = normalizeText(data.modelo_id);
  const modeloAnoId = normalizeText(data.modelo_ano_id);
  const placaBruta = normalizeText(data.placa);
  const placaNormalizada = normalizePlaca(data.placa);
  const cor = normalizeText(data.cor);
  const observacoes = normalizeText(data.observacoes);
  const modoAcesso = normalizeText(data.modo_acesso_preferencial || "ambos");
  const principal = normalizeBoolean(data.principal, 0);

  if (
    !condominioId ||
    !unidadeId ||
    !usuarioId ||
    !tipo ||
    !marcaId ||
    !modeloId ||
    !modeloAnoId ||
    !placaBruta ||
    !placaNormalizada
  ) {
    const error = new Error("Campos obrigatorios do veiculo nao informados");
    error.status = 400;
    throw error;
  }

  if (!["placa", "qrcode", "ambos"].includes(modoAcesso)) {
    const error = new Error("Modo de acesso preferencial invalido");
    error.status = 400;
    throw error;
  }

  if (placaNormalizada.length < 7 || placaNormalizada.length > 10) {
    const error = new Error("Placa invalida");
    error.status = 400;
    throw error;
  }

  await getAdminScopedCondominio(adminUsuarioId, condominioId);
  await getAdminScopedUnidade(adminUsuarioId, condominioId, unidadeId);
  await getAdminScopedMorador(adminUsuarioId, condominioId, unidadeId, usuarioId);
  await getAdminScopedVaga(adminUsuarioId, condominioId, vagaId);

  const catalogo = await getCatalogContext(tipo, marcaId, modeloId, modeloAnoId);

  const [existingRows] = await db.query(
    `
    SELECT id
    FROM veiculos
    WHERE condominio_id = ? AND placa_normalizada = ?
    LIMIT 1
    `,
    [condominioId, placaNormalizada],
  );

  if (existingRows.length) {
    const error = new Error("Ja existe um veiculo com esta placa neste condominio");
    error.status = 409;
    throw error;
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    if (principal) {
      await connection.query(
        `
        UPDATE veiculos
        SET principal = 0
        WHERE unidade_id = ? AND usuario_id = ?
        `,
        [unidadeId, usuarioId],
      );
    }

    const veiculoId = uuidv4();

    await connection.query(
      `
      INSERT INTO veiculos
        (
          id,
          condominio_id,
          unidade_id,
          usuario_id,
          vaga_id,
          placa,
          placa_normalizada,
          tipo,
          marca,
          modelo,
          cor,
          ano_modelo,
          observacoes,
          modo_acesso_preferencial,
          principal,
          status
        )
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')
      `,
      [
        veiculoId,
        condominioId,
        unidadeId,
        usuarioId,
        vagaId || null,
        placaBruta.toUpperCase(),
        placaNormalizada,
        tipo,
        catalogo.marca.nome,
        catalogo.modelo.nome,
        cor || null,
        catalogo.ano.ano_modelo,
        observacoes || null,
        modoAcesso,
        principal,
      ],
    );

    await connection.commit();

    return {
      id: veiculoId,
      condominio_id: condominioId,
      unidade_id: unidadeId,
      usuario_id: usuarioId,
      vaga_id: vagaId || null,
      placa: placaBruta.toUpperCase(),
      placa_normalizada: placaNormalizada,
      tipo,
      marca: catalogo.marca.nome,
      modelo: catalogo.modelo.nome,
      ano_modelo: catalogo.ano.ano_modelo,
      cor: cor || null,
      observacoes: observacoes || null,
      modo_acesso_preferencial: modoAcesso,
      principal,
      status: "ativo",
    };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function updateVeiculoService(adminUsuarioId, veiculoId, data) {
  const veiculoAtual = await getAdminScopedVeiculo(adminUsuarioId, veiculoId);
  const condominioId = normalizeText(data.condominio_id || veiculoAtual.condominio_id);
  const unidadeId = normalizeText(data.unidade_id || veiculoAtual.unidade_id);
  const usuarioId = normalizeText(data.usuario_id || veiculoAtual.usuario_id);
  const vagaId = normalizeText(data.vaga_id);
  const tipo = normalizeText(data.tipo || veiculoAtual.tipo);
  const marcaId = normalizeText(data.marca_id || veiculoAtual.marca_id);
  const modeloId = normalizeText(data.modelo_id || veiculoAtual.modelo_id);
  const modeloAnoId = normalizeText(data.modelo_ano_id || veiculoAtual.modelo_ano_id);
  const placaBruta = normalizeText(data.placa || veiculoAtual.placa);
  const placaNormalizada = normalizePlaca(data.placa || veiculoAtual.placa_normalizada);
  const cor = normalizeText(data.cor);
  const observacoes = normalizeText(data.observacoes);
  const modoAcesso = normalizeText(
    data.modo_acesso_preferencial || veiculoAtual.modo_acesso_preferencial || "ambos",
  );
  const principal = normalizeBoolean(data.principal, veiculoAtual.principal ? 1 : 0);
  const status = normalizeText(data.status || veiculoAtual.status || "ativo");

  if (
    !condominioId ||
    !unidadeId ||
    !usuarioId ||
    !tipo ||
    !marcaId ||
    !modeloId ||
    !modeloAnoId ||
    !placaBruta ||
    !placaNormalizada
  ) {
    const error = new Error("Campos obrigatorios do veiculo nao informados");
    error.status = 400;
    throw error;
  }

  if (!["placa", "qrcode", "ambos"].includes(modoAcesso)) {
    const error = new Error("Modo de acesso preferencial invalido");
    error.status = 400;
    throw error;
  }

  if (!["ativo", "inativo", "bloqueado"].includes(status)) {
    const error = new Error("Status do veiculo invalido");
    error.status = 400;
    throw error;
  }

  if (placaNormalizada.length < 7 || placaNormalizada.length > 10) {
    const error = new Error("Placa invalida");
    error.status = 400;
    throw error;
  }

  await getAdminScopedCondominio(adminUsuarioId, condominioId);
  await getAdminScopedUnidade(adminUsuarioId, condominioId, unidadeId);
  await getAdminScopedMorador(adminUsuarioId, condominioId, unidadeId, usuarioId);
  await getAdminScopedVaga(adminUsuarioId, condominioId, vagaId);

  const catalogo = await getCatalogContext(tipo, marcaId, modeloId, modeloAnoId);

  const [existingRows] = await db.query(
    `
    SELECT id
    FROM veiculos
    WHERE condominio_id = ? AND placa_normalizada = ? AND id <> ?
    LIMIT 1
    `,
    [condominioId, placaNormalizada, veiculoId],
  );

  if (existingRows.length) {
    const error = new Error("Ja existe um veiculo com esta placa neste condominio");
    error.status = 409;
    throw error;
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    if (principal) {
      await connection.query(
        `
        UPDATE veiculos
        SET principal = 0
        WHERE unidade_id = ? AND usuario_id = ? AND id <> ?
        `,
        [unidadeId, usuarioId, veiculoId],
      );
    }

    await connection.query(
      `
      UPDATE veiculos
      SET
        condominio_id = ?,
        unidade_id = ?,
        usuario_id = ?,
        vaga_id = ?,
        placa = ?,
        placa_normalizada = ?,
        tipo = ?,
        marca = ?,
        modelo = ?,
        cor = ?,
        ano_modelo = ?,
        observacoes = ?,
        modo_acesso_preferencial = ?,
        principal = ?,
        status = ?
      WHERE id = ?
      `,
      [
        condominioId,
        unidadeId,
        usuarioId,
        vagaId || null,
        placaBruta.toUpperCase(),
        placaNormalizada,
        tipo,
        catalogo.marca.nome,
        catalogo.modelo.nome,
        cor || null,
        catalogo.ano.ano_modelo,
        observacoes || null,
        modoAcesso,
        principal,
        status,
        veiculoId,
      ],
    );

    await connection.commit();

    return {
      id: veiculoId,
      condominio_id: condominioId,
      unidade_id: unidadeId,
      usuario_id: usuarioId,
      vaga_id: vagaId || null,
      placa: placaBruta.toUpperCase(),
      placa_normalizada: placaNormalizada,
      tipo,
      marca: catalogo.marca.nome,
      modelo: catalogo.modelo.nome,
      ano_modelo: catalogo.ano.ano_modelo,
      cor: cor || null,
      observacoes: observacoes || null,
      modo_acesso_preferencial: modoAcesso,
      principal,
      status,
    };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
