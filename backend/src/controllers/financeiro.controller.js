import {
  getFinanceiroCobrancaDetalheService,
  listFinanceiroCobrancasService,
  listFinanceiroResponsaveisService,
  getFinanceiroResponsavelOpcoesService,
  saveFinanceiroResponsavelService,
} from "../services/financeiro.service.js";

export async function getFinanceiroCobrancas(req, res) {
  try {
    const resultado = await listFinanceiroCobrancasService(req.user, req.query);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao listar cobrancas financeiras:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar cobrancas financeiras",
    });
  }
}

export async function getFinanceiroCobrancaDetalhe(req, res) {
  try {
    const resultado = await getFinanceiroCobrancaDetalheService(req.user, req.params.id);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao carregar detalhe da cobranca:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao carregar detalhe da cobranca",
    });
  }
}

export async function getFinanceiroResponsaveis(req, res) {
  try {
    const resultado = await listFinanceiroResponsaveisService(req.user, req.query);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao listar responsaveis financeiros:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar responsaveis financeiros",
    });
  }
}

export async function getFinanceiroResponsavelOpcoes(req, res) {
  try {
    const resultado = await getFinanceiroResponsavelOpcoesService(req.user, req.params.unidadeId);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao carregar opcoes do responsavel financeiro:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao carregar opcoes do responsavel financeiro",
    });
  }
}

export async function saveFinanceiroResponsavel(req, res) {
  try {
    const resultado = await saveFinanceiroResponsavelService(req.user, req.body);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao salvar responsavel financeiro:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao salvar responsavel financeiro",
    });
  }
}
