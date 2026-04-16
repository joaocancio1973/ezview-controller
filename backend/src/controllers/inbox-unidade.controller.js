import {
  createInboxUnidadeService,
  listInboxSugestoesService,
  listInboxUnidadeService,
  updateInboxUnidadeService,
  updateInboxUnidadeStatusService,
} from "../services/inbox-unidade.service.js";

export async function getInboxUnidade(req, res) {
  try {
    const resultado = await listInboxUnidadeService(req.user, req.query);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao listar inBox da unidade:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar inBox da unidade",
    });
  }
}

export async function getInboxSugestoes(req, res) {
  try {
    const pessoas = await listInboxSugestoesService(req.user, req.query);
    return res.json({ pessoas });
  } catch (error) {
    console.error("Erro ao sugerir pessoas do inBox:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao sugerir pessoas do inBox",
    });
  }
}

export async function createInboxUnidade(req, res) {
  try {
    const resultado = await createInboxUnidadeService(req.user, req.body);
    return res.status(201).json({
      mensagem: "Pessoa adicionada ao inBox com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao criar pessoa do inBox:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao criar pessoa do inBox",
    });
  }
}

export async function updateInboxUnidade(req, res) {
  try {
    const resultado = await updateInboxUnidadeService(req.user, req.params.id, req.body);
    return res.json({
      mensagem: "Pessoa do inBox atualizada com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao atualizar pessoa do inBox:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao atualizar pessoa do inBox",
    });
  }
}

export async function updateInboxStatus(req, res) {
  try {
    const resultado = await updateInboxUnidadeStatusService(req.user, req.params.id, req.body.status, req.body);
    return res.json({
      mensagem: "Status do inBox atualizado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao atualizar status do inBox:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao atualizar status do inBox",
    });
  }
}
