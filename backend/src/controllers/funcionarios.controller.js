import {
  createFuncionarioService,
  getFuncionarioMeService,
  listFuncionariosService,
  resendFuncionarioInviteService,
  updateFuncionarioStatusService,
} from "../services/funcionarios.service.js";

export async function getFuncionarios(req, res) {
  try {
    const funcionarios = await listFuncionariosService(req.user.id, req.query);
    return res.json({ funcionarios });
  } catch (error) {
    console.error("Erro ao listar funcionarios:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar funcionarios",
    });
  }
}

export async function createFuncionario(req, res) {
  try {
    const resultado = await createFuncionarioService(req.user.id, req.body);
    return res.status(201).json({
      mensagem: "Funcionario criado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao criar funcionario:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao criar funcionario",
    });
  }
}

export async function resendFuncionarioInvite(req, res) {
  try {
    const resultado = await resendFuncionarioInviteService(req.user.id, req.params.id);
    return res.json({
      mensagem: "Convite reenviado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao reenviar convite de funcionario:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao reenviar convite",
    });
  }
}

export async function patchFuncionarioStatus(req, res) {
  try {
    const resultado = await updateFuncionarioStatusService(req.user.id, req.params.id, req.body);
    return res.json({
      mensagem: "Status do funcionario atualizado com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao atualizar status do funcionario:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao atualizar status do funcionario",
    });
  }
}

export async function getMeuCadastroFuncionario(req, res) {
  try {
    const funcionario = await getFuncionarioMeService(req.user.id);
    return res.json({ funcionario });
  } catch (error) {
    console.error("Erro ao carregar cadastro funcional:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao carregar cadastro funcional",
    });
  }
}
