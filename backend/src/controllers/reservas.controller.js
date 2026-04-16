import {
  createReservaService,
  listReservasAgendaService,
  listReservasService,
  updateReservaStatusService,
} from "../services/reservas.service.js";

export async function getReservas(req, res) {
  try {
    const filtros = {
      condominio_id: req.query.condominio_id || null,
      area_id: req.query.area_id || null,
      unidade_id: req.query.unidade_id || null,
      data_inicio: req.query.data_inicio || null,
      data_fim: req.query.data_fim || null,
    };

    const reservas = await listReservasService(req.user, filtros);

    return res.status(200).json({
      sucesso: true,
      total: reservas.length,
      reservas,
    });
  } catch (error) {
    console.error("Erro ao listar reservas:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro interno ao listar reservas",
    });
  }
}

export async function getReservasAgenda(req, res) {
  try {
    const filtros = {
      condominio_id: req.query.condominio_id || null,
      area_id: req.query.area_id || null,
      data_inicio: req.query.data_inicio || null,
      data_fim: req.query.data_fim || null,
    };

    const agenda = await listReservasAgendaService(req.user, filtros);

    return res.status(200).json({
      sucesso: true,
      total: agenda.length,
      agenda,
    });
  } catch (error) {
    console.error("Erro ao listar agenda de reservas:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro interno ao listar agenda",
    });
  }
}

export async function createReserva(req, res) {
  try {
    const reserva = await createReservaService(req.user, req.body);

    return res.status(201).json({
      sucesso: true,
      mensagem: "Reserva criada com sucesso",
      reserva,
    });
  } catch (error) {
    console.error("Erro ao criar reserva:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro interno ao criar reserva",
    });
  }
}

export async function updateReservaStatus(req, res) {
  try {
    const reserva = await updateReservaStatusService(req.user.id, req.params.id, req.body);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Reserva atualizada com sucesso",
      reserva,
    });
  } catch (error) {
    console.error("Erro ao atualizar reserva:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro interno ao atualizar reserva",
    });
  }
}
