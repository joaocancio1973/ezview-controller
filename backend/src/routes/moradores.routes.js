import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createMeResidente,
  createMorador,
  getMeResidentes,
  getMoradores,
  resendMeResidenteInvite,
  resendMoradorInvite,
} from "../controllers/moradores.controller.js";

const router = Router();

router.get("/me/residentes", authMiddleware, authorize(["morador"]), getMeResidentes);
router.post("/me/residentes", authMiddleware, authorize(["morador"]), createMeResidente);
router.post("/me/residentes/:id/enviar-convite", authMiddleware, authorize(["morador"]), resendMeResidenteInvite);
router.get("/", authMiddleware, authorize(["admin"]), getMoradores);
router.post("/", authMiddleware, authorize(["admin"]), createMorador);
router.post("/:id/enviar-convite", authMiddleware, authorize(["admin"]), resendMoradorInvite);

export default router;
