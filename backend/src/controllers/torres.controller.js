import { createTorresService, listTorresService } from "../services/torres.service.js";

export async function getTorres(req, res) {
  try {
    const condominioId = req.query.condominio_id || null;
    const torres = await listTorresService(req.user.id, condominioId);

    return res.status(200).json({
      sucesso: true,
      total: torres.length,
      torres,
    });
  } catch (error) {
    console.error("Erro ao listar torres:", error);

    return res.status(error.status || 500).json({
      erro: error.message || "Erro interno ao listar torres",
    });
  }
}

export async function createTorres(req, res) {
  try {
    const torre = await createTorresService(req.user.id, req.body);

    return res.status(201).json({
      sucesso: true,
      mensagem: "Torre criada com sucesso",
      torre,
    });
  } catch (error) {
    console.error("Erro ao criar torre:", error);

    return res.status(error.status || 500).json({
      erro: error.message || "Erro interno ao criar torre",
    });
  }
}
