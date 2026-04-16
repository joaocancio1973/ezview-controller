import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createPrestadorServico,
  getPrestadorServicoHistorico,
  getPrestadoresServico,
  getPrestadoresServicoContatos,
  getPrestadoresServicoSugestoes,
  patchPrestadorServico,
  patchPrestadorServicoStatus,
} from "../controllers/prestadores-servico.controller.js";

const router = Router();

router.get("/", authMiddleware, authorize(["admin", "funcionario"]), getPrestadoresServico);
router.get("/contatos", authMiddleware, authorize(["admin", "morador"]), getPrestadoresServicoContatos);
router.get("/sugestoes", authMiddleware, authorize(["admin", "morador", "funcionario"]), getPrestadoresServicoSugestoes);
router.get("/:id/historico", authMiddleware, authorize(["admin", "funcionario"]), getPrestadorServicoHistorico);
router.post("/", authMiddleware, authorize(["admin", "funcionario"]), createPrestadorServico);
router.patch("/:id", authMiddleware, authorize(["admin"]), patchPrestadorServico);
router.patch("/:id/status", authMiddleware, authorize(["admin"]), patchPrestadorServicoStatus);

export default router;
