import express from "express";
import { getPlanos } from "../controllers/planos.controller.js";

const router = express.Router();

router.get("/", getPlanos);

export default router;
