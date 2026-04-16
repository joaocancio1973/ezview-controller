import {
  createAcessoEventoService,
  createAutorizacaoAcessoService,
  listHistoricoAcessoService,
  listAutorizacoesAcessoService,
  listFilaPortariaService,
  listSessoesPortariaService,
} from "../services/acessos.service.js";

export async function getAcessosAutorizacoes(req, res) {
  try {
    const autorizacoes = await listAutorizacoesAcessoService(req.user, req.query);
    return res.json({ autorizacoes });
  } catch (error) {
    console.error("Erro ao listar autorizacoes de acesso:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao listar autorizacoes" });
  }
}

export async function createAcessosAutorizacao(req, res) {
  try {
    const resultado = await createAutorizacaoAcessoService(req.user, req.body);
    return res.status(201).json({ mensagem: "Autorizacao criada com sucesso", resultado });
  } catch (error) {
    console.error("Erro ao criar autorizacao de acesso:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao criar autorizacao" });
  }
}

export async function getAcessosFila(req, res) {
  try {
    const resultado = await listFilaPortariaService(req.user, req.query);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao carregar fila da portaria:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao carregar fila" });
  }
}

export async function getAcessosSessoes(req, res) {
  try {
    const resultado = await listSessoesPortariaService(req.user);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao carregar sessoes da portaria:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao carregar sessoes da portaria" });
  }
}

export async function getAcessoHistorico(req, res) {
  try {
    const resultado = await listHistoricoAcessoService(req.user, req.params.id);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao carregar historico da autorizacao:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao carregar historico" });
  }
}

export async function createAcessoEvento(req, res) {
  try {
    const resultado = await createAcessoEventoService(req.user, req.body);
    return res.status(201).json({ mensagem: "Evento operacional registrado", resultado });
  } catch (error) {
    console.error("Erro ao registrar evento operacional:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao registrar evento" });
  }
}
