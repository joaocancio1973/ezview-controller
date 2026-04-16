import {
  createAreaComumService,
  listAreasComunsService,
} from "../services/areas-comuns.service.js";

export async function getAreasComuns(req, res) {
  try {
    const filtros = {
      condominio_id: req.query.condominio_id || null,
      exige_reserva: req.query.exige_reserva ?? null,
    };

    const areas = await listAreasComunsService(req.user, filtros);

    return res.status(200).json({
      sucesso: true,
      total: areas.length,
      areas,
    });
  } catch (error) {
    console.error("Erro ao listar areas comuns:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro interno ao listar areas comuns",
    });
  }
}

export async function createAreaComum(req, res) {
  try {
    const area = await createAreaComumService(req.user.id, req.body);

    return res.status(201).json({
      sucesso: true,
      mensagem: "Area comum criada com sucesso",
      area,
    });
  } catch (error) {
    console.error("Erro ao criar area comum:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro interno ao criar area comum",
    });
  }
}
