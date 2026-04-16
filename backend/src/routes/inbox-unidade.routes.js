import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createInboxUnidade,
  getInboxSugestoes,
  getInboxUnidade,
  updateInboxStatus,
  updateInboxUnidade,
} from "../controllers/inbox-unidade.controller.js";

const router = Router();

router.get("/", authMiddleware, authorize(["admin", "morador"]), getInboxUnidade);
router.get("/sugestoes", authMiddleware, authorize(["admin", "morador", "funcionario"]), getInboxSugestoes);
router.post("/", authMiddleware, authorize(["admin", "morador"]), createInboxUnidade);
router.patch("/:id", authMiddleware, authorize(["admin", "morador"]), updateInboxUnidade);
router.patch("/:id/status", authMiddleware, authorize(["admin", "morador"]), updateInboxStatus);

export default router;
