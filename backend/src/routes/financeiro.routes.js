import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  getFinanceiroCobrancaDetalhe,
  getFinanceiroCobrancas,
} from "../controllers/financeiro.controller.js";

const router = Router();

router.get("/cobrancas", authMiddleware, authorize(["admin"]), getFinanceiroCobrancas);
router.get("/cobrancas/:id", authMiddleware, authorize(["admin"]), getFinanceiroCobrancaDetalhe);

export default router;
