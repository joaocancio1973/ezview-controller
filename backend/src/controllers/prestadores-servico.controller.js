import {
  createPrestadorServicoService,
  getPrestadorServicoHistoricoService,
  listContatosPrestadoresService,
  listPrestadoresServicoService,
  listPrestadoresServicoSugestoesService,
  updatePrestadorServicoService,
  updatePrestadorServicoStatusService,
} from "../services/prestadores-servico.service.js";

export async function getPrestadoresServico(req, res) {
  try {
    const prestadores = await listPrestadoresServicoService(req.user, req.query);
    return res.json({ prestadores });
  } catch (error) {
    console.error("Erro ao listar prestadores de servico:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar prestadores de servico",
    });
  }
}

export async function getPrestadoresServicoContatos(req, res) {
  try {
    const prestadores = await listContatosPrestadoresService(req.user, req.query);
    return res.json({ prestadores });
  } catch (error) {
    console.error("Erro ao listar contatos utilitarios de prestadores:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar contatos utilitarios",
    });
  }
}

export async function getPrestadoresServicoSugestoes(req, res) {
  try {
    const prestadores = await listPrestadoresServicoSugestoesService(req.user, req.query);
    return res.json({ prestadores });
  } catch (error) {
    console.error("Erro ao sugerir prestadores de servico:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao sugerir prestadores",
    });
  }
}

export async function getPrestadorServicoHistorico(req, res) {
  try {
    const resultado = await getPrestadorServicoHistoricoService(req.user, req.params.id);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao carregar historico do prestador:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao carregar historico do prestador",
    });
  }
}

export async function createPrestadorServico(req, res) {
  try {
    const resultado = await createPrestadorServicoService(req.user, req.body);
    return res.status(201).json({
      mensagem: "Prestador de servico criado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao criar prestador de servico:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao criar prestador de servico",
    });
  }
}

export async function patchPrestadorServico(req, res) {
  try {
    const resultado = await updatePrestadorServicoService(req.user, req.params.id, req.body);
    return res.json({
      mensagem: "Prestador de servico atualizado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao atualizar prestador de servico:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao atualizar prestador de servico",
    });
  }
}

export async function patchPrestadorServicoStatus(req, res) {
  try {
    const resultado = await updatePrestadorServicoStatusService(req.user, req.params.id, req.body);
    return res.json({
      mensagem: "Status do prestador atualizado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao atualizar status do prestador:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao atualizar status do prestador",
    });
  }
}
