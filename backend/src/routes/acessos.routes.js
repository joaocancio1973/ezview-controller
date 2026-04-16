import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createAcessoEvento,
  getAcessoHistorico,
  createAcessosAutorizacao,
  getAcessosAutorizacoes,
  getAcessosFila,
  getAcessosSessoes,
} from "../controllers/acessos.controller.js";

const router = Router();

router.get("/autorizacoes", authMiddleware, authorize(["admin", "morador", "funcionario"]), getAcessosAutorizacoes);
router.get("/autorizacoes/:id/historico", authMiddleware, authorize(["admin", "morador", "funcionario"]), getAcessoHistorico);
router.post("/autorizacoes", authMiddleware, authorize(["admin", "morador", "funcionario"]), createAcessosAutorizacao);
router.get("/fila", authMiddleware, authorize(["funcionario", "admin"]), getAcessosFila);
router.get("/sessoes", authMiddleware, authorize(["funcionario", "admin"]), getAcessosSessoes);
router.post("/eventos", authMiddleware, authorize(["funcionario"]), createAcessoEvento);

export default router;
