import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
  getFinanceiroCobrancaDetalhe,
  getFinanceiroCobrancas,
  getFinanceiroResponsavelOpcoes,
  getFinanceiroResponsaveis,
  saveFinanceiroResponsavel,
} from "../controllers/financeiro.controller.js";

const router = Router();

router.get("/cobrancas", authMiddleware, authorize(["admin"]), getFinanceiroCobrancas);
router.get("/cobrancas/:id", authMiddleware, authorize(["admin"]), getFinanceiroCobrancaDetalhe);
router.get("/responsaveis", authMiddleware, authorize(["admin"]), getFinanceiroResponsaveis);
router.get("/unidades/:unidadeId/responsavel-opcoes", authMiddleware, authorize(["admin"]), getFinanceiroResponsavelOpcoes);
router.post("/responsaveis", authMiddleware, authorize(["admin"]), saveFinanceiroResponsavel);

export default router;
