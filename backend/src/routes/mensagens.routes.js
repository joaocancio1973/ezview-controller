import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createMensagem,
  getMensagemDestinatarios,
  getMensagemDetalhe,
  getMensagens,
  getMensagensResumo,
  patchMensagemAcao,
  patchMensagemArquivar,
  patchMensagemLida,
} from "../controllers/mensagens.controller.js";

const router = Router();

router.get("/", authMiddleware, authorize(["admin", "morador", "funcionario"]), getMensagens);
router.get("/resumo", authMiddleware, authorize(["admin", "morador", "funcionario"]), getMensagensResumo);
router.get("/destinatarios", authMiddleware, authorize(["admin", "morador", "funcionario"]), getMensagemDestinatarios);
router.get("/:id", authMiddleware, authorize(["admin", "morador", "funcionario"]), getMensagemDetalhe);
router.post("/", authMiddleware, authorize(["admin", "morador", "funcionario"]), createMensagem);
router.patch("/:id/lida", authMiddleware, authorize(["admin", "morador", "funcionario"]), patchMensagemLida);
router.patch("/:id/arquivar", authMiddleware, authorize(["admin", "morador", "funcionario"]), patchMensagemArquivar);
router.patch("/:id/acao", authMiddleware, authorize(["admin", "morador", "funcionario"]), patchMensagemAcao);

export default router;
