import bcrypt from "bcrypt";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

const AREAS_ATUACAO = new Set(["portaria", "limpeza", "manutencao", "administrativo", "outro"]);
const STATUS_FUNCIONARIO = new Set(["ativo", "inativo", "afastado", "desligado"]);
const STATUS_CONVITE_PENDENTE = "pendente";
const HORAS_EXPIRACAO_CONVITE = 48;
const ACTIVATION_BASE_URL = "http://localhost:3000/pages/ativar-conta.html";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function buildInviteHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildActivationLink(token) {
  return `${ACTIVATION_BASE_URL}?token=${token}`;
}

function buildInviteExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + HORAS_EXPIRACAO_CONVITE);
  return expiresAt;
}

function buildTemporaryPassword() {
  return crypto.randomBytes(24).toString("hex");
}

async function getAdminScopedCondominio(adminUsuarioId, condominioId) {
  const [rows] = await db.query(
    `
    SELECT id, nome_fantasia, admin_id, ativo
    FROM condominios
    WHERE id = ? AND admin_id = ?
    LIMIT 1
    `,
    [condominioId, adminUsuarioId],
  );

  if (!rows.length) {
    const error = new Error("Condominio invalido ou fora do escopo do admin logado");
    error.status = 404;
    throw error;
  }

  const condominio = rows[0];

  if (Number(condominio.ativo) !== 1) {
    const error = new Error("Condominio inativo");
    error.status = 403;
    throw error;
  }

  return condominio;
}

async function getUsuarioByEmail(connection, email) {
  const [rows] = await connection.query(
    `
    SELECT id, nome_completo, email, perfil, status
    FROM usuarios
    WHERE email = ?
    LIMIT 1
    `,
    [email],
  );

  return rows[0] || null;
}

async function createInvite(connection, { usuarioId, condominioId, funcionarioId, emailDestino, criadoPor }) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = buildInviteHash(token);
  const conviteId = uuidv4();
  const expiraEm = buildInviteExpiryDate();

  await connection.query(
    `
    UPDATE convites_ativacao
    SET status = 'cancelado'
    WHERE funcionario_id = ?
      AND status = 'pendente'
    `,
    [funcionarioId],
  );

  await connection.query(
    `
    INSERT INTO convites_ativacao
      (id, tipo_convite, usuario_id, condominio_id, unidade_id, funcionario_id, email_destino, token_hash, status, expira_em, enviado_em, criado_por)
    VALUES
      (?, 'funcionario', ?, ?, NULL, ?, ?, ?, 'pendente', ?, NOW(), ?)
    `,
    [conviteId, usuarioId, condominioId, funcionarioId, emailDestino, tokenHash, expiraEm, criadoPor],
  );

  return {
    id: conviteId,
    token,
    status: STATUS_CONVITE_PENDENTE,
    expira_em: expiraEm,
  };
}

export async function listFuncionariosService(adminUsuarioId, filtros = {}) {
  const params = [adminUsuarioId];
  let extraWhere = "";

  if (filtros.condominio_id) {
    extraWhere += " AND f.condominio_id = ?";
    params.push(filtros.condominio_id);
  }

  if (filtros.status) {
    extraWhere += " AND f.status = ?";
    params.push(filtros.status);
  }

  if (filtros.area_atuacao) {
    extraWhere += " AND f.area_atuacao = ?";
    params.push(filtros.area_atuacao);
  }

  const [rows] = await db.query(
    `
    SELECT
      f.id,
      f.usuario_id,
      f.condominio_id,
      f.area_atuacao,
      f.cargo,
      f.matricula,
      f.foto_identificacao_url,
      f.status,
      f.cartao_ativo,
      f.admitido_em,
      f.desligado_em,
      usr.nome_completo,
      usr.email,
      usr.phone_whatsapp,
      usr.status AS usuario_status,
      c.nome_fantasia AS condominio_nome,
      conv.status AS convite_status,
      conv.expira_em AS convite_expira_em,
      conv.enviado_em AS convite_enviado_em
    FROM funcionarios f
    INNER JOIN usuarios usr ON usr.id = f.usuario_id
    INNER JOIN condominios c ON c.id = f.condominio_id
    LEFT JOIN convites_ativacao conv
      ON conv.id = (
        SELECT ca.id
        FROM convites_ativacao ca
        WHERE ca.funcionario_id = f.id
        ORDER BY ca.criado_em DESC
        LIMIT 1
      )
    WHERE c.admin_id = ?${extraWhere}
    ORDER BY c.nome_fantasia ASC, f.area_atuacao ASC, usr.nome_completo ASC
    `,
    params,
  );

  return rows;
}

export async function createFuncionarioService(adminUsuarioId, data) {
  const condominioId = normalizeText(data.condominio_id);
  const nomeCompleto = normalizeText(data.nome_completo);
  const email = normalizeText(data.email)?.toLowerCase();
  const phoneWhatsapp = normalizeText(data.phone_whatsapp);
  const areaAtuacao = normalizeText(data.area_atuacao || "outro");
  const cargo = normalizeText(data.cargo);
  const matricula = normalizeText(data.matricula);
  const fotoIdentificacaoUrl = normalizeText(data.foto_identificacao_url);
  const admitidoEm = normalizeText(data.admitido_em);

  if (!condominioId || !nomeCompleto || !email || !cargo || !matricula) {
    const error = new Error("Campos obrigatorios nao informados");
    error.status = 400;
    throw error;
  }

  if (!AREAS_ATUACAO.has(areaAtuacao)) {
    const error = new Error("Area de atuacao invalida");
    error.status = 400;
    throw error;
  }

  const condominio = await getAdminScopedCondominio(adminUsuarioId, condominioId);

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    let usuario = await getUsuarioByEmail(connection, email);

    if (usuario && usuario.perfil !== "funcionario") {
      const error = new Error("Ja existe um usuario com este email em outro perfil");
      error.status = 409;
      throw error;
    }

    if (!usuario) {
      const usuarioId = uuidv4();
      const senhaTemporariaHash = await bcrypt.hash(buildTemporaryPassword(), 10);

      await connection.query(
        `
        INSERT INTO usuarios
          (id, nome_completo, email, senha_hash, perfil, phone_whatsapp, status)
        VALUES
          (?, ?, ?, ?, 'funcionario', ?, 'inativo')
        `,
        [usuarioId, nomeCompleto, email, senhaTemporariaHash, phoneWhatsapp || null],
      );

      usuario = {
        id: usuarioId,
        email,
        perfil: "funcionario",
        status: "inativo",
      };
    }

    const [existingRows] = await connection.query(
      `
      SELECT id, condominio_id, status
      FROM funcionarios
      WHERE usuario_id = ?
      LIMIT 1
      `,
      [usuario.id],
    );

    if (existingRows.length) {
      const error = new Error("Este usuario ja possui vinculo funcional cadastrado");
      error.status = 409;
      throw error;
    }

    const funcionarioId = uuidv4();

    await connection.query(
      `
      INSERT INTO funcionarios
        (id, usuario_id, condominio_id, area_atuacao, cargo, matricula, foto_identificacao_url, status, cartao_ativo, admitido_em, criado_por)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, 'ativo', 0, ?, ?)
      `,
      [
        funcionarioId,
        usuario.id,
        condominio.id,
        areaAtuacao,
        cargo,
        matricula,
        fotoIdentificacaoUrl || null,
        admitidoEm || null,
        adminUsuarioId,
      ],
    );

    const convite = await createInvite(connection, {
      usuarioId: usuario.id,
      condominioId: condominio.id,
      funcionarioId,
      emailDestino: email,
      criadoPor: adminUsuarioId,
    });

    await connection.commit();

    return {
      funcionario: {
        id: funcionarioId,
        nome_completo: nomeCompleto,
        email,
        phone_whatsapp: phoneWhatsapp || null,
        area_atuacao: areaAtuacao,
        cargo,
        matricula,
        foto_identificacao_url: fotoIdentificacaoUrl || null,
        status: "ativo",
      },
      condominio: {
        id: condominio.id,
        nome_fantasia: condominio.nome_fantasia,
      },
      convite: {
        id: convite.id,
        status: convite.status,
        expira_em: convite.expira_em,
        link_ativacao_temporario: buildActivationLink(convite.token),
      },
    };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function resendFuncionarioInviteService(adminUsuarioId, funcionarioId) {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT
        f.id,
        f.usuario_id,
        f.area_atuacao,
        f.cargo,
        usr.nome_completo,
        usr.email,
        c.id AS condominio_id,
        c.nome_fantasia AS condominio_nome
      FROM funcionarios f
      INNER JOIN usuarios usr ON usr.id = f.usuario_id
      INNER JOIN condominios c ON c.id = f.condominio_id
      WHERE f.id = ?
        AND c.admin_id = ?
      LIMIT 1
      `,
      [funcionarioId, adminUsuarioId],
    );

    if (!rows.length) {
      const error = new Error("Funcionario nao encontrado no escopo do admin logado");
      error.status = 404;
      throw error;
    }

    const funcionario = rows[0];

    const convite = await createInvite(connection, {
      usuarioId: funcionario.usuario_id,
      condominioId: funcionario.condominio_id,
      funcionarioId: funcionario.id,
      emailDestino: funcionario.email,
      criadoPor: adminUsuarioId,
    });

    await connection.commit();

    return {
      funcionario: {
        id: funcionario.id,
        nome_completo: funcionario.nome_completo,
        email: funcionario.email,
        area_atuacao: funcionario.area_atuacao,
        cargo: funcionario.cargo,
      },
      condominio: {
        id: funcionario.condominio_id,
        nome_fantasia: funcionario.condominio_nome,
      },
      convite: {
        id: convite.id,
        status: convite.status,
        expira_em: convite.expira_em,
        link_ativacao_temporario: buildActivationLink(convite.token),
      },
    };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function updateFuncionarioStatusService(adminUsuarioId, funcionarioId, data) {
  const status = normalizeText(data.status);

  if (!STATUS_FUNCIONARIO.has(status)) {
    const error = new Error("Status funcional invalido");
    error.status = 400;
    throw error;
  }

  const [rows] = await db.query(
    `
    SELECT f.id
    FROM funcionarios f
    INNER JOIN condominios c ON c.id = f.condominio_id
    WHERE f.id = ? AND c.admin_id = ?
    LIMIT 1
    `,
    [funcionarioId, adminUsuarioId],
  );

  if (!rows.length) {
    const error = new Error("Funcionario nao encontrado no escopo do admin logado");
    error.status = 404;
    throw error;
  }

  await db.query(
    `
    UPDATE funcionarios
    SET status = ?,
        desligado_em = CASE WHEN ? = 'desligado' THEN NOW() ELSE NULL END,
        atualizado_por = ?
    WHERE id = ?
    `,
    [status, status, adminUsuarioId, funcionarioId],
  );

  return { sucesso: true, status };
}

export async function getFuncionarioMeService(usuarioId) {
  const [rows] = await db.query(
    `
    SELECT
      f.id,
      f.area_atuacao,
      f.cargo,
      f.matricula,
      f.foto_identificacao_url,
      f.status,
      f.admitido_em,
      c.id AS condominio_id,
      c.nome_fantasia AS condominio_nome,
      c.cidade,
      c.estado,
      usr.nome_completo,
      usr.email,
      usr.phone_whatsapp
    FROM funcionarios f
    INNER JOIN usuarios usr ON usr.id = f.usuario_id
    INNER JOIN condominios c ON c.id = f.condominio_id
    WHERE f.usuario_id = ?
    LIMIT 1
    `,
    [usuarioId],
  );

  if (!rows.length) {
    const error = new Error("Cadastro funcional nao encontrado");
    error.status = 404;
    throw error;
  }

  return rows[0];
}
