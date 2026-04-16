import {
  activateInviteService,
  createResidenteDaUnidadeService,
  createMoradorService,
  listResidentesDaUnidadeService,
  listMoradoresService,
  resendResidenteInviteService,
  resendMoradorInviteService,
  validateInviteService,
} from "../services/moradores.service.js";

export async function getMoradores(req, res) {
  try {
    const moradores = await listMoradoresService(req.user.id, req.query);
    return res.json({ moradores });
  } catch (error) {
    console.error("Erro ao listar moradores:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar moradores",
    });
  }
}

export async function createMorador(req, res) {
  try {
    const resultado = await createMoradorService(req.user.id, req.body);
    return res.status(201).json({
      mensagem: "Morador criado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao criar morador:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao criar morador",
    });
  }
}

export async function getMeResidentes(req, res) {
  try {
    const resultado = await listResidentesDaUnidadeService(req.user.id);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao listar residentes da unidade:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar residentes da unidade",
    });
  }
}

export async function createMeResidente(req, res) {
  try {
    const resultado = await createResidenteDaUnidadeService(req.user.id, req.body);
    return res.status(201).json({
      mensagem: "Residente criado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao criar residente da unidade:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao criar residente da unidade",
    });
  }
}

export async function resendMoradorInvite(req, res) {
  try {
    const resultado = await resendMoradorInviteService(req.user.id, req.params.id);
    return res.json({
      mensagem: "Convite reenviado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao reenviar convite:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao reenviar convite",
    });
  }
}

export async function resendMeResidenteInvite(req, res) {
  try {
    const resultado = await resendResidenteInviteService(req.user.id, req.params.id);
    return res.json({
      mensagem: "Convite reenviado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao reenviar convite do residente:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao reenviar convite do residente",
    });
  }
}

export async function validateInvite(req, res) {
  try {
    const resultado = await validateInviteService(req.query.token);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao validar convite:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao validar convite",
    });
  }
}

export async function activateInvite(req, res) {
  try {
    const resultado = await activateInviteService(req.body);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao ativar convite:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao ativar convite",
    });
  }
}
