import {
  createUnidadeService,
  generateUnidadesByTowerService,
  listUnidadesService,
} from "../services/unidades.service.js";

export async function getUnidades(req, res) {
  try {
    const filtros = {
      condominio_id: req.query.condominio_id || null,
      torre_id: req.query.torre_id || null,
    };

    const unidades = await listUnidadesService(req.user.id, filtros);

    return res.status(200).json({
      sucesso: true,
      total: unidades.length,
      unidades,
    });
  } catch (error) {
    console.error("Erro ao listar unidades:", error);

    return res.status(error.status || 500).json({
      erro: error.message || "Erro interno ao listar unidades",
    });
  }
}

export async function createUnidade(req, res) {
  try {
    const unidade = await createUnidadeService(req.user.id, req.body);

    return res.status(201).json({
      sucesso: true,
      mensagem: "Unidade criada com sucesso",
      unidade,
    });
  } catch (error) {
    console.error("Erro ao criar unidade:", error);

    return res.status(error.status || 500).json({
      erro: error.message || "Erro interno ao criar unidade",
    });
  }
}

export async function generateUnidadesByTower(req, res) {
  try {
    const resultado = await generateUnidadesByTowerService(req.user.id, req.body);

    return res.status(201).json({
      sucesso: true,
      mensagem: "Unidades geradas com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao gerar unidades por torre:", error);

    return res.status(error.status || 500).json({
      erro: error.message || "Erro interno ao gerar unidades por torre",
      detalhes: error.details || null,
    });
  }
}
