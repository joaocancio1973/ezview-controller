import { Router } from "express";
import setupController from "../controllers/setup.controller.js";

const router = Router();

// cria o primeiro super admin (uso único)
router.post("/super-admin", setupController.createSuperAdmin);

export default router;
