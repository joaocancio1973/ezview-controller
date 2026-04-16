import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createUnidade,
  generateUnidadesByTower,
  getUnidades,
} from "../controllers/unidades.controller.js";

const router = Router();

/**
 * Listar unidades do admin logado
 */
router.get("/", authMiddleware, authorize(["admin"]), getUnidades);

/**
 * Criar unidade vinculada a um condominio do admin logado
 */
router.post("/", authMiddleware, authorize(["admin"]), createUnidade);

/**
 * Gerar unidades em lote a partir de uma torre do admin logado
 */
router.post(
  "/gerar-por-torre",
  authMiddleware,
  authorize(["admin"]),
  generateUnidadesByTower,
);

export default router;
