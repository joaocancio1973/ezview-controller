import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createManutencao,
  getManutencaoHistorico,
  getManutencoes,
  patchManutencaoResponsavel,
  patchManutencaoStatus,
} from "../controllers/manutencoes.controller.js";

const router = Router();

router.get("/", authMiddleware, authorize(["admin", "funcionario"]), getManutencoes);
router.get("/:id/historico", authMiddleware, authorize(["admin", "funcionario"]), getManutencaoHistorico);
router.post("/", authMiddleware, authorize(["admin", "funcionario"]), createManutencao);
router.patch("/:id/status", authMiddleware, authorize(["admin", "funcionario"]), patchManutencaoStatus);
router.patch("/:id/responsavel", authMiddleware, authorize(["admin"]), patchManutencaoResponsavel);

export default router;
