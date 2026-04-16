import {
  archiveMensagemService,
  createMensagemInternaService,
  getCondominioScopeForUser,
  getMensagemDetalheService,
  getMensagensResumoService,
  listMensagemDestinatariosService,
  listMensagensService,
  markMensagemLidaService,
  registrarAcaoMensagemService,
} from "../services/mensagens.service.js";

export async function getMensagens(req, res) {
  try {
    const mensagens = await listMensagensService(req.user, req.query);
    return res.json({ mensagens });
  } catch (error) {
    console.error("Erro ao listar mensagens:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar mensagens",
    });
  }
}

export async function getMensagemDetalhe(req, res) {
  try {
    const resultado = await getMensagemDetalheService(req.user, req.params.id);
    return res.json(resultado);
  } catch (error) {
    console.error("Erro ao carregar detalhe da mensagem:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao carregar detalhe da mensagem",
    });
  }
}

export async function getMensagemDestinatarios(req, res) {
  try {
    const destinatarios = await listMensagemDestinatariosService(req.user, req.query);
    return res.json({ destinatarios });
  } catch (error) {
    console.error("Erro ao listar destinatarios de mensagens:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar destinatarios",
    });
  }
}

export async function getMensagensResumo(req, res) {
  try {
    const resumo = await getMensagensResumoService(req.user, req.query);
    return res.json({ resumo });
  } catch (error) {
    console.error("Erro ao carregar resumo de mensagens:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao carregar resumo de mensagens",
    });
  }
}

export async function createMensagem(req, res) {
  try {
    const destinatarios = Array.isArray(req.body?.destinatarios) ? req.body.destinatarios : [];
    const scope = await getCondominioScopeForUser(req.user);
    const resultado = await createMensagemInternaService({
      condominioId: req.body?.condominio_id || scope.condominio_id,
      remetenteId: req.user.id,
      criadoPorTipo: req.user.perfil,
      tipo: req.body?.tipo,
      categoriaEvento: req.body?.categoria_evento,
      entidadeTipo: req.body?.entidade_tipo,
      entidadeId: req.body?.entidade_id,
      mensagemPaiId: req.body?.mensagem_pai_id,
      titulo: req.body?.titulo,
      conteudo: req.body?.conteudo,
      prioridade: req.body?.prioridade,
      acaoRequerida: req.body?.acao_requerida,
      metadados: req.body?.metadados_json ?? req.body?.metadados,
      destinatarios,
      anexos: req.body?.anexos,
    });

    return res.status(201).json({
      mensagem: "Mensagem criada com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao criar mensagem:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao criar mensagem",
    });
  }
}

export async function patchMensagemLida(req, res) {
  try {
    const resultado = await markMensagemLidaService(req.user, req.params.id);
    return res.json({
      mensagem: "Mensagem marcada como lida",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao marcar mensagem como lida:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao marcar mensagem como lida",
    });
  }
}

export async function patchMensagemArquivar(req, res) {
  try {
    const resultado = await archiveMensagemService(req.user, req.params.id);
    return res.json({
      mensagem: "Mensagem arquivada com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao arquivar mensagem:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao arquivar mensagem",
    });
  }
}

export async function patchMensagemAcao(req, res) {
  try {
    const resultado = await registrarAcaoMensagemService(req.user, req.params.id, req.body || {});
    return res.json({
      mensagem: "Acao registrada com sucesso",
      resultado,
    });
  } catch (error) {
    console.error("Erro ao registrar acao da mensagem:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao registrar acao da mensagem",
    });
  }
}
