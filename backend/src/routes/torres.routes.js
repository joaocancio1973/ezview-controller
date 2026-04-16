import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import { createTorres, getTorres } from "../controllers/torres.controller.js";

const router = Router();

/**
 * Listar torres do admin logado
 */
router.get("/", authMiddleware, authorize(["admin"]), getTorres);

/**
 * Criar torre vinculada a um condominio do admin logado
 */
router.post("/", authMiddleware, authorize(["admin"]), createTorres);

export default router;
