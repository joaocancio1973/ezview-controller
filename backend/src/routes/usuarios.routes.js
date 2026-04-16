import { Router } from "express";
import { getUsuarios } from "../controllers/usuarios.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import superAdminOnly from "../middlewares/superAdmin.middleware.js";

const router = Router();

router.get("/", authMiddleware, superAdminOnly, getUsuarios);

export default router;
