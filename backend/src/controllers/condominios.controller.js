import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";
import { isValidCnpj, normalizeCnpj } from "../utils/cnpj.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

export async function criarCondominio(req, res) {
  const usuarioId = req.user.id;

  const cnpjNormalizado = normalizeCnpj(req.body.cnpj);
  const razaoSocial = normalizeText(req.body.razao_social);
  const nomeFantasia = normalizeText(req.body.nome_fantasia);
  const tipo = normalizeText(req.body.tipo);
  const cep = normalizeText(req.body.cep);
  const endereco = normalizeText(req.body.endereco);
  const numero = normalizeText(req.body.numero);
  const complemento = normalizeText(req.body.complemento);
  const bairro = normalizeText(req.body.bairro);
  const cidade = normalizeText(req.body.cidade);
  const estado = normalizeText(req.body.estado);

  try {
    const [adminRows] = await db.execute(
      "SELECT * FROM admins WHERE usuario_id = ?",
      [usuarioId],
    );

    if (adminRows.length === 0) {
      return res.status(403).json({
        erro: "Usuario nao possui registro de admin",
      });
    }

    const admin = adminRows[0];

    if (admin.status !== "ativo") {
      return res.status(403).json({
        erro: "Admin inativo ou suspenso",
      });
    }

    if (!isValidCnpj(cnpjNormalizado)) {
      return res.status(400).json({
        erro: "CNPJ invalido",
      });
    }

    const [cnpjRows] = await db.execute(
      `SELECT id
       FROM condominios
       WHERE REGEXP_REPLACE(cnpj, '[^0-9]', '') = ?
       LIMIT 1`,
      [cnpjNormalizado],
    );

    if (cnpjRows.length > 0) {
      return res.status(409).json({
        erro: "Ja existe um condominio cadastrado com este CNPJ",
      });
    }

    const [countRows] = await db.execute(
      "SELECT COUNT(*) as total FROM condominios WHERE admin_id = ?",
      [usuarioId],
    );

    const totalCondominios = countRows[0].total;

    if (totalCondominios >= admin.limite_condominios) {
      return res.status(403).json({
        erro: "Limite de condominios atingido para seu plano",
      });
    }

    const novoId = uuidv4();

    await db.execute(
      `INSERT INTO condominios (
        id,
        admin_id,
        cnpj,
        razao_social,
        nome_fantasia,
        tipo,
        cep,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        novoId,
        usuarioId,
        cnpjNormalizado,
        razaoSocial,
        nomeFantasia,
        tipo,
        cep,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
      ],
    );

    return res.status(201).json({
      mensagem: "Condominio criado com sucesso",
      id: novoId,
    });
  } catch (error) {
    console.error("ERRO MYSQL:", error);

    return res.status(500).json({
      erro: error.message || "Erro interno ao criar condominio",
    });
  }
}

export async function listarCondominios(req, res) {
  const usuarioId = req.user.id;

  try {
    const [adminRows] = await db.execute(
      "SELECT * FROM admins WHERE usuario_id = ?",
      [usuarioId],
    );

    if (adminRows.length === 0) {
      return res.status(403).json({
        erro: "Usuario nao possui acesso de admin",
      });
    }

    const [rows] = await db.execute(
      `SELECT
        id,
        REGEXP_REPLACE(cnpj, '[^0-9]', '') AS cnpj,
        nome_fantasia,
        cidade,
        estado
      FROM condominios
      WHERE admin_id = ?
      ORDER BY nome_fantasia ASC`,
      [usuarioId],
    );

    return res.json(rows);
  } catch (error) {
    console.error("Erro ao listar condominios:", error);

    return res.status(500).json({
      erro: "Erro ao listar condominios",
    });
  }
}
