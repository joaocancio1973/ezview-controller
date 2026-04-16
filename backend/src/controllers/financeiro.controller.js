import {
  getFinanceiroCobrancaDetalheService,
  listFinanceiroCobrancasService,
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
