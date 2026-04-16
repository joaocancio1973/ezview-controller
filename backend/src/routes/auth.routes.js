import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { getMeuPerfil, login, logout, pingSessao, updateMeuPerfil } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", login);
router.get("/me", authMiddleware, getMeuPerfil);
router.patch("/me", authMiddleware, updateMeuPerfil);
router.post("/logout", authMiddleware, logout);
router.post("/ping", authMiddleware, pingSessao);

export default router;
