import { Router } from "express";
import {
  createAdmin,
  getAdmins,
  getMyAdminCapacity,
} from "../controllers/admins.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import superAdminOnly from "../middlewares/superAdmin.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";

const router = Router();

/**
 * Resumo de capacidade do admin logado
 */
router.get("/me/capacidade", authMiddleware, authorize(["admin"]), getMyAdminCapacity);

/**
 * Criar Admin (somente Super Admin)
 */
router.post("/", authMiddleware, superAdminOnly, createAdmin);

/**
 * Listar Admins (somente Super Admin)
 */
router.get("/", authMiddleware, superAdminOnly, getAdmins);

export default router;
