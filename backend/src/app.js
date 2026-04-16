import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import db from "./config/database.js";
import setupRoutes from "./routes/setup.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminsRoutes from "./routes/admins.routes.js";
import planosRoutes from "./routes/planos.routes.js";
import condominiosRoutes from "./routes/condominios.routes.js";
import torresRoutes from "./routes/torres.routes.js";
import unidadesRoutes from "./routes/unidades.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import areasComunsRoutes from "./routes/areas-comuns.routes.js";
import reservasRoutes from "./routes/reservas.routes.js";
import moradoresRoutes from "./routes/moradores.routes.js";
import convitesRoutes from "./routes/convites.routes.js";
import veiculosRoutes from "./routes/veiculos.routes.js";
import vagasGaragemRoutes from "./routes/vagas-garagem.routes.js";
import funcionariosRoutes from "./routes/funcionarios.routes.js";
import acessosRoutes from './routes/acessos.routes.js';
import colaboradoresUnidadeRoutes from './routes/colaboradores-unidade.routes.js';
import prestadoresServicoRoutes from './routes/prestadores-servico.routes.js';
import ocorrenciasRoutes from './routes/ocorrencias.routes.js';
import inboxUnidadeRoutes from './routes/inbox-unidade.routes.js';
import mensagensRoutes from "./routes/mensagens.routes.js";
import manutencoesRoutes from "./routes/manutencoes.routes.js";
import financeiroRoutes from "./routes/financeiro.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

// ===============================
// ROTAS API
// ===============================

// autenticação
app.use("/auth", authRoutes);

// setup inicial
app.use("/setup", setupRoutes);

// admins (Super Admin)
app.use("/admins", adminsRoutes);

// condomínios
app.use("/condominios", condominiosRoutes);

// torres
app.use("/torres", torresRoutes);

// unidades
app.use("/unidades", unidadesRoutes);

// areas comuns
app.use("/areas-comuns", areasComunsRoutes);

// reservas
app.use("/reservas", reservasRoutes);

// moradores
app.use("/moradores", moradoresRoutes);

// convites de ativacao
app.use("/convites", convitesRoutes);

// funcionarios
app.use("/funcionarios", funcionariosRoutes);

// acessos
app.use("/acessos", acessosRoutes);

// colaboradores da unidade
app.use("/colaboradores-unidade", colaboradoresUnidadeRoutes);

// inbox da unidade
app.use("/inbox-unidade", inboxUnidadeRoutes);

// prestadores de servico
app.use("/prestadores-servico", prestadoresServicoRoutes);

// ocorrencias e manutencao
app.use("/ocorrencias", ocorrenciasRoutes);

// inbox interno / mensagens
app.use("/mensagens", mensagensRoutes);

// financeiro e cobrancas
app.use("/financeiro", financeiroRoutes);

// manutencoes e reformas
app.use("/manutencoes", manutencoesRoutes);

// veiculos
app.use("/veiculos", veiculosRoutes);

// vagas de garagem
app.use("/vagas-garagem", vagasGaragemRoutes);

// planos
app.use("/planos", planosRoutes);

// usuarios (Super Admin)
app.use("/usuarios", usuariosRoutes);

// ===============================
// FRONTEND ESTÁTICO
// ===============================
app.use(express.static(path.join(__dirname, "../../frontend")));

// ===============================
// HEALTH CHECK
// ===============================
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// login amigável
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/login.html"));
});

// teste de banco
app.get("/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS conectado");
    res.json({ status: "ok", banco: "conectado", resultado: rows });
  } catch (error) {
    res.status(500).json({
      erro: "Falha no banco",
      detalhe: error.message,
    });
  }
});

export default app;



