import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  criarCondominio,
  listarCondominios,
} from "../controllers/condominios.controller.js";

const router = express.Router();

/**
 * LISTAR CONDOMÍNIOS
 * Admin visualiza seus condomínios
 */
router.get("/", authMiddleware, authorize(["admin"]), listarCondominios);

/**
 * CRIAR CONDOMÍNIO
 * Admin cria condomínio
 */
router.post("/", authMiddleware, authorize(["admin"]), criarCondominio);

export default router;
