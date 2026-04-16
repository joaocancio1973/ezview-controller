import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const TIPOS_MENSAGEM = new Set(["mensagem", "aviso", "comunicado", "financeiro", "sistema"]);
const PRIORIDADES = new Set(["baixa", "media", "alta", "urgente"]);
const ACOES_REQUERIDAS = new Set(["nenhuma", "ciencia", "confirmar_pagamento", "revisar", "aprovar", "responder"]);
const STATUS_DESTINATARIO = new Set(["nao_lido", "lido", "acionado", "resolvido", "arquivado"]);
const MIME_EXTENSOES_ARQUIVO = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/plain": ".txt",
};
const MIME_CATEGORIA_ARQUIVO = {
  "image/jpeg": "imagem",
  "image/png": "imagem",
  "image/webp": "imagem",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "doc",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xls",
  "text/plain": "outro",
};
const QUANTIDADE_MAX_ANEXOS_MENSAGEM = 3;
const TAMANHO_MAX_ARQUIVO_BYTES = 4 * 1024 * 1024;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "../../../frontend");
const MENSAGENS_UPLOAD_DIR = path.join(FRONTEND_ROOT, "uploads", "mensagens");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeTipo(value, fallback = "mensagem") {
  const normalized = normalizeText(value);
  return TIPOS_MENSAGEM.has(normalized) ? normalized : fallback;
}

function normalizePrioridade(value, fallback = "media") {
  const normalized = normalizeText(value);
  return PRIORIDADES.has(normalized) ? normalized : fallback;
}

function normalizeAcao(value, fallback = "nenhuma") {
  const normalized = normalizeText(value);
  return ACOES_REQUERIDAS.has(normalized) ? normalized : fallback;
}

function normalizeCaixa(value) {
  const normalized = normalizeText(value);
  return ["entrada", "enviadas", "respondidas", "arquivadas"].includes(normalized) ? normalized : "entrada";
}

function parseMetadata(metadata) {
  if (!metadata) return null;
  if (typeof metadata === "string") return metadata;
  try {
    return JSON.stringify(metadata);
  } catch {
    return null;
  }
}

function parseMensagemAnexosPayload(rawAnexos) {
  if (!rawAnexos) return [];

  const anexos = Array.isArray(rawAnexos) ? rawAnexos : [rawAnexos];
  if (anexos.length > QUANTIDADE_MAX_ANEXOS_MENSAGEM) {
    const error = new Error(`Limite de ${QUANTIDADE_MAX_ANEXOS_MENSAGEM} anexos por mensagem`);
    error.status = 400;
    throw error;
  }

  return anexos
    .filter(Boolean)
    .map((anexo, index) => {
      const nomeOriginal = normalizeText(anexo.nome_original || anexo.nome || `arquivo-${index + 1}`);
      const dataUrl = normalizeText(anexo.data_url || anexo.conteudo || anexo.base64);
      if (!dataUrl || !dataUrl.startsWith("data:")) {
        const error = new Error("Formato invalido de anexo da mensagem");
        error.status = 400;
        throw error;
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        const error = new Error("Arquivo anexado em formato invalido");
        error.status = 400;
        throw error;
      }

      const mimeType = match[1];
      const base64 = match[2];
      const extensao = MIME_EXTENSOES_ARQUIVO[mimeType];
      if (!extensao) {
        const error = new Error("Anexe somente imagem, PDF, Word, Excel ou TXT");
        error.status = 400;
        throw error;
      }

      const buffer = Buffer.from(base64, "base64");
      if (!buffer.length || buffer.length > TAMANHO_MAX_ARQUIVO_BYTES) {
        const error = new Error("Cada anexo deve ter no maximo 4 MB");
        error.status = 400;
        throw error;
      }

      return {
        nomeOriginal,
        mimeType,
        categoriaTipo: MIME_CATEGORIA_ARQUIVO[mimeType] || "outro",
        extensao,
        buffer,
      };
    });
}

async function persistirArquivosMensagem(connection, { mensagemId, anexos }) {
  if (!anexos.length) return [];

  await fs.mkdir(MENSAGENS_UPLOAD_DIR, { recursive: true });
  const registros = [];

  for (const anexo of anexos) {
    const arquivoId = uuidv4();
    const nomeArquivo = `${mensagemId}-${arquivoId}${anexo.extensao}`;
    const caminhoFisico = path.join(MENSAGENS_UPLOAD_DIR, nomeArquivo);
    const caminhoRelativo = `/uploads/mensagens/${nomeArquivo}`;

    await fs.writeFile(caminhoFisico, anexo.buffer);
    await connection.query(
      `
      INSERT INTO mensagem_arquivos
        (id, mensagem_id, arquivo_nome, arquivo_url, tipo)
      VALUES
        (?, ?, ?, ?, ?)
      `,
      [arquivoId, mensagemId, anexo.nomeOriginal, caminhoRelativo, anexo.categoriaTipo],
    );

    registros.push({
      id: arquivoId,
      arquivo_nome: anexo.nomeOriginal,
      arquivo_url: caminhoRelativo,
      tipo: anexo.categoriaTipo,
      mime_type: anexo.mimeType,
    });
  }

  return registros;
}

export async function getCondominioScopeForUser(usuario) {
  if (usuario.perfil === "admin") {
    const [rows] = await db.query(
      `
      SELECT id AS condominio_id, nome_fantasia AS condominio_nome
      FROM condominios
      WHERE admin_id = ?
      ORDER BY criado_em ASC
      LIMIT 1
      `,
      [usuario.id],
    );

    if (!rows.length) {
      const error = new Error("Admin sem condominio ativo para mensagens");
      error.status = 404;
      throw error;
    }

    return rows[0];
  }

  if (usuario.perfil === "morador") {
    const [rows] = await db.query(
      `
      SELECT
        u.condominio_id,
        c.nome_fantasia AS condominio_nome
      FROM unidade_usuarios uu
      INNER JOIN unidades u ON u.id = uu.unidade_id
      INNER JOIN condominios c ON c.id = u.condominio_id
      WHERE uu.usuario_id = ? AND uu.ativo = 1
      ORDER BY FIELD(uu.papel, 'titular','proprietario','dependente'), uu.criado_em ASC
      LIMIT 1
      `,
      [usuario.id],
    );

    if (!rows.length) {
      const error = new Error("Morador sem condominio ativo para mensagens");
      error.status = 404;
      throw error;
    }

    return rows[0];
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
      const error = new Error("Funcionario sem condominio ativo para mensagens");
      error.status = 404;
      throw error;
    }

    return rows[0];
  }

  const error = new Error("Perfil sem permissao para acessar mensagens");
  error.status = 403;
  throw error;
}

export async function createMensagemInternaService({
  condominioId,
  remetenteId,
  criadoPorTipo = "sistema",
  tipo = "sistema",
  categoriaEvento = null,
  entidadeTipo = null,
  entidadeId = null,
  mensagemPaiId = null,
  titulo,
  conteudo = null,
  prioridade = "media",
  acaoRequerida = "nenhuma",
  metadados = null,
  destinatarios = [],
  anexos = [],
}) {
  const tituloNormalizado = normalizeText(titulo);
  if (!condominioId || !remetenteId || !tituloNormalizado || !Array.isArray(destinatarios) || !destinatarios.length) {
    const error = new Error("Mensagem interna sem dados minimos");
    error.status = 400;
    throw error;
  }

  const mensagemId = uuidv4();
  const destinatariosUnicos = [...new Set(destinatarios.filter(Boolean))];
  const metadataString = parseMetadata(metadados);
  const anexosNormalizados = parseMensagemAnexosPayload(anexos);

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `
      INSERT INTO mensagens
        (id, condominio_id, remetente_id, criado_por_tipo, tipo, categoria_evento, entidade_tipo, entidade_id, mensagem_pai_id, titulo, conteudo, prioridade, status, acao_requerida, metadados_json)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?, ?)
      `,
      [
        mensagemId,
        condominioId,
        remetenteId,
        criadoPorTipo,
        normalizeTipo(tipo, "sistema"),
        normalizeText(categoriaEvento),
        normalizeText(entidadeTipo),
        normalizeText(entidadeId),
        normalizeText(mensagemPaiId),
        tituloNormalizado,
        normalizeText(conteudo),
        normalizePrioridade(prioridade),
        normalizeAcao(acaoRequerida),
        metadataString,
      ],
    );

    for (const usuarioId of destinatariosUnicos) {
      await connection.query(
        `
        INSERT INTO mensagem_destinatarios
          (id, mensagem_id, usuario_id, status_destinatario, lido, arquivado)
        VALUES
          (?, ?, ?, 'nao_lido', 0, 0)
        `,
        [uuidv4(), mensagemId, usuarioId],
      );
    }

    await persistirArquivosMensagem(connection, {
      mensagemId,
      anexos: anexosNormalizados,
    });

    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }

  return { id: mensagemId };
}

export async function listMensagensService(usuario, filtros = {}) {
  const caixa = normalizeCaixa(filtros.caixa);
  const scope = await getCondominioScopeForUser(usuario);
  const condominioId = normalizeText(filtros.condominio_id) || scope.condominio_id;
  const tipo = normalizeText(filtros.tipo);

  const params = [usuario.id];
  let where = " WHERE m.condominio_id = ? ";
  const whereParams = [condominioId];
  let joins = "";

  if (caixa === "entrada" || caixa === "arquivadas") {
    joins += " INNER JOIN mensagem_destinatarios md ON md.mensagem_id = m.id AND md.usuario_id = ? ";
    params.push(usuario.id);
    where += caixa === "arquivadas" ? " AND md.arquivado = 1 " : " AND md.arquivado = 0 ";
  } else {
    where += " AND m.remetente_id = ? ";
    whereParams.push(usuario.id);
    if (caixa === "respondidas") {
      where += " AND m.mensagem_pai_id IS NOT NULL ";
    }
  }

  if (tipo && TIPOS_MENSAGEM.has(tipo)) {
    where += " AND m.tipo = ? ";
    whereParams.push(tipo);
  }

  const [rows] = await db.query(
    `
    SELECT
      m.id,
      m.condominio_id,
      c.nome_fantasia AS condominio_nome,
      m.remetente_id,
      ur.nome_completo AS remetente_nome,
      ur.perfil AS remetente_perfil,
      m.criado_por_tipo,
      m.tipo,
      m.categoria_evento,
      m.entidade_tipo,
      m.entidade_id,
      m.mensagem_pai_id,
      m.titulo,
      m.conteudo,
      m.prioridade,
      m.status,
      m.acao_requerida,
      m.metadados_json,
      m.criado_em,
      m.atualizado_em,
      md_ctx.status_destinatario,
      md_ctx.lido,
      md_ctx.lido_em,
      md_ctx.acao_em,
      md_ctx.arquivado,
      md_ctx.arquivado_em
    FROM mensagens m
    INNER JOIN condominios c ON c.id = m.condominio_id
    INNER JOIN usuarios ur ON ur.id = m.remetente_id
    LEFT JOIN mensagem_destinatarios md_ctx ON md_ctx.mensagem_id = m.id AND md_ctx.usuario_id = ?
    ${joins}
    ${where}
    ORDER BY COALESCE(md_ctx.acao_em, md_ctx.lido_em, m.atualizado_em, m.criado_em) DESC, m.criado_em DESC
    `,
    [...params, ...whereParams],
  );

  return rows;
}

export async function listMensagemDestinatariosService(usuario, filtros = {}) {
  const scope = await getCondominioScopeForUser(usuario);
  const condominioId = normalizeText(filtros.condominio_id) || scope.condominio_id;
  const includeUsuarioId = normalizeText(filtros.include_usuario_id);

  const [adminRows] = await db.query(
    `
    SELECT
      u.id,
      u.nome_completo,
      u.email,
      u.perfil,
      'admin' AS origem,
      NULL AS area_atuacao
    FROM condominios c
    INNER JOIN usuarios u ON u.id = c.admin_id
    WHERE c.id = ?
    `,
    [condominioId],
  );

  const [funcionarioRows] = await db.query(
    `
    SELECT
      u.id,
      u.nome_completo,
      u.email,
      u.perfil,
      'funcionario' AS origem,
      f.area_atuacao
    FROM funcionarios f
    INNER JOIN usuarios u ON u.id = f.usuario_id
    WHERE f.condominio_id = ?
      AND f.status = 'ativo'
      AND u.status = 'ativo'
    ORDER BY u.nome_completo ASC
    `,
    [condominioId],
  );

  let moradores = [];
  if (usuario.perfil === "admin") {
    const [moradorRows] = await db.query(
      `
      SELECT DISTINCT
        u.id,
        u.nome_completo,
        u.email,
        u.perfil,
        'morador' AS origem,
        NULL AS area_atuacao
      FROM unidade_usuarios uu
      INNER JOIN unidades un ON un.id = uu.unidade_id
      INNER JOIN usuarios u ON u.id = uu.usuario_id
      WHERE un.condominio_id = ?
        AND uu.ativo = 1
        AND u.status = 'ativo'
      ORDER BY u.nome_completo ASC
      `,
      [condominioId],
    );
    moradores = moradorRows;
  }

  let all = [...adminRows, ...funcionarioRows, ...moradores]
    .filter((item) => item.id !== usuario.id)
    .reduce((acc, item) => {
      if (!acc.some((current) => current.id === item.id)) acc.push(item);
      return acc;
    }, []);

  if (usuario.perfil === "morador") {
    all = all.filter((item) => {
      if (item.origem === "admin") return true;
      if (item.origem !== "funcionario") return false;
      return ["portaria", "administrativo", "manutencao"].includes(item.area_atuacao);
    });
  }

  if (includeUsuarioId && !all.some((item) => item.id === includeUsuarioId)) {
    const [extraRows] = await db.query(
      `
      SELECT DISTINCT
        u.id,
        u.nome_completo,
        u.email,
        u.perfil,
        CASE
          WHEN f.id IS NOT NULL THEN 'funcionario'
          WHEN c.admin_id = u.id THEN 'admin'
          ELSE 'morador'
        END AS origem,
        f.area_atuacao
      FROM usuarios u
      LEFT JOIN funcionarios f
        ON f.usuario_id = u.id
       AND f.condominio_id = ?
       AND f.status = 'ativo'
      LEFT JOIN unidade_usuarios uu
        ON uu.usuario_id = u.id
       AND uu.ativo = 1
      LEFT JOIN unidades un
        ON un.id = uu.unidade_id
       AND un.condominio_id = ?
      LEFT JOIN condominios c
        ON c.id = ?
      WHERE u.id = ?
        AND u.status = 'ativo'
        AND (
          f.id IS NOT NULL
          OR c.admin_id = u.id
          OR un.id IS NOT NULL
        )
      LIMIT 1
      `,
      [condominioId, condominioId, condominioId, includeUsuarioId],
    );

    if (extraRows.length) {
      all.push(extraRows[0]);
    }
  }

  return all.map((item) => ({
    ...item,
    grupo_destino:
      item.origem === "admin"
        ? "administracao"
        : item.area_atuacao === "portaria"
          ? "portaria"
          : item.area_atuacao === "administrativo"
            ? "administrativo"
            : item.area_atuacao === "manutencao"
              ? "manutencao"
              : "funcionario",
  }));
}

export async function getMensagensResumoService(usuario, filtros = {}) {
  const scope = await getCondominioScopeForUser(usuario);
  const condominioId = normalizeText(filtros.condominio_id) || scope.condominio_id;

  const [rows] = await db.query(
    `
    SELECT
      SUM(CASE WHEN md.usuario_id = ? AND md.arquivado = 0 THEN 1 ELSE 0 END) AS entrada_total,
      SUM(CASE WHEN md.usuario_id = ? AND md.arquivado = 0 AND md.lido = 0 THEN 1 ELSE 0 END) AS entrada_nao_lidas,
      SUM(CASE WHEN md.usuario_id = ? AND md.arquivado = 1 THEN 1 ELSE 0 END) AS arquivadas_total,
      SUM(CASE WHEN m.remetente_id = ? THEN 1 ELSE 0 END) AS enviadas_total,
      SUM(CASE WHEN m.remetente_id = ? AND m.mensagem_pai_id IS NOT NULL THEN 1 ELSE 0 END) AS respondidas_total
    FROM mensagens m
    LEFT JOIN mensagem_destinatarios md ON md.mensagem_id = m.id
    WHERE m.condominio_id = ?
    `,
    [usuario.id, usuario.id, usuario.id, usuario.id, usuario.id, condominioId],
  );

  const resumo = rows[0] || {};
  return {
    entrada: Number(resumo.entrada_total || 0),
    nao_lidas: Number(resumo.entrada_nao_lidas || 0),
    arquivadas: Number(resumo.arquivadas_total || 0),
    enviadas: Number(resumo.enviadas_total || 0),
    respondidas: Number(resumo.respondidas_total || 0),
  };
}

export async function getMensagemDetalheService(usuario, mensagemId) {
  const scope = await getCondominioScopeForUser(usuario);
  const [rows] = await db.query(
    `
    SELECT
      m.*,
      c.nome_fantasia AS condominio_nome,
      ur.nome_completo AS remetente_nome,
      ur.perfil AS remetente_perfil,
      md.id AS destinatario_relacao_id,
      md.status_destinatario,
      md.lido,
      md.lido_em,
      md.acao_em,
      md.arquivado,
      md.arquivado_em
    FROM mensagens m
    INNER JOIN condominios c ON c.id = m.condominio_id
    INNER JOIN usuarios ur ON ur.id = m.remetente_id
    LEFT JOIN mensagem_destinatarios md ON md.mensagem_id = m.id AND md.usuario_id = ?
    WHERE m.id = ?
      AND m.condominio_id = ?
      AND (
        m.remetente_id = ?
        OR md.usuario_id = ?
      )
    LIMIT 1
    `,
    [usuario.id, mensagemId, scope.condominio_id, usuario.id, usuario.id],
  );

  if (!rows.length) {
    const error = new Error("Mensagem nao encontrada no seu contexto");
    error.status = 404;
    throw error;
  }

  const mensagem = rows[0];
  const [destinatarios] = await db.query(
    `
    SELECT
      md.usuario_id,
      u.nome_completo,
      u.perfil,
      md.status_destinatario,
      md.lido,
      md.lido_em,
      md.acao_em,
      md.arquivado,
      md.arquivado_em
    FROM mensagem_destinatarios md
    INNER JOIN usuarios u ON u.id = md.usuario_id
    WHERE md.mensagem_id = ?
    ORDER BY u.nome_completo ASC
    `,
    [mensagemId],
  );

  const [arquivos] = await db.query(
    `
    SELECT id, arquivo_nome, arquivo_url, tipo, criado_em
    FROM mensagem_arquivos
    WHERE mensagem_id = ?
    ORDER BY criado_em ASC
    `,
    [mensagemId],
  );

  return { mensagem, destinatarios, arquivos };
}

export async function markMensagemLidaService(usuario, mensagemId) {
  const detalhe = await getMensagemDetalheService(usuario, mensagemId);
  if (!detalhe.mensagem.destinatario_relacao_id) {
    const error = new Error("Somente destinatarios podem marcar leitura");
    error.status = 403;
    throw error;
  }

  await db.query(
    `
    UPDATE mensagem_destinatarios
    SET
      lido = 1,
      lido_em = COALESCE(lido_em, NOW()),
      status_destinatario = CASE WHEN status_destinatario = 'nao_lido' THEN 'lido' ELSE status_destinatario END
    WHERE id = ?
    `,
    [detalhe.mensagem.destinatario_relacao_id],
  );

  return { sucesso: true };
}

export async function archiveMensagemService(usuario, mensagemId) {
  const detalhe = await getMensagemDetalheService(usuario, mensagemId);
  if (!detalhe.mensagem.destinatario_relacao_id) {
    const error = new Error("Somente destinatarios podem arquivar mensagens");
    error.status = 403;
    throw error;
  }

  await db.query(
    `
    UPDATE mensagem_destinatarios
    SET
      arquivado = 1,
      arquivado_em = NOW(),
      status_destinatario = 'arquivado'
    WHERE id = ?
    `,
    [detalhe.mensagem.destinatario_relacao_id],
  );

  return { sucesso: true };
}

export async function registrarAcaoMensagemService(usuario, mensagemId, { status_destinatario }) {
  const detalhe = await getMensagemDetalheService(usuario, mensagemId);
  if (!detalhe.mensagem.destinatario_relacao_id) {
    const error = new Error("Somente destinatarios podem atuar sobre a mensagem");
    error.status = 403;
    throw error;
  }

  const normalized = normalizeText(status_destinatario);
  if (!STATUS_DESTINATARIO.has(normalized)) {
    const error = new Error("Status da acao invalido");
    error.status = 400;
    throw error;
  }

  await db.query(
    `
    UPDATE mensagem_destinatarios
    SET
      status_destinatario = ?,
      lido = 1,
      lido_em = COALESCE(lido_em, NOW()),
      acao_em = NOW()
    WHERE id = ?
    `,
    [normalized, detalhe.mensagem.destinatario_relacao_id],
  );

  return { sucesso: true };
}
