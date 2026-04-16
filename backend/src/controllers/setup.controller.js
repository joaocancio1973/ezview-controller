import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

const setupController = {
  async createSuperAdmin(req, res) {
    const { nome_completo, email, senha } = req.body;

    if (!nome_completo || !email || !senha) {
      return res.status(400).json({
        erro: "Nome, email e senha são obrigatórios",
      });
    }

    try {
      // 🔒 verifica se já existe super_admin
      const [existente] = await db.query(
        "SELECT id FROM usuarios WHERE perfil = 'super_admin' LIMIT 1",
      );

      if (existente.length > 0) {
        return res.status(403).json({
          erro: "Super Admin já existe. Setup bloqueado.",
        });
      }

      // 🔒 verifica email duplicado
      const [emailUsado] = await db.query(
        "SELECT id FROM usuarios WHERE email = ?",
        [email],
      );

      if (emailUsado.length > 0) {
        return res.status(400).json({
          erro: "Email já cadastrado",
        });
      }

      const senhaHash = await bcrypt.hash(senha, 10);

      await db.query(
        `INSERT INTO usuarios (
          id,
          nome_completo,
          email,
          senha_hash,
          perfil,
          status
        ) VALUES (?, ?, ?, ?, 'super_admin', 'ativo')`,
        [uuidv4(), nome_completo, email, senhaHash],
      );

      return res.status(201).json({
        sucesso: true,
        mensagem: "Super Admin criado com sucesso",
      });
    } catch (error) {
      console.error("❌ ERRO SETUP SUPER ADMIN:", error);
      return res.status(500).json({
        erro: "Erro ao criar Super Admin",
      });
    }
  },
};

export default setupController;
