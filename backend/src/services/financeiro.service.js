import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
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
      fc.vencimento_em AS cobranca_vencimento
    FROM reservas r
    INNER JOIN areas_comuns a ON a.id = r.area_id
    LEFT JOIN financeiro_cobrancas fc ON fc.reserva_id = r.id
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
          (?, ?, ?, ?, ?, 'reserva', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          cobrancaId,
          reserva.condominio_id,
          reserva.unidade_id,
          reserva.usuario_id,
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

function normalizeOrigemFinanceira(value) {
  const normalized = normalizeText(value);
  const validos = new Set(["reserva", "taxa_condominial", "mensalidade", "multa", "avulso"]);
  return validos.has(normalized) ? normalized : null;
}

function normalizeStatusFinanceiro(value) {
  const normalized = normalizeText(value);
  const validos = new Set(["rascunho", "pendente", "em_analise", "pago", "isento", "cancelado", "rejeitado"]);
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
            AND fc.status IN ('pendente', 'em_analise', 'rejeitado')
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
        WHEN fc.status IN ('pendente', 'em_analise', 'rejeitado') THEN 0
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

  return { cobranca, eventos };
}
