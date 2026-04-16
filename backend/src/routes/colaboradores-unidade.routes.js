import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createColaboradorUnidade,
  getColaboradoresUnidade,
  patchColaboradorUnidade,
  patchColaboradorUnidadeStatus,
} from "../controllers/colaboradores-unidade.controller.js";

const router = Router();

router.get("/", authMiddleware, authorize(["admin", "morador"]), getColaboradoresUnidade);
router.post("/", authMiddleware, authorize(["admin", "morador"]), createColaboradorUnidade);
router.patch("/:id", authMiddleware, authorize(["admin", "morador"]), patchColaboradorUnidade);
router.patch("/:id/status", authMiddleware, authorize(["admin", "morador"]), patchColaboradorUnidadeStatus);

export default router;
