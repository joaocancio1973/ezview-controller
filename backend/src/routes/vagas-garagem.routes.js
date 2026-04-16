import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createVagaGaragem,
  getVagasGaragem,
} from "../controllers/vagas-garagem.controller.js";

const router = Router();

router.get("/", authMiddleware, authorize(["admin"]), getVagasGaragem);
router.post("/", authMiddleware, authorize(["admin"]), createVagaGaragem);

export default router;
