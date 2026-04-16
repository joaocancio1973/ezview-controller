import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createReserva,
  getReservas,
  getReservasAgenda,
  updateReservaStatus,
} from "../controllers/reservas.controller.js";

const router = Router();

router.get("/", authMiddleware, authorize(["admin", "morador"]), getReservas);
router.get("/agenda", authMiddleware, authorize(["admin", "morador"]), getReservasAgenda);
router.post("/", authMiddleware, authorize(["admin", "morador"]), createReserva);
router.patch("/:id/status", authMiddleware, authorize(["admin"]), updateReservaStatus);

export default router;
