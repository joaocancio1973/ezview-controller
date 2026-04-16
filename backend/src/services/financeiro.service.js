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
