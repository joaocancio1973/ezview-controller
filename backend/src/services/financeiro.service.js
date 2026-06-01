import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const MIME_EXTENSOES_COMPROVANTE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};
const TAMANHO_MAX_COMPROVANTE_BYTES = 5 * 1024 * 1024;
const QUANTIDADE_MAX_COMPROVANTES = 3;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "../../../frontend");
const FINANCEIRO_UPLOAD_DIR = path.join(FRONTEND_ROOT, "uploads", "financeiro");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["1", "true", "on", "sim", "yes"].includes(value.trim().toLowerCase());
  }
  return false;
}

function parseComprovantesPayload(rawAnexos) {
  if (!rawAnexos) return [];

  const anexos = Array.isArray(rawAnexos) ? rawAnexos : [rawAnexos];
  if (anexos.length > QUANTIDADE_MAX_COMPROVANTES) {
    const error = new Error(`Limite de ${QUANTIDADE_MAX_COMPROVANTES} comprovantes por cobranca`);
    error.status = 400;
    throw error;
  }

  return anexos.filter(Boolean).map((anexo, index) => {
    const nomeOriginal = normalizeText(anexo.nome_original || anexo.nome || `comprovante-${index + 1}`);
    const dataUrl = normalizeText(anexo.data_url || anexo.conteudo || anexo.base64);
    const match = dataUrl?.match(/^data:([^;]+);base64,(.+)$/);

    if (!match) {
      const error = new Error("Formato invalido de comprovante");
      error.status = 400;
      throw error;
    }

    const mimeType = match[1];
    const base64 = match[2];
    const extensao = MIME_EXTENSOES_COMPROVANTE[mimeType];
    if (!extensao) {
      const error = new Error("Somente PDF, JPG, PNG ou WEBP sao aceitos");
      error.status = 400;
      throw error;
    }

    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length > TAMANHO_MAX_COMPROVANTE_BYTES) {
      const error = new Error("Cada comprovante deve ter no maximo 5 MB");
      error.status = 400;
      throw error;
    }

    return { nomeOriginal, mimeType, extensao, buffer };
  });
}

async function persistirComprovantesFinanceiros(connection, { cobrancaId, condominioId, usuarioId, anexos }) {
  if (!anexos.length) return [];

  await fs.mkdir(FINANCEIRO_UPLOAD_DIR, { recursive: true });
  const registros = [];

  for (const anexo of anexos) {
    const id = uuidv4();
    const nomeArquivo = `${cobrancaId}-${id}${anexo.extensao}`;
    const caminhoFisico = path.join(FINANCEIRO_UPLOAD_DIR, nomeArquivo);
    const caminhoRelativo = `/uploads/financeiro/${nomeArquivo}`;

    await fs.writeFile(caminhoFisico, anexo.buffer);
    await connection.query(
      `
      INSERT INTO financeiro_anexos
        (id, cobranca_id, condominio_id, usuario_id, nome_original, nome_arquivo, mime_type, caminho_relativo, tamanho_bytes, categoria)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, 'comprovante')
      `,
      [id, cobrancaId, condominioId, usuarioId, anexo.nomeOriginal, nomeArquivo, anexo.mimeType, caminhoRelativo, anexo.buffer.length],
    );

    registros.push({
      id,
      nome_original: anexo.nomeOriginal,
      nome_arquivo: nomeArquivo,
      mime_type: anexo.mimeType,
      caminho_relativo: caminhoRelativo,
      tamanho_bytes: anexo.buffer.length,
      categoria: "comprovante",
    });
  }

  return registros;
}

function mapStatusFromReserva(reserva, existingStatus = null) {
  if (reserva.status === "cancelada") return "cancelado";
  if (reserva.status_pagamento === "pago") return "pago";
  if (reserva.status_pagamento === "isento") return "isento";
  if (reserva.status_pagamento === "rejeitado") return "rejeitado";
  if (existingStatus === "em_analise") return "em_analise";
  return "pendente";
}

function mapEventoFromStatus(status) {
  switch (status) {
    case "pago":
      return "pagamento_confirmado";
    case "rejeitado":
      return "pagamento_rejeitado";
    case "isento":
      return "isencao_aplicada";
    case "cancelado":
      return "cobranca_cancelada";
    default:
      return "reserva_sincronizada";
  }
}

async function getReservaContextoFinanceiro(connection, reservaId) {
  const [rows] = await connection.query(
    `
    SELECT
      r.id,
      r.status,
      r.status_pagamento,
      r.data_limite_confirmacao,
      r.confirmado_em,
      r.confirmado_por,
      r.observacao_pagamento,
      r.unidade_id,
      r.usuario_id,
      a.condominio_id,
      a.nome AS area_nome,
      a.exige_taxa,
      a.valor_taxa,
      fc.id AS cobranca_id,
      fc.status AS cobranca_status,
      fc.valor AS cobranca_valor,
      fc.vencimento_em AS cobranca_vencimento,
      fc.responsavel_financeiro_id AS cobranca_responsavel_financeiro_id,
      urf.id AS responsavel_financeiro_id
    FROM reservas r
    INNER JOIN areas_comuns a ON a.id = r.area_id
    LEFT JOIN financeiro_cobrancas fc ON fc.reserva_id = r.id
    LEFT JOIN unidades_responsaveis_financeiros urf
      ON urf.unidade_id = r.unidade_id
     AND urf.ativo = 1
    WHERE r.id = ?
    LIMIT 1
    `,
    [reservaId],
  );

  return rows[0] || null;
}

async function registrarEventoFinanceiro(connection, payload) {
  await connection.query(
    `
    INSERT INTO financeiro_eventos
      (
        id,
        cobranca_id,
        condominio_id,
        usuario_id,
        mensagem_id,
        origem_ator,
        tipo_evento,
        status_anterior,
        status_novo,
        descricao
      )
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuidv4(),
      payload.cobrancaId,
      payload.condominioId,
      payload.usuarioId || null,
      payload.mensagemId || null,
      payload.origemAtor || "sistema",
      payload.tipoEvento,
      payload.statusAnterior || null,
      payload.statusNovo || null,
      normalizeText(payload.descricao) || null,
    ],
  );
}

export async function syncFinanceiroReservaService(reservaId, options = {}) {
  const usuarioId = options.usuarioId || null;
  const origemAtor = options.origemAtor || "sistema";

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const reserva = await getReservaContextoFinanceiro(connection, reservaId);
    if (!reserva || Number(reserva.exige_taxa) !== 1) {
      await connection.commit();
      return null;
    }

    const statusNovo = mapStatusFromReserva(reserva, reserva.cobranca_status);
    const formaCobranca = statusNovo === "isento" ? "isento" : "manual";
    const referenciaTitulo = `Reserva - ${reserva.area_nome}`;
    const descricao = `Cobranca vinculada a reserva da area ${reserva.area_nome}.`;

    if (!reserva.cobranca_id) {
      const cobrancaId = uuidv4();
      await connection.query(
        `
        INSERT INTO financeiro_cobrancas
          (
            id,
            condominio_id,
            unidade_id,
            usuario_id,
            responsavel_financeiro_id,
            reserva_id,
            origem,
            forma_cobranca,
            referencia_titulo,
            descricao,
            valor,
            status,
            vencimento_em,
            pago_em,
            confirmado_por,
            observacao_morador
          )
        VALUES
          (?, ?, ?, ?, ?, ?, 'reserva', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          cobrancaId,
          reserva.condominio_id,
          reserva.unidade_id,
          reserva.usuario_id,
          reserva.responsavel_financeiro_id || null,
          reserva.id,
          formaCobranca,
          referenciaTitulo,
          descricao,
          reserva.valor_taxa,
          statusNovo,
          reserva.data_limite_confirmacao,
          statusNovo === "pago" ? reserva.confirmado_em || new Date() : null,
          statusNovo === "pago" ? reserva.confirmado_por || usuarioId : null,
          reserva.observacao_pagamento || null,
        ],
      );

      await registrarEventoFinanceiro(connection, {
        cobrancaId,
        condominioId: reserva.condominio_id,
        usuarioId,
        origemAtor,
        tipoEvento: "cobranca_criada",
        statusNovo,
        descricao: `Cobranca criada a partir da reserva ${reserva.id}.`,
      });

      await connection.commit();
      return { id: cobrancaId, status: statusNovo };
    }

    const houveMudancaStatus = reserva.cobranca_status !== statusNovo;
    const houveMudancaValor = Number(reserva.cobranca_valor || 0) !== Number(reserva.valor_taxa || 0);
    const houveMudancaVencimento = String(reserva.cobranca_vencimento || "") !== String(reserva.data_limite_confirmacao || "");
    const houveObservacao = Boolean(reserva.observacao_pagamento);

    await connection.query(
      `
      UPDATE financeiro_cobrancas
      SET
        forma_cobranca = ?,
        referencia_titulo = ?,
        descricao = ?,
        valor = ?,
        status = ?,
        responsavel_financeiro_id = COALESCE(?, responsavel_financeiro_id),
        vencimento_em = ?,
        pago_em = ?,
        confirmado_por = ?,
        observacao_morador = ?,
        atualizado_em = NOW()
      WHERE id = ?
      `,
      [
        formaCobranca,
        referenciaTitulo,
        descricao,
        reserva.valor_taxa,
        statusNovo,
        reserva.responsavel_financeiro_id || null,
        reserva.data_limite_confirmacao,
        statusNovo === "pago" ? reserva.confirmado_em || new Date() : null,
        statusNovo === "pago" ? reserva.confirmado_por || usuarioId : null,
        reserva.observacao_pagamento || null,
        reserva.cobranca_id,
      ],
    );

    if (houveMudancaStatus || houveMudancaValor || houveMudancaVencimento || houveObservacao) {
      await registrarEventoFinanceiro(connection, {
        cobrancaId: reserva.cobranca_id,
        condominioId: reserva.condominio_id,
        usuarioId,
        origemAtor,
        tipoEvento: houveMudancaStatus
          ? mapEventoFromStatus(statusNovo)
          : houveMudancaValor
            ? "valor_atualizado"
            : houveMudancaVencimento
              ? "vencimento_atualizado"
              : "observacao_atualizada",
        statusAnterior: reserva.cobranca_status,
        statusNovo,
        descricao: `Cobranca sincronizada com a reserva ${reserva.id}.`,
      });
    }

    await connection.commit();
    return { id: reserva.cobranca_id, status: statusNovo };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export async function registrarPagamentoSinalizadoPorMensagemService({ usuario, mensagem }) {
  const reservaId = normalizeText(mensagem?.entidade_id);
  if (!reservaId || mensagem?.entidade_tipo !== "reserva") {
    return null;
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const reserva = await getReservaContextoFinanceiro(connection, reservaId);
    if (!reserva || !reserva.cobranca_id) {
      await connection.commit();
      return null;
    }

    if (!["pendente", "rejeitado"].includes(reserva.cobranca_status)) {
      await connection.commit();
      return { id: reserva.cobranca_id, status: reserva.cobranca_status };
    }

    await connection.query(
      `
      UPDATE financeiro_cobrancas
      SET
        status = 'em_analise',
        observacao_morador = COALESCE(observacao_morador, 'Morador sinalizou pagamento pelo inbox.'),
        atualizado_em = NOW()
      WHERE id = ?
      `,
      [reserva.cobranca_id],
    );

    await registrarEventoFinanceiro(connection, {
      cobrancaId: reserva.cobranca_id,
      condominioId: reserva.condominio_id,
      usuarioId: usuario?.id || null,
      mensagemId: mensagem?.id || null,
      origemAtor: usuario?.perfil || "morador",
      tipoEvento: "pagamento_sinalizado",
      statusAnterior: reserva.cobranca_status,
      statusNovo: "em_analise",
      descricao: "Pagamento sinalizado pelo inbox interno da reserva.",
    });

    await connection.commit();
    return { id: reserva.cobranca_id, status: "em_analise" };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

async function getAdminCondominiosIds(usuarioId) {
  const [rows] = await db.query(
    `
    SELECT id
    FROM condominios
    WHERE admin_id = ?
    ORDER BY criado_em ASC
    `,
    [usuarioId],
  );

  return rows.map((row) => row.id);
}

async function getAdminScopedUnidadeFinanceira(connection, adminUsuarioId, unidadeId) {
  const [rows] = await connection.query(
    `
    SELECT
      u.id,
      u.condominio_id,
      u.identificacao AS unidade_identificacao,
      t.nome AS torre_nome,
      c.nome_fantasia AS condominio_nome
    FROM unidades u
    INNER JOIN condominios c ON c.id = u.condominio_id
    LEFT JOIN torres t ON t.id = u.torre_id
    WHERE u.id = ?
      AND c.admin_id = ?
    LIMIT 1
    `,
    [unidadeId, adminUsuarioId],
  );

  return rows[0] || null;
}

function buildPendenciasResponsavel(item) {
  const pendencias = [];
  if (!item?.usuario_id) pendencias.push("sem_responsavel");
  if (!normalizeText(item?.nome_completo)) pendencias.push("nome_incompleto");
  if (!normalizeText(item?.cpf_cnpj)) pendencias.push("cpf_cnpj");
  if (!normalizeText(item?.email)) pendencias.push("email");
  if (!normalizeText(item?.telefone_principal)) pendencias.push("telefone_principal");
  if (!normalizeText(item?.logradouro)) pendencias.push("logradouro");
  if (!normalizeText(item?.numero)) pendencias.push("numero");
  if (!normalizeText(item?.bairro)) pendencias.push("bairro");
  if (!normalizeText(item?.cidade)) pendencias.push("cidade");
  if (!normalizeText(item?.uf)) pendencias.push("uf");
  if (!normalizeText(item?.cep)) pendencias.push("cep");
  if (Number(item?.ativo_para_cobranca) !== 1) pendencias.push("ativo_para_cobranca");
  if (Number(item?.recebe_cobranca) !== 1) pendencias.push("recebe_cobranca");
  return pendencias;
}

function decorateResponsavelFinanceiro(item) {
  const pendencias = buildPendenciasResponsavel(item);
  const moradoresAtivos = Number(item?.moradores_ativos || 0);
  return {
    ...item,
    moradores_ativos: moradoresAtivos,
    ocupacao_situacao: moradoresAtivos > 0 ? "ocupada" : "sem_moradores",
    pendencias,
    elegivel_cobranca: pendencias.length === 0,
    situacao_financeira: !item?.usuario_id
      ? "nao_configurado"
      : pendencias.length === 0
        ? "elegivel"
        : "pendente",
  };
}

function normalizeOrigemFinanceira(value) {
  const normalized = normalizeText(value);
  const validos = new Set(["reserva", "taxa_condominial", "mensalidade", "multa", "avulso"]);
  return validos.has(normalized) ? normalized : null;
}

function normalizeStatusFinanceiro(value) {
  const normalized = normalizeText(value);
  const validos = new Set(["rascunho", "pendente", "emitido", "em_analise", "pago", "isento", "cancelado", "rejeitado", "vencido"]);
  return validos.has(normalized) ? normalized : null;
}

function normalizePositiveInt(value, fallback, min = 1, max = 200) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export async function listFinanceiroCobrancasService(usuario, filtros = {}) {
  if (usuario?.perfil !== "admin") {
    const error = new Error("Apenas admin pode acessar cobrancas");
    error.status = 403;
    throw error;
  }

  const condominioIds = await getAdminCondominiosIds(usuario.id);
  if (!condominioIds.length) {
    return { cobrancas: [], resumo: { total: 0, pendentes: 0, em_analise: 0, pagas: 0, vencidas: 0, valor_total: 0 } };
  }

  const status = normalizeStatusFinanceiro(filtros.status);
  const origem = normalizeOrigemFinanceira(filtros.origem);
  const condominioIdFiltro = normalizeText(filtros.condominio_id);
  const unidadeId = normalizeText(filtros.unidade_id);
  const vencimentoDe = normalizeText(filtros.vencimento_de);
  const vencimentoAte = normalizeText(filtros.vencimento_ate);
  const busca = normalizeText(filtros.busca);
  const pagina = normalizePositiveInt(filtros.pagina, 1, 1, 100000);
  const limite = normalizePositiveInt(filtros.limite, 25, 5, 200);
  const offset = (pagina - 1) * limite;

  const params = [];
  let where = ` WHERE fc.condominio_id IN (${condominioIds.map(() => "?").join(",")}) `;
  params.push(...condominioIds);

  if (condominioIdFiltro) {
    where += " AND fc.condominio_id = ? ";
    params.push(condominioIdFiltro);
  }

  if (status) {
    where += " AND fc.status = ? ";
    params.push(status);
  }

  if (origem) {
    where += " AND fc.origem = ? ";
    params.push(origem);
  }

  if (unidadeId) {
    where += " AND fc.unidade_id = ? ";
    params.push(unidadeId);
  }

  if (vencimentoDe) {
    where += " AND DATE(fc.vencimento_em) >= ? ";
    params.push(vencimentoDe);
  }

  if (vencimentoAte) {
    where += " AND DATE(fc.vencimento_em) <= ? ";
    params.push(vencimentoAte);
  }

  if (busca) {
    where += `
      AND (
        fc.referencia_titulo LIKE ?
        OR u.identificacao LIKE ?
        OR usr.nome_completo LIKE ?
        OR c.nome_fantasia LIKE ?
      )
    `;
    const buscaLike = `%${busca}%`;
    params.push(buscaLike, buscaLike, buscaLike, buscaLike);
  }

  const [countRows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM financeiro_cobrancas fc
    INNER JOIN condominios c ON c.id = fc.condominio_id
    INNER JOIN unidades u ON u.id = fc.unidade_id
    INNER JOIN usuarios usr ON usr.id = fc.usuario_id
    ${where}
    `,
    params,
  );

  const totalRegistros = Number(countRows[0]?.total || 0);
  const totalPaginas = totalRegistros > 0 ? Math.ceil(totalRegistros / limite) : 1;
  const [resumoRows] = await db.query(
    `
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(fc.valor), 0) AS valor_total,
      SUM(CASE WHEN fc.status = 'pendente' THEN 1 ELSE 0 END) AS pendentes,
      SUM(CASE WHEN fc.status = 'em_analise' THEN 1 ELSE 0 END) AS em_analise,
      SUM(CASE WHEN fc.status = 'pago' THEN 1 ELSE 0 END) AS pagas,
      SUM(
        CASE
          WHEN fc.vencimento_em IS NOT NULL
            AND fc.status IN ('pendente', 'emitido', 'em_analise', 'rejeitado')
            AND fc.vencimento_em < NOW()
          THEN 1
          ELSE 0
        END
      ) AS vencidas
    FROM financeiro_cobrancas fc
    INNER JOIN condominios c ON c.id = fc.condominio_id
    INNER JOIN unidades u ON u.id = fc.unidade_id
    INNER JOIN usuarios usr ON usr.id = fc.usuario_id
    ${where}
    `,
    params,
  );

  const [rows] = await db.query(
    `
    SELECT
      fc.id,
      fc.condominio_id,
      c.nome_fantasia AS condominio_nome,
      fc.unidade_id,
      u.identificacao AS unidade_identificacao,
      fc.usuario_id,
      usr.nome_completo AS usuario_nome,
      fc.reserva_id,
      fc.origem,
      fc.forma_cobranca,
      fc.referencia_titulo,
      fc.valor,
      fc.status,
      fc.vencimento_em,
      fc.pago_em,
      fc.atualizado_em,
      fc.observacao_morador,
      r.status AS reserva_status,
      r.status_pagamento AS reserva_status_pagamento
    FROM financeiro_cobrancas fc
    INNER JOIN condominios c ON c.id = fc.condominio_id
    INNER JOIN unidades u ON u.id = fc.unidade_id
    INNER JOIN usuarios usr ON usr.id = fc.usuario_id
    LEFT JOIN reservas r ON r.id = fc.reserva_id
    ${where}
    ORDER BY
      CASE
        WHEN fc.status IN ('pendente', 'emitido', 'em_analise', 'rejeitado', 'vencido') THEN 0
        WHEN fc.status IN ('pago', 'isento') THEN 1
        ELSE 2
      END,
      fc.vencimento_em ASC,
      fc.criado_em DESC
    LIMIT ?
    OFFSET ?
    `,
    [...params, limite, offset],
  );
  const resumo = {
    total: Number(resumoRows[0]?.total || 0),
    pendentes: Number(resumoRows[0]?.pendentes || 0),
    em_analise: Number(resumoRows[0]?.em_analise || 0),
    pagas: Number(resumoRows[0]?.pagas || 0),
    vencidas: Number(resumoRows[0]?.vencidas || 0),
    valor_total: Number(resumoRows[0]?.valor_total || 0),
  };

  return {
    cobrancas: rows,
    resumo,
    paginacao: {
      pagina_atual: pagina,
      limite,
      total_registros: totalRegistros,
      total_paginas: totalPaginas,
      possui_anterior: pagina > 1,
      possui_proxima: pagina < totalPaginas,
    },
  };
}

export async function getFinanceiroCobrancaDetalheService(usuario, cobrancaId) {
  if (usuario?.perfil !== "admin") {
    const error = new Error("Apenas admin pode acessar detalhe financeiro");
    error.status = 403;
    throw error;
  }

  const condominioIds = await getAdminCondominiosIds(usuario.id);
  if (!condominioIds.length) {
    const error = new Error("Admin sem condominio ativo");
    error.status = 404;
    throw error;
  }

  const [rows] = await db.query(
    `
    SELECT
      fc.*,
      c.nome_fantasia AS condominio_nome,
      u.identificacao AS unidade_identificacao,
      usr.nome_completo AS usuario_nome,
      usr.email AS usuario_email,
      urf.nome_completo AS responsavel_financeiro_nome,
      urf.cpf_cnpj AS responsavel_financeiro_cpf_cnpj,
      urf.email AS responsavel_financeiro_email,
      urf.telefone_principal AS responsavel_financeiro_telefone,
      urf.ativo_para_cobranca AS responsavel_financeiro_ativo_para_cobranca,
      urf.recebe_cobranca AS responsavel_financeiro_recebe_cobranca,
      urf.ambiente_financeiro AS responsavel_financeiro_ambiente,
      r.status AS reserva_status,
      r.status_pagamento AS reserva_status_pagamento,
      r.data_inicio AS reserva_data_inicio,
      r.data_fim AS reserva_data_fim,
      a.nome AS area_nome,
      confirmador.nome_completo AS confirmado_por_nome
    FROM financeiro_cobrancas fc
    INNER JOIN condominios c ON c.id = fc.condominio_id
    INNER JOIN unidades u ON u.id = fc.unidade_id
    INNER JOIN usuarios usr ON usr.id = fc.usuario_id
    LEFT JOIN unidades_responsaveis_financeiros urf ON urf.id = fc.responsavel_financeiro_id
    LEFT JOIN reservas r ON r.id = fc.reserva_id
    LEFT JOIN areas_comuns a ON a.id = r.area_id
    LEFT JOIN usuarios confirmador ON confirmador.id = fc.confirmado_por
    WHERE fc.id = ?
      AND fc.condominio_id IN (${condominioIds.map(() => "?").join(",")})
    LIMIT 1
    `,
    [cobrancaId, ...condominioIds],
  );

  if (!rows.length) {
    const error = new Error("Cobranca nao encontrada");
    error.status = 404;
    throw error;
  }

  const cobranca = rows[0];
  const [eventos] = await db.query(
    `
    SELECT
      fe.id,
      fe.tipo_evento,
      fe.status_anterior,
      fe.status_novo,
      fe.descricao,
      fe.criado_em,
      fe.origem_ator,
      usr.nome_completo AS usuario_nome,
      m.titulo AS mensagem_titulo
    FROM financeiro_eventos fe
    LEFT JOIN usuarios usr ON usr.id = fe.usuario_id
    LEFT JOIN mensagens m ON m.id = fe.mensagem_id
    WHERE fe.cobranca_id = ?
    ORDER BY fe.criado_em DESC
    `,
    [cobrancaId],
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
      categoria,
      criado_em
    FROM financeiro_anexos
    WHERE cobranca_id = ?
    ORDER BY criado_em DESC
    `,
    [cobrancaId],
  );

  return { cobranca, eventos, anexos };
}

export async function listFinanceiroResponsaveisService(usuario, filtros = {}) {
  if (usuario?.perfil !== "admin") {
    const error = new Error("Apenas admin pode acessar responsaveis financeiros");
    error.status = 403;
    throw error;
  }

  const condominioIds = await getAdminCondominiosIds(usuario.id);
  if (!condominioIds.length) return { itens: [] };

  const condominioId = normalizeText(filtros.condominio_id) || condominioIds[0];
  if (!condominioIds.includes(condominioId)) {
    const error = new Error("Condominio fora do escopo do admin");
    error.status = 403;
    throw error;
  }

  const busca = normalizeText(filtros.busca);
  const params = [condominioId];
  let whereBusca = "";

  if (busca) {
    whereBusca = `
      AND (
        u.identificacao LIKE ?
        OR COALESCE(t.nome, '') LIKE ?
        OR COALESCE(urf.nome_completo, '') LIKE ?
        OR COALESCE(urf.email, '') LIKE ?
        OR COALESCE(urf.cpf_cnpj, '') LIKE ?
      )
    `;
    const like = `%${busca}%`;
    params.push(like, like, like, like, like);
  }

  const [rows] = await db.query(
    `
    SELECT
      u.id AS unidade_id,
      u.identificacao AS unidade_identificacao,
      u.condominio_id,
      c.nome_fantasia AS condominio_nome,
      t.nome AS torre_nome,
      urf.id AS responsavel_financeiro_id,
      urf.usuario_id,
      urf.tipo_pagador,
      urf.nome_completo,
      urf.cpf_cnpj,
      urf.email,
      urf.telefone_principal,
      urf.cidade,
      urf.uf,
      urf.ativo,
      urf.ativo_para_cobranca,
      urf.recebe_cobranca,
      urf.preferencia_envio,
      urf.ambiente_financeiro,
      urf.validado_em,
      urf.atualizado_em,
      urf.criado_em,
      COALESCE(ocup.moradores_ativos, 0) AS moradores_ativos,
      ocup.morador_principal,
      ocup.moradores_lista
    FROM unidades u
    INNER JOIN condominios c ON c.id = u.condominio_id
    LEFT JOIN torres t ON t.id = u.torre_id
    LEFT JOIN (
      SELECT
        uu.unidade_id,
        COUNT(*) AS moradores_ativos,
        SUBSTRING_INDEX(
          GROUP_CONCAT(
            usr.nome_completo
            ORDER BY FIELD(uu.papel, 'titular', 'proprietario', 'dependente'), usr.nome_completo
            SEPARATOR ' | '
          ),
          ' | ',
          1
        ) AS morador_principal,
        GROUP_CONCAT(
          CONCAT(usr.nome_completo, ' (', uu.papel, ')')
          ORDER BY FIELD(uu.papel, 'titular', 'proprietario', 'dependente'), usr.nome_completo
          SEPARATOR ' | '
        ) AS moradores_lista
      FROM unidade_usuarios uu
      INNER JOIN usuarios usr ON usr.id = uu.usuario_id
      WHERE uu.ativo = 1
      GROUP BY uu.unidade_id
    ) ocup ON ocup.unidade_id = u.id
    LEFT JOIN unidades_responsaveis_financeiros urf
      ON urf.unidade_id = u.id
     AND urf.ativo = 1
    WHERE u.condominio_id = ?
      ${whereBusca}
    ORDER BY COALESCE(t.nome, '') ASC, u.identificacao ASC
    `,
    params,
  );

  return {
    itens: rows.map(decorateResponsavelFinanceiro),
  };
}

export async function getFinanceiroResponsavelOpcoesService(usuario, unidadeId) {
  if (usuario?.perfil !== "admin") {
    const error = new Error("Apenas admin pode configurar responsavel financeiro");
    error.status = 403;
    throw error;
  }

  const connection = await db.getConnection();
  try {
    const unidade = await getAdminScopedUnidadeFinanceira(connection, usuario.id, unidadeId);
    if (!unidade) {
      const error = new Error("Unidade nao encontrada no escopo do admin");
      error.status = 404;
      throw error;
    }

    const [responsavelRows] = await connection.query(
      `
      SELECT
        urf.*,
        u.nome_completo AS usuario_nome,
        u.email AS usuario_email,
        uu.papel AS usuario_papel
      FROM unidades_responsaveis_financeiros urf
      INNER JOIN usuarios u ON u.id = urf.usuario_id
      LEFT JOIN unidade_usuarios uu
        ON uu.unidade_id = urf.unidade_id
       AND uu.usuario_id = urf.usuario_id
       AND uu.ativo = 1
      WHERE urf.unidade_id = ?
        AND urf.ativo = 1
      ORDER BY urf.atualizado_em DESC
      LIMIT 1
      `,
      [unidadeId],
    );

    const [candidatos] = await connection.query(
      `
      SELECT
        usr.id,
        usr.nome_completo,
        usr.email,
        usr.phone_whatsapp,
        usr.documento_identificacao,
        uu.papel
      FROM unidade_usuarios uu
      INNER JOIN usuarios usr ON usr.id = uu.usuario_id
      WHERE uu.unidade_id = ?
        AND uu.ativo = 1
      ORDER BY FIELD(uu.papel, 'titular', 'proprietario', 'dependente'), usr.nome_completo ASC
      `,
      [unidadeId],
    );

    return {
      unidade,
      responsavel_atual: responsavelRows[0] ? decorateResponsavelFinanceiro(responsavelRows[0]) : null,
      candidatos,
    };
  } finally {
    connection.release();
  }
}

export async function saveFinanceiroResponsavelService(usuario, data = {}) {
  if (usuario?.perfil !== "admin") {
    const error = new Error("Apenas admin pode salvar responsavel financeiro");
    error.status = 403;
    throw error;
  }

  const unidadeId = normalizeText(data.unidade_id);
  const usuarioId = normalizeText(data.usuario_id);
  const tipoPagador = normalizeText(data.tipo_pagador) === "pj" ? "pj" : "pf";
  const ambienteFinanceiro = normalizeText(data.ambiente_financeiro) === "producao" ? "producao" : "teste";
  const preferenciaEnvio = new Set(["email", "inbox", "email_e_inbox"]).has(normalizeText(data.preferencia_envio))
    ? normalizeText(data.preferencia_envio)
    : "email_e_inbox";

  if (!unidadeId || !usuarioId) {
    const error = new Error("Unidade e usuario responsavel sao obrigatorios");
    error.status = 400;
    throw error;
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const unidade = await getAdminScopedUnidadeFinanceira(connection, usuario.id, unidadeId);
    if (!unidade) {
      const error = new Error("Unidade nao encontrada no escopo do admin");
      error.status = 404;
      throw error;
    }

    const [candidatoRows] = await connection.query(
      `
      SELECT
        usr.id,
        usr.nome_completo,
        usr.email,
        usr.phone_whatsapp,
        usr.documento_identificacao,
        uu.papel
      FROM unidade_usuarios uu
      INNER JOIN usuarios usr ON usr.id = uu.usuario_id
      WHERE uu.unidade_id = ?
        AND uu.usuario_id = ?
        AND uu.ativo = 1
      LIMIT 1
      `,
      [unidadeId, usuarioId],
    );

    if (!candidatoRows.length) {
      const error = new Error("O usuario escolhido nao esta vinculado a unidade");
      error.status = 400;
      throw error;
    }

    const candidato = candidatoRows[0];

    const payload = {
      nome_completo: normalizeText(data.nome_completo) || candidato.nome_completo || null,
      cpf_cnpj: normalizeText(data.cpf_cnpj) || candidato.documento_identificacao || null,
      email: normalizeText(data.email)?.toLowerCase() || candidato.email || null,
      telefone_principal: normalizeText(data.telefone_principal) || candidato.phone_whatsapp || null,
      cep: normalizeText(data.cep) || null,
      logradouro: normalizeText(data.logradouro) || null,
      numero: normalizeText(data.numero) || null,
      complemento: normalizeText(data.complemento) || null,
      bairro: normalizeText(data.bairro) || null,
      cidade: normalizeText(data.cidade) || null,
      uf: normalizeText(data.uf)?.toUpperCase() || null,
      observacao_financeira: normalizeText(data.observacao_financeira) || null,
      ativo_para_cobranca: normalizeBoolean(data.ativo_para_cobranca) ? 1 : 0,
      recebe_cobranca: normalizeBoolean(data.recebe_cobranca) ? 1 : 0,
      preferencia_envio: preferenciaEnvio,
      ambiente_financeiro: ambienteFinanceiro,
    };

    const [atualRows] = await connection.query(
      `
      SELECT *
      FROM unidades_responsaveis_financeiros
      WHERE unidade_id = ?
        AND ativo = 1
      ORDER BY atualizado_em DESC
      LIMIT 1
      `,
      [unidadeId],
    );

    const atual = atualRows[0] || null;
    let responsavelId = atual?.id || null;

    if (atual && atual.usuario_id === usuarioId) {
      await connection.query(
        `
        UPDATE unidades_responsaveis_financeiros
        SET
          tipo_pagador = ?,
          nome_completo = ?,
          cpf_cnpj = ?,
          email = ?,
          telefone_principal = ?,
          cep = ?,
          logradouro = ?,
          numero = ?,
          complemento = ?,
          bairro = ?,
          cidade = ?,
          uf = ?,
          ativo_para_cobranca = ?,
          recebe_cobranca = ?,
          preferencia_envio = ?,
          ambiente_financeiro = ?,
          observacao_financeira = ?,
          atualizado_em = NOW()
        WHERE id = ?
        `,
        [
          tipoPagador,
          payload.nome_completo,
          payload.cpf_cnpj,
          payload.email,
          payload.telefone_principal,
          payload.cep,
          payload.logradouro,
          payload.numero,
          payload.complemento,
          payload.bairro,
          payload.cidade,
          payload.uf,
          payload.ativo_para_cobranca,
          payload.recebe_cobranca,
          payload.preferencia_envio,
          payload.ambiente_financeiro,
          payload.observacao_financeira,
          atual.id,
        ],
      );
    } else {
      if (atual) {
        await connection.query(
          `
          UPDATE unidades_responsaveis_financeiros
          SET ativo = 0, encerrado_em = NOW(), atualizado_em = NOW()
          WHERE id = ?
          `,
          [atual.id],
        );
      }

      responsavelId = uuidv4();
      await connection.query(
        `
        INSERT INTO unidades_responsaveis_financeiros
          (
            id,
            condominio_id,
            unidade_id,
            usuario_id,
            tipo_pagador,
            nome_completo,
            cpf_cnpj,
            email,
            telefone_principal,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            uf,
            ativo,
            ativo_para_cobranca,
            recebe_cobranca,
            preferencia_envio,
            ambiente_financeiro,
            substitui_responsavel_id,
            observacao_financeira
          )
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
        `,
        [
          responsavelId,
          unidade.condominio_id,
          unidadeId,
          usuarioId,
          tipoPagador,
          payload.nome_completo,
          payload.cpf_cnpj,
          payload.email,
          payload.telefone_principal,
          payload.cep,
          payload.logradouro,
          payload.numero,
          payload.complemento,
          payload.bairro,
          payload.cidade,
          payload.uf,
          payload.ativo_para_cobranca,
          payload.recebe_cobranca,
          payload.preferencia_envio,
          payload.ambiente_financeiro,
          atual?.id || null,
          payload.observacao_financeira,
        ],
      );
    }

    await connection.query(
      `
      UPDATE financeiro_cobrancas
      SET responsavel_financeiro_id = ?
      WHERE unidade_id = ?
        AND origem = 'reserva'
        AND (responsavel_financeiro_id IS NULL OR responsavel_financeiro_id = ?)
      `,
      [responsavelId, unidadeId, atual?.id || null],
    );

    await connection.commit();

    const resultado = await getFinanceiroResponsavelOpcoesService(usuario, unidadeId);
    return resultado;
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export async function addFinanceiroComprovantesService(usuario, cobrancaId, data = {}) {
  if (usuario?.perfil !== "admin") {
    const error = new Error("Apenas admin pode anexar comprovantes financeiros");
    error.status = 403;
    throw error;
  }

  const anexos = parseComprovantesPayload(data.anexos);
  if (!anexos.length) {
    const error = new Error("Selecione ao menos um comprovante");
    error.status = 400;
    throw error;
  }

  const condominioIds = await getAdminCondominiosIds(usuario.id);
  if (!condominioIds.length) {
    const error = new Error("Admin sem condominio ativo");
    error.status = 404;
    throw error;
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT id, condominio_id, status
      FROM financeiro_cobrancas
      WHERE id = ?
        AND condominio_id IN (${condominioIds.map(() => "?").join(",")})
      LIMIT 1
      `,
      [cobrancaId, ...condominioIds],
    );

    if (!rows.length) {
      const error = new Error("Cobranca nao encontrada");
      error.status = 404;
      throw error;
    }

    const cobranca = rows[0];
    const comprovantes = await persistirComprovantesFinanceiros(connection, {
      cobrancaId,
      condominioId: cobranca.condominio_id,
      usuarioId: usuario.id,
      anexos,
    });

    await registrarEventoFinanceiro(connection, {
      cobrancaId,
      condominioId: cobranca.condominio_id,
      usuarioId: usuario.id,
      origemAtor: usuario.perfil || "admin",
      tipoEvento: "comprovante_anexado",
      statusAnterior: cobranca.status,
      statusNovo: cobranca.status,
      descricao: `${comprovantes.length} comprovante(s) anexado(s) na cobranca.`,
    });

    await connection.commit();
    return { anexos: comprovantes };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}
