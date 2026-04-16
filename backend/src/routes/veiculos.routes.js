import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  createVeiculo,
  getVeiculoById,
  getVeiculos,
  getVeiculoMarcas,
  getVeiculoModeloAnos,
  getVeiculoModelos,
  updateVeiculo,
} from "../controllers/veiculos.controller.js";

const router = Router();

router.get("/", authMiddleware, authorize(["admin"]), getVeiculos);
router.post("/", authMiddleware, authorize(["admin"]), createVeiculo);

router.get(
  "/catalogo/marcas",
  authMiddleware,
  authorize(["admin"]),
  getVeiculoMarcas,
);

router.get(
  "/catalogo/modelos",
  authMiddleware,
  authorize(["admin"]),
  getVeiculoModelos,
);

router.get(
  "/catalogo/anos",
  authMiddleware,
  authorize(["admin"]),
  getVeiculoModeloAnos,
);

router.get("/:id", authMiddleware, authorize(["admin"]), getVeiculoById);
router.put("/:id", authMiddleware, authorize(["admin"]), updateVeiculo);

export default router;
