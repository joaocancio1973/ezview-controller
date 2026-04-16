import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";
import { createMensagemInternaService } from "./mensagens.service.js";
import { syncFinanceiroReservaService } from "./financeiro.service.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeStatus(value) {
  const status = normalizeText(value);
  const validos = new Set(["pendente", "confirmada", "cancelada"]);
  return validos.has(status) ? status : "pendente";
}

function normalizeStatusPagamento(value, fallback = "nao_aplicavel") {
  const status = normalizeText(value);
  const validos = new Set(["nao_aplicavel", "pendente", "pago", "isento", "rejeitado"]);
  return validos.has(status) ? status : fallback;
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

function normalizeDateTime(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function validarAreaDoAdmin(usuarioId, areaId) {
  const [rows] = await db.query(
    `
    SELECT
      a.id,
      a.condominio_id,
      a.nome,
      a.exige_reserva,
      a.exige_taxa,
      a.valor_taxa,
      a.ativo
    FROM areas_comuns a
    INNER JOIN condominios c ON c.id = a.condominio_id
    WHERE a.id = ? AND c.admin_id = ?
    LIMIT 1
    `,
    [areaId, usuarioId],
  );

  if (!rows.length) {
    const error = new Error("Area comum invalida ou fora do contexto do admin logado");
    error.status = 404;
    throw error;
  }

  const area = rows[0];

  if (Number(area.ativo) !== 1) {
    const error = new Error("Area comum inativa");
    error.status = 403;
    throw error;
  }

  return area;
}

async function validarUnidadeDoAdmin(usuarioId, unidadeId, condominioId) {
  const [rows] = await db.query(
    `
    SELECT
      u.id,
      u.condominio_id,
      u.identificacao,
      u.ativo
    FROM unidades u
    INNER JOIN condominios c ON c.id = u.condominio_id
    WHERE u.id = ? AND u.condominio_id = ? AND c.admin_id = ?
    LIMIT 1
    `,
    [unidadeId, condominioId, usuarioId],
  );

  if (!rows.length) {
    const error = new Error("Unidade invalida ou fora do contexto da reserva");
    error.status = 404;
    throw error;
  }

  const unidade = rows[0];

  if (Number(unidade.ativo) !== 1) {
    const error = new Error("Unidade inativa");
    error.status = 403;
    throw error;
  }

  return unidade;
}

async function validarUsuarioReserva(usuarioId) {
  const [rows] = await db.query(
    `
    SELECT id, nome_completo, email, status
    FROM usuarios
    WHERE id = ?
    LIMIT 1
    `,
    [usuarioId],
  );

  if (!rows.length) {
    const error = new Error("Usuario responsavel nao encontrado");
    error.status = 404;
    throw error;
  }

  const usuario = rows[0];

  if (usuario.status !== "ativo") {
    const error = new Error("Usuario responsavel inativo");
    error.status = 403;
    throw error;
  }

  return usuario;
}

async function obterContextoMoradorReserva(usuarioId) {
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

async function getAdminDoCondominio(condominioId) {
  const [rows] = await db.query(
    `
    SELECT admin_id
    FROM condominios
    WHERE id = ?
    LIMIT 1
    `,
    [condominioId],
  );

  return rows[0]?.admin_id || null;
}

async function getReservaDetalheParaInbox(reservaId) {
  const [rows] = await db.query(
    `
    SELECT
      r.id,
      r.status,
      r.status_pagamento,
      r.data_inicio,
      r.data_fim,
      r.data_limite_confirmacao,
      fc.id AS cobranca_id,
      fc.status AS cobranca_status,
      r.unidade_id,
      u.identificacao AS unidade_identificacao,
      r.usuario_id,
      usr.nome_completo AS usuario_nome,
      usr.email AS usuario_email,
      a.id AS area_id,
      a.nome AS area_nome,
      a.exige_taxa,
      a.valor_taxa,
      c.id AS condominio_id,
      c.nome_fantasia AS condominio_nome,
      c.admin_id
    FROM reservas r
    INNER JOIN areas_comuns a ON a.id = r.area_id
    INNER JOIN condominios c ON c.id = a.condominio_id
    INNER JOIN unidades u ON u.id = r.unidade_id
    INNER JOIN usuarios usr ON usr.id = r.usuario_id
    LEFT JOIN financeiro_cobrancas fc ON fc.reserva_id = r.id
    WHERE r.id = ?
    LIMIT 1
    `,
    [reservaId],
  );

  return rows[0] || null;
}

function formatCurrencyBRL(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function formatDateTimeBR(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

async function notificarReservaCriada(reservaId) {
  const detalhe = await getReservaDetalheParaInbox(reservaId);
  if (!detalhe) return;

  const faixa = `${formatDateTimeBR(detalhe.data_inicio)} ate ${formatDateTimeBR(detalhe.data_fim)}`;
  const metadados = {
    reserva_id: detalhe.id,
    area_id: detalhe.area_id,
    area_nome: detalhe.area_nome,
    unidade_id: detalhe.unidade_id,
    unidade_identificacao: detalhe.unidade_identificacao,
    valor_taxa: detalhe.valor_taxa,
    status: detalhe.status,
    status_pagamento: detalhe.status_pagamento,
    admin_id: detalhe.admin_id,
    condominio_id: detalhe.condominio_id,
    usuario_id: detalhe.usuario_id,
    cobranca_id: detalhe.cobranca_id,
    cobranca_status: detalhe.cobranca_status,
  };

  if (Number(detalhe.exige_taxa) === 1) {
    await createMensagemInternaService({
      condominioId: detalhe.condominio_id,
      remetenteId: detalhe.admin_id,
      criadoPorTipo: "sistema",
      tipo: "financeiro",
      categoriaEvento: "reserva_pagamento_pendente",
      entidadeTipo: "reserva",
      entidadeId: detalhe.id,
      titulo: `Pagamento pendente da reserva de ${detalhe.area_nome}`,
      conteudo: `Sua reserva para ${detalhe.area_nome} em ${faixa} foi registrada. O valor previsto e ${formatCurrencyBRL(detalhe.valor_taxa)}. A confirmacao financeira precisa acontecer ate ${formatDateTimeBR(detalhe.data_limite_confirmacao)}.`,
      prioridade: "alta",
      acaoRequerida: "confirmar_pagamento",
      metadados,
      destinatarios: [detalhe.usuario_id],
    });

    if (detalhe.admin_id) {
      await createMensagemInternaService({
        condominioId: detalhe.condominio_id,
        remetenteId: detalhe.usuario_id,
        criadoPorTipo: "morador",
        tipo: "financeiro",
        categoriaEvento: "reserva_pagamento_pendente_admin",
        entidadeTipo: "reserva",
        entidadeId: detalhe.id,
        titulo: `Reserva com pagamento pendente em ${detalhe.area_nome}`,
        conteudo: `${detalhe.usuario_nome} solicitou ${detalhe.area_nome} para ${faixa}. A reserva ficou aguardando confirmacao de pagamento no valor de ${formatCurrencyBRL(detalhe.valor_taxa)}.`,
        prioridade: "media",
        acaoRequerida: "revisar",
        metadados,
        destinatarios: [detalhe.admin_id],
      });
    }

    return;
  }

  await createMensagemInternaService({
    condominioId: detalhe.condominio_id,
    remetenteId: detalhe.admin_id || detalhe.usuario_id,
    criadoPorTipo: "sistema",
    tipo: "comunicado",
    categoriaEvento: "reserva_registrada",
    entidadeTipo: "reserva",
    entidadeId: detalhe.id,
    titulo: `Reserva registrada em ${detalhe.area_nome}`,
    conteudo: `Sua reserva para ${detalhe.area_nome} em ${faixa} foi registrada com status ${detalhe.status}.`,
    prioridade: "media",
    acaoRequerida: "nenhuma",
    metadados,
    destinatarios: [detalhe.usuario_id],
  });
}

async function notificarReservaAtualizada(reservaId, responsavelId) {
  const detalhe = await getReservaDetalheParaInbox(reservaId);
  if (!detalhe) return;

  let categoriaEvento = "reserva_atualizada";
  let titulo = `Reserva atualizada em ${detalhe.area_nome}`;
  let conteudo = `A reserva para ${detalhe.area_nome} agora esta com status ${detalhe.status}.`;
  let prioridade = "media";
  let acaoRequerida = "nenhuma";

  if (detalhe.status === "confirmada") {
    categoriaEvento = "reserva_pagamento_confirmado";
    titulo = `Reserva confirmada em ${detalhe.area_nome}`;
    conteudo = `Sua reserva para ${detalhe.area_nome} foi confirmada. Pagamento: ${detalhe.status_pagamento}.`;
    prioridade = "alta";
  } else if (detalhe.status === "cancelada") {
    categoriaEvento = "reserva_cancelada";
    titulo = `Reserva cancelada em ${detalhe.area_nome}`;
    conteudo = `A reserva para ${detalhe.area_nome} foi cancelada.`;
  } else if (detalhe.status_pagamento === "rejeitado") {
    categoriaEvento = "reserva_pagamento_rejeitado";
    titulo = `Pagamento rejeitado em ${detalhe.area_nome}`;
    conteudo = `O pagamento da reserva para ${detalhe.area_nome} foi rejeitado e precisa de nova revisao.`;
    prioridade = "alta";
    acaoRequerida = "confirmar_pagamento";
  }

  await createMensagemInternaService({
    condominioId: detalhe.condominio_id,
    remetenteId: responsavelId || detalhe.admin_id || detalhe.usuario_id,
    criadoPorTipo: "admin",
    tipo: detalhe.status_pagamento !== "nao_aplicavel" ? "financeiro" : "comunicado",
    categoriaEvento,
    entidadeTipo: "reserva",
    entidadeId: detalhe.id,
    titulo,
    conteudo,
    prioridade,
    acaoRequerida,
    metadados: {
      reserva_id: detalhe.id,
      area_nome: detalhe.area_nome,
      unidade_identificacao: detalhe.unidade_identificacao,
      status: detalhe.status,
      status_pagamento: detalhe.status_pagamento,
      admin_id: detalhe.admin_id,
      condominio_id: detalhe.condominio_id,
      usuario_id: detalhe.usuario_id,
    },
    destinatarios: [detalhe.usuario_id],
  });
}

export async function listReservasService(usuario, filtros = {}) {
  if (usuario?.perfil === "morador") {
    const contexto = await obterContextoMoradorReserva(usuario.id);
    const params = [usuario.id, contexto.unidade_id, contexto.condominio_id];
    let extraWhere = "";

    if (filtros.data_inicio) {
      extraWhere += " AND r.data_fim >= ?";
      params.push(filtros.data_inicio);
    }

    if (filtros.data_fim) {
      extraWhere += " AND r.data_inicio <= ?";
      params.push(filtros.data_fim);
    }

    const [rows] = await db.query(
      `
      SELECT
        r.id,
        r.area_id,
        a.nome AS area_nome,
        a.condominio_id,
        c.nome_fantasia AS condominio_nome,
        r.unidade_id,
        u.identificacao AS unidade_identificacao,
        r.usuario_id,
        usr.nome_completo AS usuario_nome,
        r.data_inicio,
        r.data_fim,
        r.dia_inteiro,
        r.data_limite_confirmacao,
        a.exige_taxa,
        a.valor_taxa,
        r.status,
        r.status_pagamento,
        r.observacao_pagamento,
        r.confirmado_em,
        r.confirmado_por,
        r.criado_em
      FROM reservas r
      INNER JOIN areas_comuns a ON a.id = r.area_id
      INNER JOIN condominios c ON c.id = a.condominio_id
      INNER JOIN unidades u ON u.id = r.unidade_id
      INNER JOIN usuarios usr ON usr.id = r.usuario_id
      WHERE r.usuario_id = ?
        AND r.unidade_id = ?
        AND a.condominio_id = ?${extraWhere}
      ORDER BY r.data_inicio ASC, a.nome ASC
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

  if (filtros.area_id) {
    extraWhere += " AND r.area_id = ?";
    params.push(filtros.area_id);
  }

  if (filtros.unidade_id) {
    extraWhere += " AND r.unidade_id = ?";
    params.push(filtros.unidade_id);
  }

  if (filtros.data_inicio) {
    extraWhere += " AND r.data_fim >= ?";
    params.push(filtros.data_inicio);
  }

  if (filtros.data_fim) {
    extraWhere += " AND r.data_inicio <= ?";
    params.push(filtros.data_fim);
  }

  const [rows] = await db.query(
    `
    SELECT
      r.id,
      r.area_id,
      a.nome AS area_nome,
      a.condominio_id,
      c.nome_fantasia AS condominio_nome,
      r.unidade_id,
      u.identificacao AS unidade_identificacao,
      r.usuario_id,
      usr.nome_completo AS usuario_nome,
      r.data_inicio,
      r.data_fim,
      r.dia_inteiro,
      r.data_limite_confirmacao,
      a.exige_taxa,
      a.valor_taxa,
      r.status,
      r.status_pagamento,
      r.observacao_pagamento,
      r.confirmado_em,
      r.confirmado_por,
      r.criado_em
    FROM reservas r
    INNER JOIN areas_comuns a ON a.id = r.area_id
    INNER JOIN condominios c ON c.id = a.condominio_id
    INNER JOIN unidades u ON u.id = r.unidade_id
    INNER JOIN usuarios usr ON usr.id = r.usuario_id
    WHERE c.admin_id = ?${extraWhere}
    ORDER BY r.data_inicio ASC, a.nome ASC
    `,
    params,
  );

  return rows;
}

export async function listReservasAgendaService(usuario, filtros = {}) {
  if (usuario?.perfil === "morador") {
    const contexto = await obterContextoMoradorReserva(usuario.id);
    const params = [contexto.condominio_id];
    let extraWhere = "";

    if (filtros.area_id) {
      extraWhere += " AND r.area_id = ?";
      params.push(filtros.area_id);
    }

    if (filtros.data_inicio) {
      extraWhere += " AND r.data_fim >= ?";
      params.push(filtros.data_inicio);
    }

    if (filtros.data_fim) {
      extraWhere += " AND r.data_inicio <= ?";
      params.push(filtros.data_fim);
    }

    const [rows] = await db.query(
      `
      SELECT
        a.id AS area_id,
        a.nome AS area_nome,
        DATE(r.data_inicio) AS dia_referencia,
        COUNT(*) AS total_reservas,
        SUM(CASE WHEN r.status = 'confirmada' THEN 1 ELSE 0 END) AS total_confirmadas,
        SUM(CASE WHEN r.status = 'pendente' THEN 1 ELSE 0 END) AS total_pendentes,
        MIN(r.data_inicio) AS proxima_ocupacao_inicio,
        MAX(r.data_fim) AS proxima_ocupacao_fim
      FROM reservas r
      INNER JOIN areas_comuns a ON a.id = r.area_id
      WHERE a.condominio_id = ?
        AND r.status IN ('pendente', 'confirmada')${extraWhere}
      GROUP BY a.id, a.nome, DATE(r.data_inicio)
      ORDER BY DATE(r.data_inicio) ASC, a.nome ASC
      `,
      params,
    );

    return rows;
  }

  return listReservasService(usuario, filtros);
}

export async function createReservaService(usuarioLogado, data) {
  const areaId = normalizeText(data.area_id);
  let unidadeId = normalizeText(data.unidade_id);
  let usuarioId = normalizeText(data.usuario_id) || usuarioLogado.id;
  let dataInicio = normalizeDateTime(data.data_inicio);
  let dataFim = normalizeDateTime(data.data_fim);
  let status = normalizeStatus(data.status);
  const diaInteiro = normalizeBoolean(data.dia_inteiro, 0);

  if (!areaId || !dataInicio || !dataFim) {
    const error = new Error("Area, data inicial e data final sao obrigatorios");
    error.status = 400;
    throw error;
  }

  if (diaInteiro === 1) {
    const inicio = new Date(dataInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dataInicio);
    fim.setHours(23, 59, 59, 999);
    dataInicio = inicio;
    dataFim = fim;
  }

  if (dataFim <= dataInicio) {
    const error = new Error("A data final deve ser maior que a data inicial");
    error.status = 400;
    throw error;
  }

  let area;

  if (usuarioLogado?.perfil === "morador") {
    const contexto = await obterContextoMoradorReserva(usuarioLogado.id);
    unidadeId = contexto.unidade_id;
    usuarioId = usuarioLogado.id;
    status = "pendente";

    const [areaRows] = await db.query(
      `
      SELECT
        a.id,
        a.condominio_id,
        a.nome,
        a.exige_reserva,
        a.exige_taxa,
        a.valor_taxa,
        a.ativo
      FROM areas_comuns a
      WHERE a.id = ? AND a.condominio_id = ?
      LIMIT 1
      `,
      [areaId, contexto.condominio_id],
    );

    if (!areaRows.length) {
      const error = new Error("Area comum invalida para o condominio do morador");
      error.status = 404;
      throw error;
    }

    area = areaRows[0];

    if (Number(area.ativo) !== 1) {
      const error = new Error("Area comum inativa");
      error.status = 403;
      throw error;
    }

    if (Number(area.exige_reserva) !== 1) {
      const error = new Error("Esta area nao exige solicitacao de reserva");
      error.status = 400;
      throw error;
    }
  } else {
    area = await validarAreaDoAdmin(usuarioLogado.id, areaId);
    await validarUnidadeDoAdmin(usuarioLogado.id, unidadeId, area.condominio_id);
    await validarUsuarioReserva(usuarioId);
  }

  if (!unidadeId) {
    const error = new Error("Unidade invalida para a reserva");
    error.status = 400;
    throw error;
  }

  let dataLimiteConfirmacao = null;
  let statusPagamento = "nao_aplicavel";

  if (Number(area.exige_taxa) === 1) {
    dataLimiteConfirmacao = new Date(dataInicio);
    dataLimiteConfirmacao.setDate(dataLimiteConfirmacao.getDate() - 7);
    statusPagamento = "pendente";
  }

  if (status === "confirmada" && !["nao_aplicavel", "pago", "isento"].includes(statusPagamento)) {
    const error = new Error("Reservas com taxa exigem pagamento confirmado antes de sair de pendente");
    error.status = 400;
    throw error;
  }

  const [conflictRows] = await db.query(
    `
    SELECT id
    FROM reservas
    WHERE area_id = ?
      AND status IN ('pendente', 'confirmada')
      AND data_inicio < ?
      AND data_fim > ?
    LIMIT 1
    `,
    [areaId, dataFim, dataInicio],
  );

  if (conflictRows.length > 0) {
    const error = new Error("Ja existe uma reserva ativa para esta area no intervalo informado");
    error.status = 409;
    throw error;
  }

  const novoId = uuidv4();

  await db.query(
    `
    INSERT INTO reservas (
      id,
      area_id,
      unidade_id,
      usuario_id,
      data_inicio,
      data_fim,
      dia_inteiro,
      data_limite_confirmacao,
      status,
      status_pagamento
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      novoId,
      areaId,
      unidadeId,
      usuarioId,
      dataInicio,
      dataFim,
      diaInteiro,
      dataLimiteConfirmacao,
      status,
      statusPagamento,
    ],
  );

  await syncFinanceiroReservaService(novoId, {
    usuarioId: usuarioLogado?.id || usuarioId,
    origemAtor: usuarioLogado?.perfil || "sistema",
  });
  await notificarReservaCriada(novoId);

  return {
    id: novoId,
    area_id: areaId,
    unidade_id: unidadeId,
    usuario_id: usuarioId,
    data_inicio: dataInicio,
    data_fim: dataFim,
    dia_inteiro: diaInteiro,
    data_limite_confirmacao: dataLimiteConfirmacao,
    status,
    status_pagamento: statusPagamento,
  };
}

export async function updateReservaStatusService(usuarioIdLogado, reservaId, data = {}) {
  const id = normalizeText(reservaId);
  const novoStatus = normalizeStatus(data.status);
  const statusPagamentoSolicitado = data.status_pagamento
    ? normalizeStatusPagamento(data.status_pagamento, "pendente")
    : null;
  const observacaoPagamento = normalizeText(data.observacao_pagamento) || null;

  const [rows] = await db.query(
    `
    SELECT
      r.id,
      r.status,
      r.status_pagamento,
      r.area_id,
      r.data_inicio,
      a.exige_taxa
    FROM reservas r
    INNER JOIN areas_comuns a ON a.id = r.area_id
    INNER JOIN condominios c ON c.id = a.condominio_id
    WHERE r.id = ? AND c.admin_id = ?
    LIMIT 1
    `,
    [id, usuarioIdLogado],
  );

  if (!rows.length) {
    const error = new Error("Reserva nao encontrada no contexto do admin logado");
    error.status = 404;
    throw error;
  }

  const reserva = rows[0];
  let statusPagamentoFinal = statusPagamentoSolicitado || reserva.status_pagamento;
  let confirmadoEm = reserva.status === "confirmada" ? new Date() : null;
  let confirmadoPor = reserva.status === "confirmada" ? usuarioIdLogado : null;

  if (Number(reserva.exige_taxa) !== 1) {
    statusPagamentoFinal = "nao_aplicavel";
  }

  if (novoStatus === "confirmada") {
    if (!["nao_aplicavel", "pago", "isento"].includes(statusPagamentoFinal)) {
      const error = new Error("Antes de confirmar, marque o pagamento como pago ou isento");
      error.status = 400;
      throw error;
    }
    confirmadoEm = new Date();
    confirmadoPor = usuarioIdLogado;
  }

  if (novoStatus !== "confirmada") {
    confirmadoEm = null;
    confirmadoPor = null;
  }

  await db.query(
    `
    UPDATE reservas
    SET
      status = ?,
      status_pagamento = ?,
      observacao_pagamento = ?,
      confirmado_em = ?,
      confirmado_por = ?
    WHERE id = ?
    `,
    [novoStatus, statusPagamentoFinal, observacaoPagamento, confirmadoEm, confirmadoPor, id],
  );

  await syncFinanceiroReservaService(id, {
    usuarioId: usuarioIdLogado,
    origemAtor: "admin",
  });
  await notificarReservaAtualizada(id, usuarioIdLogado);

  return {
    id,
    status: novoStatus,
    status_pagamento: statusPagamentoFinal,
    observacao_pagamento: observacaoPagamento,
    confirmado_em: confirmadoEm,
    confirmado_por: confirmadoPor,
  };
}
