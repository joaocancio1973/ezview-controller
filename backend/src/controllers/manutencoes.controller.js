import {
  createManutencaoService,
  getManutencaoHistoricoService,
  listManutencoesService,
  updateManutencaoResponsavelService,
  updateManutencaoStatusService,
} from "../services/manutencoes.service.js";

export async function getManutencoes(req, res) {
  try {
    const ordens = await listManutencoesService(req.user, req.query);
    return res.json({ ordens });
  } catch (error) {
    console.error("Erro ao listar manutencoes:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao listar manutencoes" });
  }
}

export async function createManutencao(req, res) {
  try {
    const resultado = await createManutencaoService(req.user, req.body);
    return res.status(201).json({ mensagem: "Ordem de servico criada com sucesso", resultado });
  } catch (error) {
    console.error("Erro ao criar manutencao:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao criar manutencao" });
  }
}

export async function patchManutencaoStatus(req, res) {
  try {
    const resultado = await updateManutencaoStatusService(req.user, req.params.id, req.body);
    return res.json({ mensagem: "Status da ordem atualizado com sucesso", resultado });
  } catch (error) {
    console.error("Erro ao atualizar status da manutencao:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao atualizar status da manutencao" });
  }
}

export async function patchManutencaoResponsavel(req, res) {
  try {
    const resultado = await updateManutencaoResponsavelService(req.user, req.params.id, req.body);
    return res.json({ mensagem: "Responsavel atualizado com sucesso", resultado });
  } catch (error) {
    console.error("Erro ao atualizar responsavel da manutencao:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao atualizar responsavel da manutencao" });
  }
}

export async function getManutencaoHistorico(req, res) {
  try {
    const resultado = await getManutencaoHistoricoService(req.user, req.params.id);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao carregar historico da manutencao:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao carregar historico da manutencao" });
  }
}
