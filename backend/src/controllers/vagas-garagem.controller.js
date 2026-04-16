import {
  createVagaGaragemService,
  listVagasGaragemService,
} from "../services/vagas-garagem.service.js";

export async function getVagasGaragem(req, res) {
  try {
    const vagas = await listVagasGaragemService(req.user.id, req.query);
    return res.json({ vagas });
  } catch (error) {
    console.error("Erro ao listar vagas de garagem:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar vagas de garagem",
    });
  }
}

export async function createVagaGaragem(req, res) {
  try {
    const vaga = await createVagaGaragemService(req.user.id, req.body);
    return res.status(201).json({
      mensagem: "Vaga de garagem criada com sucesso",
      vaga,
    });
  } catch (error) {
    console.error("Erro ao criar vaga de garagem:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao criar vaga de garagem",
    });
  }
}
