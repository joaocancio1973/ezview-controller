import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createFuncionario,
  getFuncionarios,
  getMeuCadastroFuncionario,
  patchFuncionarioStatus,
  resendFuncionarioInvite,
} from "../controllers/funcionarios.controller.js";

const router = Router();

router.get("/me", authMiddleware, authorize(["funcionario"]), getMeuCadastroFuncionario);
router.get("/", authMiddleware, authorize(["admin"]), getFuncionarios);
router.post("/", authMiddleware, authorize(["admin"]), createFuncionario);
router.post("/:id/enviar-convite", authMiddleware, authorize(["admin"]), resendFuncionarioInvite);
router.patch("/:id/status", authMiddleware, authorize(["admin"]), patchFuncionarioStatus);

export default router;
