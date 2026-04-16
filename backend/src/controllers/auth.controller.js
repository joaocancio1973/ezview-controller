import db from "../config/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "../../../frontend");
const PERFIS_UPLOAD_DIR = path.join(FRONTEND_ROOT, "uploads", "perfis");

async function criarSessaoFuncionario(usuarioId, origem = "web") {
  const [rows] = await db.query(
    `
    SELECT id, condominio_id, status, area_atuacao
    FROM funcionarios
    WHERE usuario_id = ?
    LIMIT 1
    `,
    [usuarioId],
  );

  if (!rows.length) {
    const error = new Error("Cadastro funcional nao encontrado");
    error.status = 404;
    throw error;
  }

  const funcionario = rows[0];

  if (funcionario.status !== "ativo") {
    const error = new Error("Funcionario sem vinculo ativo para operar");
    error.status = 403;
    throw error;
  }

  const sessaoId = uuidv4();
  await db.query(
    `
    INSERT INTO funcionarios_sessoes
      (id, funcionario_id, condominio_id, status, origem, iniciado_em, ultimo_ping_em)
    VALUES
      (?, ?, ?, 'ativa', ?, NOW(), NOW())
    `,
    [sessaoId, funcionario.id, funcionario.condominio_id, origem],
  );

  return {
    sessao_id: sessaoId,
    funcionario_id: funcionario.id,
    condominio_id: funcionario.condominio_id,
    area_atuacao: funcionario.area_atuacao,
  };
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function parseSingleImagePayload(rawImage) {
  if (!rawImage) return null;

  const payload = typeof rawImage === "string" ? JSON.parse(rawImage) : rawImage;
  const dataUrl = normalizeText(payload?.data_url);
  const nomeOriginal = normalizeText(payload?.nome_original) || "perfil.jpg";

  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    const error = new Error("Foto de perfil invalida");
    error.status = 400;
    throw error;
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    const error = new Error("Foto de perfil em formato invalido");
    error.status = 400;
    throw error;
  }

  const mimeType = match[1].toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    const error = new Error("Formato de foto de perfil nao suportado");
    error.status = 400;
    throw error;
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
    const error = new Error("Foto de perfil excede o tamanho permitido");
    error.status = 400;
    throw error;
  }

  const extensao = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return { nomeOriginal, mimeType, buffer, extensao };
}

async function persistProfilePhoto(usuarioId, rawImage) {
  const image = parseSingleImagePayload(rawImage);
  if (!image) return null;

  await fs.mkdir(PERFIS_UPLOAD_DIR, { recursive: true });
  const fileName = `${usuarioId}-${Date.now()}.${image.extensao}`;
  const filePath = path.join(PERFIS_UPLOAD_DIR, fileName);
  await fs.writeFile(filePath, image.buffer);
  return `/uploads/perfis/${fileName}`;
}

async function buildUsuarioContexto(usuarioId) {
  const [baseRows] = await db.query(
    `
    SELECT
      id,
      nome_completo,
      email,
      perfil,
      phone_whatsapp,
      documento_identificacao,
      foto_perfil_url,
      status
    FROM usuarios
    WHERE id = ?
    LIMIT 1
    `,
    [usuarioId],
  );

  if (!baseRows.length) {
    const error = new Error("Usuario nao encontrado");
    error.status = 404;
    throw error;
  }

  const usuario = baseRows[0];
  const contexto = {
    id: usuario.id,
    nome: usuario.nome_completo,
    email: usuario.email,
    perfil: usuario.perfil,
    phone_whatsapp: usuario.phone_whatsapp,
    documento_identificacao: usuario.documento_identificacao,
    foto_perfil_url: usuario.foto_perfil_url,
    status: usuario.status,
    contexto: null,
  };

  if (usuario.perfil === "morador") {
    const [rows] = await db.query(
      `
      SELECT
        uu.papel,
        uu.unidade_id,
        u.identificacao AS unidade_identificacao,
        u.condominio_id,
        c.nome_fantasia AS condominio_nome,
        t.nome AS torre_nome
      FROM unidade_usuarios uu
      INNER JOIN unidades u ON u.id = uu.unidade_id
      INNER JOIN condominios c ON c.id = u.condominio_id
      LEFT JOIN torres t ON t.id = u.torre_id
      WHERE uu.usuario_id = ?
        AND uu.ativo = 1
      ORDER BY FIELD(uu.papel, 'titular','proprietario','dependente'), uu.criado_em ASC
      LIMIT 1
      `,
      [usuarioId],
    );

    if (rows.length) {
      contexto.contexto = {
        papel_unidade: rows[0].papel,
        unidade_id: rows[0].unidade_id,
        unidade_identificacao: rows[0].unidade_identificacao,
        torre_nome: rows[0].torre_nome,
        condominio_id: rows[0].condominio_id,
        condominio_nome: rows[0].condominio_nome,
      };
    }
  }

  if (usuario.perfil === "funcionario") {
    const [rows] = await db.query(
      `
      SELECT
        f.id AS funcionario_id,
        f.condominio_id,
        f.area_atuacao,
        f.cargo,
        f.matricula,
        c.nome_fantasia AS condominio_nome
      FROM funcionarios f
      INNER JOIN condominios c ON c.id = f.condominio_id
      WHERE f.usuario_id = ?
      LIMIT 1
      `,
      [usuarioId],
    );

    if (rows.length) {
      contexto.contexto = {
        funcionario_id: rows[0].funcionario_id,
        condominio_id: rows[0].condominio_id,
        condominio_nome: rows[0].condominio_nome,
        area_atuacao: rows[0].area_atuacao,
        cargo: rows[0].cargo,
        matricula: rows[0].matricula,
      };
    }
  }

  if (usuario.perfil === "admin") {
    const [rows] = await db.query(
      `
      SELECT id AS condominio_id, nome_fantasia AS condominio_nome
      FROM condominios
      WHERE admin_id = ?
      ORDER BY criado_em ASC
      LIMIT 1
      `,
      [usuarioId],
    );

    if (rows.length) {
      contexto.contexto = rows[0];
    }
  }

  return contexto;
}

export async function login(req, res) {
  const { email, senha, origem } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: "Email e senha obrigatorios" });
  }

  try {
    const [rows] = await db.query(
      "SELECT id, nome_completo, email, senha_hash, perfil FROM usuarios WHERE email = ? AND status = 'ativo'",
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ erro: "Credenciais invalidas" });
    }

    const usuario = rows[0];
    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaOk) {
      return res.status(401).json({ erro: "Credenciais invalidas" });
    }

    let sessaoFuncionario = null;
    if (usuario.perfil === "funcionario") {
      sessaoFuncionario = await criarSessaoFuncionario(usuario.id, origem || "web");
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        perfil: usuario.perfil,
        sessao_funcionario_id: sessaoFuncionario?.sessao_id || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome_completo,
        email: usuario.email,
        perfil: usuario.perfil,
        sessao_funcionario_id: sessaoFuncionario?.sessao_id || null,
      },
    });
  } catch (error) {
    console.error("Erro login:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro interno" });
  }
}

export async function getMeuPerfil(req, res) {
  try {
    const perfil = await buildUsuarioContexto(req.user.id);
    return res.json({ perfil });
  } catch (error) {
    console.error("Erro ao carregar meu perfil:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao carregar perfil" });
  }
}

export async function updateMeuPerfil(req, res) {
  try {
    const nome = normalizeText(req.body?.nome) || null;
    const phoneWhatsapp = normalizeText(req.body?.phone_whatsapp) || null;
    const documentoIdentificacao = normalizeText(req.body?.documento_identificacao) || null;
    const fotoPerfilUrl = req.body?.foto_perfil ? await persistProfilePhoto(req.user.id, req.body.foto_perfil) : null;

    await db.query(
      `
      UPDATE usuarios
      SET
        nome_completo = COALESCE(?, nome_completo),
        phone_whatsapp = ?,
        documento_identificacao = ?,
        foto_perfil_url = COALESCE(?, foto_perfil_url)
      WHERE id = ?
      `,
      [nome, phoneWhatsapp, documentoIdentificacao, fotoPerfilUrl, req.user.id],
    );

    const perfil = await buildUsuarioContexto(req.user.id);
    return res.json({
      mensagem: "Perfil atualizado com sucesso",
      perfil,
    });
  } catch (error) {
    console.error("Erro ao atualizar meu perfil:", error);
    return res.status(error.status || 500).json({ erro: error.message || "Erro ao atualizar perfil" });
  }
}

export async function logout(req, res) {
  try {
    if (req.user?.perfil === "funcionario" && req.user?.sessao_funcionario_id) {
      await db.query(
        `
        UPDATE funcionarios_sessoes
        SET status = 'encerrada', encerrado_em = NOW(), ultimo_ping_em = NOW()
        WHERE id = ? AND status = 'ativa'
        `,
        [req.user.sessao_funcionario_id],
      );
    }

    return res.json({ sucesso: true });
  } catch (error) {
    console.error("Erro logout:", error);
    return res.status(500).json({ erro: "Erro ao encerrar sessao" });
  }
}

export async function pingSessao(req, res) {
  try {
    if (req.user?.perfil === "funcionario" && req.user?.sessao_funcionario_id) {
      await db.query(
        `
        UPDATE funcionarios_sessoes
        SET ultimo_ping_em = NOW()
        WHERE id = ? AND status = 'ativa'
        `,
        [req.user.sessao_funcionario_id],
      );
    }

    return res.json({ sucesso: true });
  } catch (error) {
    console.error("Erro ping de sessao:", error);
    return res.status(500).json({ erro: "Erro ao atualizar sessao" });
  }
}
