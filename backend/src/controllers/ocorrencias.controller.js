import {
  createOcorrenciaService,
  getOcorrenciaHistoricoService,
  listOcorrenciasService,
  updateOcorrenciaResponsavelService,
  updateOcorrenciaService,
  updateOcorrenciaStatusService,
} from "../services/ocorrencias.service.js";

export async function getOcorrencias(req, res) {
  try {
    const ocorrencias = await listOcorrenciasService(req.user, req.query);
    return res.json({ ocorrencias });
  } catch (error) {
    console.error("Erro ao listar ocorrencias:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar ocorrencias",
    });
  }
}

export async function createOcorrencia(req, res) {
  try {
    const resultado = await createOcorrenciaService(req.user, req.body);
    return res.status(201).json({
      mensagem: "Ocorrencia criada com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao criar ocorrencia:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao criar ocorrencia",
    });
  }
}

export async function patchOcorrencia(req, res) {
  try {
    const resultado = await updateOcorrenciaService(req.user, req.params.id, req.body);
    return res.json({
      mensagem: "Ocorrencia atualizada com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao atualizar ocorrencia:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao atualizar ocorrencia",
    });
  }
}

export async function patchOcorrenciaStatus(req, res) {
  try {
    const resultado = await updateOcorrenciaStatusService(req.user, req.params.id, req.body);
    return res.json({
      mensagem: "Status da ocorrencia atualizado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao atualizar status da ocorrencia:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao atualizar status da ocorrencia",
    });
  }
}

export async function patchOcorrenciaResponsavel(req, res) {
  try {
    const resultado = await updateOcorrenciaResponsavelService(req.user, req.params.id, req.body);
    return res.json({
      mensagem: "Responsavel da ocorrencia atualizado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao atualizar responsavel da ocorrencia:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao atualizar responsavel da ocorrencia",
    });
  }
}

export async function getOcorrenciaHistorico(req, res) {
  try {
    const resultado = await getOcorrenciaHistoricoService(req.user, req.params.id);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao carregar historico da ocorrencia:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao carregar historico da ocorrencia",
    });
  }
}
