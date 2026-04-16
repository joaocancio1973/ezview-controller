import { Router } from "express";
import {
  activateInvite,
  validateInvite,
} from "../controllers/moradores.controller.js";

const router = Router();

router.get("/validar", validateInvite);
router.post("/ativar", activateInvite);

export default router;
