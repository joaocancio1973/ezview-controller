import {
  createColaboradorUnidadeService,
  listColaboradoresUnidadeService,
  updateColaboradorUnidadeService,
  updateColaboradorUnidadeStatusService,
} from "../services/colaboradores-unidade.service.js";

export async function getColaboradoresUnidade(req, res) {
  try {
    const colaboradores = await listColaboradoresUnidadeService(req.user, req.query);
    return res.json({ colaboradores });
  } catch (error) {
    console.error("Erro ao listar colaboradores da unidade:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar colaboradores da unidade",
    });
  }
}

export async function createColaboradorUnidade(req, res) {
  try {
    const resultado = await createColaboradorUnidadeService(req.user, req.body);
    return res.status(201).json({
      mensagem: "Colaborador da unidade criado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao criar colaborador da unidade:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao criar colaborador da unidade",
    });
  }
}

export async function patchColaboradorUnidade(req, res) {
  try {
    const resultado = await updateColaboradorUnidadeService(req.user, req.params.id, req.body);
    return res.json({
      mensagem: "Colaborador da unidade atualizado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao atualizar colaborador da unidade:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao atualizar colaborador da unidade",
    });
  }
}

export async function patchColaboradorUnidadeStatus(req, res) {
  try {
    const resultado = await updateColaboradorUnidadeStatusService(req.user, req.params.id, req.body);
    return res.json({
      mensagem: "Status do colaborador atualizado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao atualizar status do colaborador:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao atualizar status do colaborador",
    });
  }
}
