import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const ORIGENS_OCORRENCIA = new Set(["morador", "admin", "funcionario"]);
const CATEGORIAS_OCORRENCIA = new Set([
  "eletrica",
  "hidraulica",
  "limpeza",
  "seguranca",
  "elevador",
  "area_comum",
  "portaria",
  "obra_manutencao",
  "administrativo",
  "outro",
]);
const PRIORIDADES_OCORRENCIA = new Set(["baixa", "media", "alta", "critica"]);
const STATUS_OCORRENCIA = new Set(["aberta", "em_analise", "em_atendimento", "concluida", "cancelada"]);
const TIPOS_EVENTO_OCORRENCIA = new Set([
  "abertura",
  "encaminhamento",
  "analise",
  "inicio_atendimento",
  "observacao",
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
const OCORRENCIAS_UPLOAD_DIR = path.join(FRONTEND_ROOT, "uploads", "ocorrencias");

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
    const error = new Error(`Limite de ${QUANTIDADE_MAX_ANEXOS} fotos por ocorrencia`);
    error.status = 400;
    throw error;
  }

  return anexos
    .filter(Boolean)
    .map((anexo, index) => {
      const nomeOriginal = normalizeText(anexo.nome_original || anexo.nome || `foto-${index + 1}`);
      const dataUrl = normalizeText(anexo.data_url || anexo.conteudo || anexo.base64);
      if (!dataUrl || !dataUrl.startsWith("data:")) {
        const error = new Error("Formato invalido de anexo");
        error.status = 400;
        throw error;
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        const error = new Error("Anexo em formato invalido");
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

      return {
        nomeOriginal,
        mimeType,
        extensao,
        buffer,
      };
    });
}

async function persistirAnexosOcorrencia(connection, {
  ocorrenciaId,
  condominioId,
  usuarioId,
  anexos,
}) {
  if (!anexos.length) return [];

  await fs.mkdir(OCORRENCIAS_UPLOAD_DIR, { recursive: true });
  const registros = [];

  for (const anexo of anexos) {
    const id = uuidv4();
    const nomeArquivo = `${ocorrenciaId}-${id}${anexo.extensao}`;
    const caminhoFisico = path.join(OCORRENCIAS_UPLOAD_DIR, nomeArquivo);
    const caminhoRelativo = `/uploads/ocorrencias/${nomeArquivo}`;

    await fs.writeFile(caminhoFisico, anexo.buffer);
    await connection.query(
      `
      INSERT INTO ocorrencias_anexos
        (id, ocorrencia_id, condominio_id, usuario_id, nome_original, nome_arquivo, mime_type, caminho_relativo, tamanho_bytes)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        ocorrenciaId,
        condominioId,
        usuarioId,
        anexo.nomeOriginal,
        nomeArquivo,
        anexo.mimeType,
        caminhoRelativo,
        anexo.buffer.length,
      ],
    );

    registros.push({
      id,
      nome_original: anexo.nomeOriginal,
      mime_type: anexo.mimeType,
      caminho_relativo: caminhoRelativo,
      tamanho_bytes: anexo.buffer.length,
    });
  }

  return registros;
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

async function validarUnidadeCondominio(condominioId, unidadeId) {
  if (!unidadeId) return null;

  const [rows] = await db.query(
    `
    SELECT id, condominio_id, identificacao
    FROM unidades
    WHERE id = ? AND condominio_id = ?
    LIMIT 1
    `,
    [unidadeId, condominioId],
  );

  if (!rows.length) {
    const error = new Error("Unidade invalida para o condominio informado");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

async function validarFuncionarioCondominio(condominioId, funcionarioId) {
  if (!funcionarioId) return null;

  const [rows] = await db.query(
    `
    SELECT
      f.id,
      f.condominio_id,
      f.area_atuacao,
      f.status,
      u.nome_completo AS funcionario_nome
    FROM funcionarios f
    INNER JOIN usuarios u ON u.id = f.usuario_id
    WHERE f.id = ? AND f.condominio_id = ?
    LIMIT 1
    `,
    [funcionarioId, condominioId],
  );

  if (!rows.length) {
    const error = new Error("Funcionario responsavel invalido para este condominio");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

function parseOcorrenciaPayload(data) {
  const origem = normalizeText(data.origem);
  const categoria = normalizeText(data.categoria);
  const titulo = normalizeText(data.titulo);
  const descricao = normalizeText(data.descricao);
  const localReferencia = normalizeText(data.local_referencia);
  const prioridade = normalizeText(data.prioridade || "media");
  const abertaEm = normalizeDateTime(data.aberta_em) || new Date();

  if (origem && !ORIGENS_OCORRENCIA.has(origem)) {
    const error = new Error("Origem da ocorrencia invalida");
    error.status = 400;
    throw error;
  }

  if (!categoria || !CATEGORIAS_OCORRENCIA.has(categoria)) {
    const error = new Error("Categoria da ocorrencia invalida");
    error.status = 400;
    throw error;
  }

  if (!titulo || !descricao) {
    const error = new Error("Titulo e descricao sao obrigatorios");
    error.status = 400;
    throw error;
  }

  if (!PRIORIDADES_OCORRENCIA.has(prioridade)) {
    const error = new Error("Prioridade da ocorrencia invalida");
    error.status = 400;
    throw error;
  }

  return {
    origem: origem || null,
    categoria,
    titulo,
    descricao,
    localReferencia,
    prioridade,
    abertaEm,
  };
}

function mapStatusToEventType(status) {
  if (status === "em_analise") return "analise";
  if (status === "em_atendimento") return "inicio_atendimento";
  if (status === "concluida") return "conclusao";
  if (status === "cancelada") return "cancelamento";
  return "observacao";
}

async function insertOcorrenciaEvento(connection, {
  ocorrenciaId,
  condominioId,
  usuarioId,
  funcionarioId = null,
  tipoEvento,
  statusResultante = null,
  descricaoEvento = null,
}) {
  if (!TIPOS_EVENTO_OCORRENCIA.has(tipoEvento)) {
    const error = new Error("Tipo de evento da ocorrencia invalido");
    error.status = 400;
    throw error;
  }

  await connection.query(
    `
    INSERT INTO ocorrencias_eventos
      (id, ocorrencia_id, condominio_id, usuario_id, funcionario_id, tipo_evento, status_resultante, descricao_evento)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuidv4(),
      ocorrenciaId,
      condominioId,
      usuarioId,
      funcionarioId,
      tipoEvento,
      statusResultante,
      descricaoEvento,
    ],
  );
}

async function getScopedOcorrencia(usuario, ocorrenciaId) {
  const params = [ocorrenciaId];
  let where = " WHERE o.id = ?";

  if (usuario.perfil === "admin") {
    where += " AND c.admin_id = ?";
    params.push(usuario.id);
  } else if (usuario.perfil === "funcionario") {
    const contexto = await getFuncionarioContexto(usuario.id);
    where += " AND o.condominio_id = ?";
    params.push(contexto.condominio_id);
  } else if (usuario.perfil === "morador") {
    const contexto = await getMoradorContexto(usuario.id);
    where += " AND o.condominio_id = ? AND o.aberto_por_usuario_id = ?";
    params.push(contexto.condominio_id, usuario.id);
  } else {
    const error = new Error("Perfil sem permissao para acessar ocorrencias");
    error.status = 403;
    throw error;
  }

  const [rows] = await db.query(
    `
    SELECT
      o.*,
      c.nome_fantasia AS condominio_nome,
      u.identificacao AS unidade_identificacao,
      ua.nome_completo AS aberto_por_nome,
      ur.nome_completo AS responsavel_nome
    FROM ocorrencias o
    INNER JOIN condominios c ON c.id = o.condominio_id
    LEFT JOIN unidades u ON u.id = o.unidade_id
    INNER JOIN usuarios ua ON ua.id = o.aberto_por_usuario_id
    LEFT JOIN funcionarios fr ON fr.id = o.funcionario_responsavel_id
    LEFT JOIN usuarios ur ON ur.id = fr.usuario_id
    ${where}
    LIMIT 1
    `,
    params,
  );

  if (!rows.length) {
    const error = new Error("Ocorrencia nao encontrada no escopo informado");
    error.status = 404;
    throw error;
  }

  return rows[0];
}

export async function listOcorrenciasService(usuario, filtros = {}) {
  const params = [];
  let where = " WHERE 1 = 1";

  if (usuario.perfil === "admin") {
    where += " AND c.admin_id = ?";
    params.push(usuario.id);

    if (filtros.condominio_id) {
      where += " AND o.condominio_id = ?";
      params.push(filtros.condominio_id);
    }
  } else if (usuario.perfil === "funcionario") {
    const contexto = await getFuncionarioContexto(usuario.id);
    where += " AND o.condominio_id = ?";
    params.push(contexto.condominio_id);
  } else if (usuario.perfil === "morador") {
    const contexto = await getMoradorContexto(usuario.id);
    where += " AND o.condominio_id = ? AND o.aberto_por_usuario_id = ?";
    params.push(contexto.condominio_id, usuario.id);
  } else {
    const error = new Error("Perfil sem permissao para listar ocorrencias");
    error.status = 403;
    throw error;
  }

  if (filtros.categoria && CATEGORIAS_OCORRENCIA.has(filtros.categoria)) {
    where += " AND o.categoria = ?";
    params.push(filtros.categoria);
  }

  if (filtros.status && STATUS_OCORRENCIA.has(filtros.status)) {
    where += " AND o.status = ?";
    params.push(filtros.status);
  }

  if (filtros.prioridade && PRIORIDADES_OCORRENCIA.has(filtros.prioridade)) {
    where += " AND o.prioridade = ?";
    params.push(filtros.prioridade);
  }

  if (filtros.unidade_id) {
    where += " AND o.unidade_id = ?";
    params.push(filtros.unidade_id);
  }

  if (filtros.de) {
    where += " AND DATE(o.aberta_em) >= DATE(?)";
    params.push(filtros.de);
  }

  if (filtros.ate) {
    where += " AND DATE(o.aberta_em) <= DATE(?)";
    params.push(filtros.ate);
  }

  const [rows] = await db.query(
    `
    SELECT
      o.id,
      o.condominio_id,
      o.unidade_id,
      o.aberto_por_usuario_id,
      o.funcionario_responsavel_id,
      o.origem,
      o.categoria,
      o.titulo,
      o.descricao,
      o.local_referencia,
      o.prioridade,
      o.status,
      o.aberta_em,
      o.concluida_em,
      o.criado_em,
      o.atualizado_em,
      c.nome_fantasia AS condominio_nome,
      u.identificacao AS unidade_identificacao,
      ua.nome_completo AS aberto_por_nome,
      ur.nome_completo AS responsavel_nome
    FROM ocorrencias o
    INNER JOIN condominios c ON c.id = o.condominio_id
    LEFT JOIN unidades u ON u.id = o.unidade_id
    INNER JOIN usuarios ua ON ua.id = o.aberto_por_usuario_id
    LEFT JOIN funcionarios fr ON fr.id = o.funcionario_responsavel_id
    LEFT JOIN usuarios ur ON ur.id = fr.usuario_id
    ${where}
    ORDER BY
      FIELD(o.prioridade, 'critica', 'alta', 'media', 'baixa'),
      FIELD(o.status, 'aberta', 'em_analise', 'em_atendimento', 'concluida', 'cancelada'),
      o.aberta_em DESC
    `,
    params,
  );

  return rows;
}

export async function createOcorrenciaService(usuario, data) {
  const payload = parseOcorrenciaPayload(data);
  const anexos = parseAnexosPayload(data.anexos);
  let condominioId = normalizeText(data.condominio_id);
  let unidadeId = normalizeText(data.unidade_id);
  const semUnidade = normalizeBoolean(data.sem_unidade);
  let origem = payload.origem;
  let funcionarioContexto = null;

  if (usuario.perfil === "morador") {
    const contexto = await getMoradorContexto(usuario.id);
    condominioId = contexto.condominio_id;
    unidadeId = semUnidade ? null : (unidadeId || contexto.unidade_id);
    origem = "morador";
  } else if (usuario.perfil === "admin") {
    if (!condominioId) {
      const error = new Error("Condominio e obrigatorio");
      error.status = 400;
      throw error;
    }
    await validarCondominioAdmin(usuario.id, condominioId);
    origem = "admin";
  } else if (usuario.perfil === "funcionario") {
    funcionarioContexto = await getFuncionarioContexto(usuario.id);
    condominioId = funcionarioContexto.condominio_id;
    if (semUnidade) unidadeId = null;
    origem = "funcionario";
  } else {
    const error = new Error("Perfil sem permissao para abrir ocorrencia");
    error.status = 403;
    throw error;
  }

  const unidade = await validarUnidadeCondominio(condominioId, unidadeId);
  const funcionarioResponsavel = await validarFuncionarioCondominio(condominioId, normalizeText(data.funcionario_responsavel_id));
  const id = uuidv4();

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
      INSERT INTO ocorrencias
        (id, condominio_id, unidade_id, aberto_por_usuario_id, funcionario_responsavel_id, origem, categoria, titulo, descricao, local_referencia, prioridade, status, aberta_em)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aberta', ?)
      `,
      [
        id,
        condominioId,
        unidade?.id || null,
        usuario.id,
        funcionarioResponsavel?.id || null,
        origem,
        payload.categoria,
        payload.titulo,
        payload.descricao,
        payload.localReferencia || null,
        payload.prioridade,
        payload.abertaEm,
      ],
    );

    await insertOcorrenciaEvento(connection, {
      ocorrenciaId: id,
      condominioId,
      usuarioId: usuario.id,
      funcionarioId: funcionarioContexto?.funcionario_id || null,
      tipoEvento: "abertura",
      statusResultante: "aberta",
      descricaoEvento: payload.descricao,
    });

    if (funcionarioResponsavel?.id) {
      await insertOcorrenciaEvento(connection, {
        ocorrenciaId: id,
        condominioId,
        usuarioId: usuario.id,
        funcionarioId: funcionarioResponsavel.id,
        tipoEvento: "encaminhamento",
        statusResultante: "aberta",
        descricaoEvento: `Responsavel inicial: ${funcionarioResponsavel.funcionario_nome}`,
      });
    }

    const anexosPersistidos = await persistirAnexosOcorrencia(connection, {
      ocorrenciaId: id,
      condominioId,
      usuarioId: usuario.id,
      anexos,
    });

    await connection.commit();

    return {
      ocorrencia: {
        id,
        condominio_id: condominioId,
        unidade_id: unidade?.id || null,
        funcionario_responsavel_id: funcionarioResponsavel?.id || null,
        origem,
        categoria: payload.categoria,
        titulo: payload.titulo,
        descricao: payload.descricao,
        local_referencia: payload.localReferencia || null,
        prioridade: payload.prioridade,
        status: "aberta",
        aberta_em: payload.abertaEm,
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

export async function updateOcorrenciaService(usuario, ocorrenciaId, data) {
  if (!["admin", "funcionario"].includes(usuario.perfil)) {
    const error = new Error("Perfil sem permissao para atualizar ocorrencia");
    error.status = 403;
    throw error;
  }

  const ocorrencia = await getScopedOcorrencia(usuario, ocorrenciaId);
  const categoria = normalizeText(data.categoria || ocorrencia.categoria);
  const titulo = normalizeText(data.titulo || ocorrencia.titulo);
  const descricao = normalizeText(data.descricao || ocorrencia.descricao);
  const localReferencia = normalizeText(
    Object.prototype.hasOwnProperty.call(data, "local_referencia")
      ? data.local_referencia
      : ocorrencia.local_referencia,
  );
  const prioridade = normalizeText(data.prioridade || ocorrencia.prioridade);
  const unidadeId = normalizeText(
    Object.prototype.hasOwnProperty.call(data, "unidade_id") ? data.unidade_id : ocorrencia.unidade_id,
  );

  if (!CATEGORIAS_OCORRENCIA.has(categoria)) {
    const error = new Error("Categoria da ocorrencia invalida");
    error.status = 400;
    throw error;
  }

  if (!PRIORIDADES_OCORRENCIA.has(prioridade)) {
    const error = new Error("Prioridade da ocorrencia invalida");
    error.status = 400;
    throw error;
  }

  const unidade = await validarUnidadeCondominio(ocorrencia.condominio_id, unidadeId);

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE ocorrencias
      SET categoria = ?,
          titulo = ?,
          descricao = ?,
          local_referencia = ?,
          prioridade = ?,
          unidade_id = ?
      WHERE id = ?
      `,
      [
        categoria,
        titulo,
        descricao,
        localReferencia || null,
        prioridade,
        unidade?.id || null,
        ocorrencia.id,
      ],
    );

    await insertOcorrenciaEvento(connection, {
      ocorrenciaId: ocorrencia.id,
      condominioId: ocorrencia.condominio_id,
      usuarioId: usuario.id,
      funcionarioId: usuario.perfil === "funcionario" ? (await getFuncionarioContexto(usuario.id)).funcionario_id : null,
      tipoEvento: "reclassificacao",
      statusResultante: ocorrencia.status,
      descricaoEvento: "Dados principais da ocorrencia atualizados",
    });

    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }

  return { sucesso: true };
}

export async function updateOcorrenciaStatusService(usuario, ocorrenciaId, data) {
  if (!["admin", "funcionario"].includes(usuario.perfil)) {
    const error = new Error("Perfil sem permissao para atualizar status da ocorrencia");
    error.status = 403;
    throw error;
  }

  const ocorrencia = await getScopedOcorrencia(usuario, ocorrenciaId);
  const status = normalizeText(data.status);
  const descricaoEvento = normalizeText(data.descricao_evento || data.observacao);

  if (!STATUS_OCORRENCIA.has(status)) {
    const error = new Error("Status da ocorrencia invalido");
    error.status = 400;
    throw error;
  }

  const tipoEvento = mapStatusToEventType(status);
  const funcionarioId = usuario.perfil === "funcionario" ? (await getFuncionarioContexto(usuario.id)).funcionario_id : null;

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE ocorrencias
      SET status = ?,
          concluida_em = CASE WHEN ? = 'concluida' THEN NOW() ELSE NULL END
      WHERE id = ?
      `,
      [status, status, ocorrencia.id],
    );

    await insertOcorrenciaEvento(connection, {
      ocorrenciaId: ocorrencia.id,
      condominioId: ocorrencia.condominio_id,
      usuarioId: usuario.id,
      funcionarioId,
      tipoEvento,
      statusResultante: status,
      descricaoEvento: descricaoEvento || `Status alterado para ${status}`,
    });

    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }

  return { sucesso: true, status };
}

export async function updateOcorrenciaResponsavelService(usuario, ocorrenciaId, data) {
  if (usuario.perfil !== "admin") {
    const error = new Error("Somente admin pode atribuir responsavel");
    error.status = 403;
    throw error;
  }

  const ocorrencia = await getScopedOcorrencia(usuario, ocorrenciaId);
  const funcionario = await validarFuncionarioCondominio(ocorrencia.condominio_id, normalizeText(data.funcionario_responsavel_id));
  const descricaoEvento = normalizeText(data.descricao_evento);

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE ocorrencias
      SET funcionario_responsavel_id = ?
      WHERE id = ?
      `,
      [funcionario?.id || null, ocorrencia.id],
    );

    await insertOcorrenciaEvento(connection, {
      ocorrenciaId: ocorrencia.id,
      condominioId: ocorrencia.condominio_id,
      usuarioId: usuario.id,
      funcionarioId: funcionario?.id || null,
      tipoEvento: "encaminhamento",
      statusResultante: ocorrencia.status,
      descricaoEvento: descricaoEvento || (funcionario ? `Responsavel definido: ${funcionario.funcionario_nome}` : "Responsavel removido"),
    });

    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }

  return {
    sucesso: true,
    funcionario_responsavel_id: funcionario?.id || null,
  };
}

export async function getOcorrenciaHistoricoService(usuario, ocorrenciaId) {
  const ocorrencia = await getScopedOcorrencia(usuario, ocorrenciaId);

  const [eventos] = await db.query(
    `
    SELECT
      oe.id,
      oe.tipo_evento,
      oe.status_resultante,
      oe.descricao_evento,
      oe.criado_em,
      uu.nome_completo AS usuario_nome,
      uf.nome_completo AS funcionario_nome
    FROM ocorrencias_eventos oe
    INNER JOIN usuarios uu ON uu.id = oe.usuario_id
    LEFT JOIN funcionarios f ON f.id = oe.funcionario_id
    LEFT JOIN usuarios uf ON uf.id = f.usuario_id
    WHERE oe.ocorrencia_id = ?
    ORDER BY oe.criado_em ASC
    `,
    [ocorrencia.id],
  );

  const [anexos] = await db.query(
    `
    SELECT
      id,
      nome_original,
      nome_arquivo,
      mime_type,
      caminho_relativo,
      tamanho_bytes,
      criado_em
    FROM ocorrencias_anexos
    WHERE ocorrencia_id = ?
    ORDER BY criado_em ASC
    `,
    [ocorrencia.id],
  );

  return {
    ocorrencia,
    eventos,
    anexos,
  };
}
