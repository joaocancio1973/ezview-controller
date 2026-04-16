import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createOcorrencia,
  getOcorrenciaHistorico,
  getOcorrencias,
  patchOcorrencia,
  patchOcorrenciaResponsavel,
  patchOcorrenciaStatus,
} from "../controllers/ocorrencias.controller.js";

const router = Router();

router.get("/", authMiddleware, authorize(["admin", "morador", "funcionario"]), getOcorrencias);
router.get("/:id/historico", authMiddleware, authorize(["admin", "morador", "funcionario"]), getOcorrenciaHistorico);
router.post("/", authMiddleware, authorize(["admin", "morador", "funcionario"]), createOcorrencia);
router.patch("/:id", authMiddleware, authorize(["admin", "funcionario"]), patchOcorrencia);
router.patch("/:id/status", authMiddleware, authorize(["admin", "funcionario"]), patchOcorrenciaStatus);
router.patch("/:id/responsavel", authMiddleware, authorize(["admin"]), patchOcorrenciaResponsavel);

export default router;
