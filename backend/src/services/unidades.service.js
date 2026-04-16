import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

const TIPOS_UNIDADE = new Set(["casa", "apartamento", "sala", "outro"]);
const MAX_UNIDADES_POR_ANDAR = 40;

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

function normalizeTipo(value) {
  const tipo = normalizeText(value);

  if (!tipo || !TIPOS_UNIDADE.has(tipo)) {
    return null;
  }

  return tipo;
}

function buildUnidadeKey(condominioId, torreId, identificacao) {
  if (torreId) {
    return `TORRE:${torreId}:${identificacao}`;
  }

  return `COND:${condominioId}:${identificacao}`;
}

function gerarIdentificacaoAutomatica(andar, sequencial, larguraSequencial) {
  return `${andar}${String(sequencial).padStart(larguraSequencial, "0")}`;
}

async function obterContextoCondominioEQuantidadeTorres(usuarioId, condominioId) {
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

  const [torresCountRows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM torres
    WHERE condominio_id = ? AND ativo = 1
    `,
    [condominioId],
  );

  return {
    condominio,
    quantidadeTorresAtivas: Number(torresCountRows[0]?.total || 0),
  };
}

async function obterTorreDoContexto(usuarioId, condominioId, torreId) {
  const [torreRows] = await db.query(
    `
    SELECT
      t.id,
      t.condominio_id,
      t.nome,
      t.ativo,
      t.andar_inicial,
      t.quantidade_andares,
      (t.andar_inicial + t.quantidade_andares - 1) AS andar_final
    FROM torres t
    INNER JOIN condominios c ON c.id = t.condominio_id
    WHERE t.id = ? AND t.condominio_id = ? AND c.admin_id = ?
    LIMIT 1
    `,
    [torreId, condominioId, usuarioId],
  );

  if (torreRows.length === 0) {
    const error = new Error("Torre invalida ou nao pertence ao condominio do admin logado");
    error.status = 404;
    throw error;
  }

  const torre = torreRows[0];

  if (Number(torre.ativo) !== 1) {
    const error = new Error("Torre inativa");
    error.status = 403;
    throw error;
  }

  return torre;
}

export async function listUnidadesService(usuarioId, filtros = {}) {
  const params = [usuarioId];
  let extraWhere = "";

  if (filtros.condominio_id) {
    extraWhere += " AND u.condominio_id = ?";
    params.push(filtros.condominio_id);
  }

  if (filtros.torre_id) {
    extraWhere += " AND u.torre_id = ?";
    params.push(filtros.torre_id);
  }

  const [rows] = await db.query(
    `
    SELECT
      u.id,
      u.condominio_id,
      c.nome_fantasia AS condominio_nome,
      u.torre_id,
      t.nome AS torre_nome,
      u.tipo,
      u.identificacao,
      u.andar,
      u.vaga,
      u.ativo,
      u.criado_em,
      u.atualizado_em
    FROM unidades u
    INNER JOIN condominios c ON c.id = u.condominio_id
    LEFT JOIN torres t ON t.id = u.torre_id
    WHERE c.admin_id = ?${extraWhere}
    ORDER BY c.nome_fantasia ASC, COALESCE(t.nome, '') ASC, u.andar ASC, u.identificacao ASC
    `,
    params,
  );

  return rows;
}

export async function createUnidadeService(usuarioId, data) {
  const condominioId = normalizeText(data.condominio_id);
  const torreId = normalizeText(data.torre_id);
  const tipo = normalizeTipo(data.tipo);
  const identificacao = normalizeText(data.identificacao);
  const andar = normalizeInteger(data.andar, null);
  const vaga = normalizeText(data.vaga);
  const ativo = normalizeStatus(data.ativo);

  if (!condominioId || !identificacao) {
    const error = new Error("Campos obrigatorios nao informados");
    error.status = 400;
    throw error;
  }

  if (!tipo) {
    const error = new Error("Tipo de unidade invalido");
    error.status = 400;
    throw error;
  }

  if (torreId && andar === null) {
    const error = new Error("Unidade vinculada a torre exige andar");
    error.status = 400;
    throw error;
  }

  if (andar !== null && andar < 0) {
    const error = new Error("O andar nao pode ser negativo");
    error.status = 400;
    throw error;
  }

  const { quantidadeTorresAtivas } = await obterContextoCondominioEQuantidadeTorres(
    usuarioId,
    condominioId,
  );

  if (tipo === "apartamento" && quantidadeTorresAtivas > 0 && !torreId) {
    const error = new Error(
      "Apartamento deve ser vinculado a uma torre quando o condominio possui torres cadastradas",
    );
    error.status = 400;
    throw error;
  }

  if (torreId) {
    await obterTorreDoContexto(usuarioId, condominioId, torreId);
  }

  const chaveUnicidade = buildUnidadeKey(condominioId, torreId, identificacao);

  const [existingRows] = await db.query(
    `
    SELECT id
    FROM unidades
    WHERE chave_unicidade = ?
    LIMIT 1
    `,
    [chaveUnicidade],
  );

  if (existingRows.length > 0) {
    const error = new Error("Ja existe uma unidade com esta identificacao neste contexto");
    error.status = 409;
    throw error;
  }

  const novoId = uuidv4();

  await db.query(
    `
    INSERT INTO unidades (
      id,
      condominio_id,
      torre_id,
      tipo,
      identificacao,
      andar,
      vaga,
      ativo,
      chave_unicidade
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      novoId,
      condominioId,
      torreId || null,
      tipo,
      identificacao,
      andar,
      vaga || null,
      ativo,
      chaveUnicidade,
    ],
  );

  return {
    id: novoId,
    condominio_id: condominioId,
    torre_id: torreId || null,
    tipo,
    identificacao,
    andar,
    vaga: vaga || null,
    ativo,
  };
}

export async function generateUnidadesByTowerService(usuarioId, data) {
  const condominioId = normalizeText(data.condominio_id);
  const torreId = normalizeText(data.torre_id);
  const tipo = normalizeTipo(data.tipo);
  const unidadesPorAndar = normalizeInteger(data.unidades_por_andar, null);
  const sequencialInicial = normalizeInteger(data.sequencial_inicial, 1);
  const ativo = normalizeStatus(data.ativo);

  if (!condominioId || !torreId) {
    const error = new Error("Condominio e torre sao obrigatorios para geracao");
    error.status = 400;
    throw error;
  }

  if (!tipo) {
    const error = new Error("Tipo de unidade invalido");
    error.status = 400;
    throw error;
  }

  if (!unidadesPorAndar || unidadesPorAndar < 1 || unidadesPorAndar > MAX_UNIDADES_POR_ANDAR) {
    const error = new Error(
      `Informe uma quantidade de unidades por andar entre 1 e ${MAX_UNIDADES_POR_ANDAR}`,
    );
    error.status = 400;
    throw error;
  }

  if (!sequencialInicial || sequencialInicial < 1) {
    const error = new Error("O sequencial inicial precisa ser maior ou igual a 1");
    error.status = 400;
    throw error;
  }

  await obterContextoCondominioEQuantidadeTorres(usuarioId, condominioId);
  const torre = await obterTorreDoContexto(usuarioId, condominioId, torreId);

  const andarInicio = normalizeInteger(data.andar_inicio, Number(torre.andar_inicial));
  const andarFim = normalizeInteger(data.andar_fim, Number(torre.andar_final));

  if (andarInicio < Number(torre.andar_inicial) || andarFim > Number(torre.andar_final)) {
    const error = new Error("A faixa de andares deve respeitar os limites da torre");
    error.status = 400;
    throw error;
  }

  if (andarFim < andarInicio) {
    const error = new Error("O andar final deve ser maior ou igual ao andar inicial");
    error.status = 400;
    throw error;
  }

  const larguraSequencial = Math.max(
    2,
    String(sequencialInicial + unidadesPorAndar - 1).length,
  );

  const unidadesParaCriar = [];

  for (let andar = andarInicio; andar <= andarFim; andar += 1) {
    for (let deslocamento = 0; deslocamento < unidadesPorAndar; deslocamento += 1) {
      const sequencial = sequencialInicial + deslocamento;
      const identificacao = gerarIdentificacaoAutomatica(
        andar,
        sequencial,
        larguraSequencial,
      );

      unidadesParaCriar.push({
        id: uuidv4(),
        condominio_id: condominioId,
        torre_id: torreId,
        tipo,
        identificacao,
        andar,
        vaga: null,
        ativo,
        chave_unicidade: buildUnidadeKey(condominioId, torreId, identificacao),
      });
    }
  }

  const [existingRows] = await db.query(
    `
    SELECT identificacao
    FROM unidades
    WHERE torre_id = ?
      AND chave_unicidade IN (?)
    ORDER BY identificacao ASC
    `,
    [torreId, unidadesParaCriar.map((item) => item.chave_unicidade)],
  );

  if (existingRows.length > 0) {
    const error = new Error("Ja existem unidades nesta faixa para a torre informada");
    error.status = 409;
    error.details = {
      total_existentes: existingRows.length,
      identificacoes: existingRows.slice(0, 10).map((row) => row.identificacao),
    };
    throw error;
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    for (const unidade of unidadesParaCriar) {
      await connection.query(
        `
        INSERT INTO unidades (
          id,
          condominio_id,
          torre_id,
          tipo,
          identificacao,
          andar,
          vaga,
          ativo,
          chave_unicidade
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          unidade.id,
          unidade.condominio_id,
          unidade.torre_id,
          unidade.tipo,
          unidade.identificacao,
          unidade.andar,
          unidade.vaga,
          unidade.ativo,
          unidade.chave_unicidade,
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    torre: {
      id: torre.id,
      nome: torre.nome,
      andar_inicial: Number(torre.andar_inicial),
      andar_final: Number(torre.andar_final),
    },
    configuracao: {
      tipo,
      unidades_por_andar: unidadesPorAndar,
      sequencial_inicial: sequencialInicial,
      andar_inicio: andarInicio,
      andar_fim: andarFim,
    },
    total_unidades_criadas: unidadesParaCriar.length,
    preview: {
      primeira: unidadesParaCriar[0]?.identificacao || null,
      ultima:
        unidadesParaCriar[unidadesParaCriar.length - 1]?.identificacao || null,
    },
  };
}
