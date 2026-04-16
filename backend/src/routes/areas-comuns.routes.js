import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createAreaComum,
  getAreasComuns,
} from "../controllers/areas-comuns.controller.js";

const router = Router();

router.get("/", authMiddleware, authorize(["admin", "morador"]), getAreasComuns);
router.post("/", authMiddleware, authorize(["admin"]), createAreaComum);

export default router;
