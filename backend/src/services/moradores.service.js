import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

const PAPEIS_UNIDADE = new Set(["proprietario", "titular", "dependente"]);
const STATUS_CONVITE_PENDENTE = "pendente";
const HORAS_EXPIRACAO_CONVITE = 48;
const ACTIVATION_BASE_URL = "http://localhost:3000/pages/ativar-conta.html";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "../../../frontend");
const PERFIS_UPLOAD_DIR = path.join(FRONTEND_ROOT, "uploads", "perfis");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "on", "sim", "yes"].includes(normalized);
  }
  return false;
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

async function getAdminScopedUnidade(adminUsuarioId, unidadeId, condominioId = null) {
  const params = [unidadeId, adminUsuarioId];
  let extraWhere = "";

  if (condominioId) {
    extraWhere = " AND u.condominio_id = ?";
    params.push(condominioId);
  }

  const [rows] = await db.query(
    `
    SELECT
      u.id,
      u.condominio_id,
      u.torre_id,
      u.identificacao,
      u.ativo,
      c.nome_fantasia AS condominio_nome,
      t.nome AS torre_nome
    FROM unidades u
    INNER JOIN condominios c ON c.id = u.condominio_id
    LEFT JOIN torres t ON t.id = u.torre_id
    WHERE u.id = ? AND c.admin_id = ?${extraWhere}
    LIMIT 1
    `,
    params,
  );

  if (!rows.length) {
    const error = new Error("Unidade invalida ou fora do escopo do admin logado");
    error.status = 404;
    throw error;
  }

  const unidade = rows[0];

  if (Number(unidade.ativo) !== 1) {
    const error = new Error("Unidade inativa");
    error.status = 403;
    throw error;
  }

  return unidade;
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

async function getTitularScopedUnidade(usuarioId) {
  const [rows] = await db.query(
    `
    SELECT
      uu.unidade_id,
      uu.usuario_id,
      uu.papel,
      u.condominio_id,
      u.identificacao AS unidade_identificacao,
      c.nome_fantasia AS condominio_nome,
      t.nome AS torre_nome
    FROM unidade_usuarios uu
    INNER JOIN unidades u ON u.id = uu.unidade_id
    INNER JOIN condominios c ON c.id = u.condominio_id
    LEFT JOIN torres t ON t.id = u.torre_id
    WHERE uu.usuario_id = ?
      AND uu.ativo = 1
      AND uu.papel = 'titular'
    ORDER BY uu.criado_em ASC
    LIMIT 1
    `,
    [usuarioId],
  );

  if (!rows.length) {
    const error = new Error("Somente o titular ativo da unidade pode cadastrar residentes");
    error.status = 403;
    throw error;
  }

  return rows[0];
}

async function ensureTitularDisponivel(connection, unidadeId, papel, usuarioId = null) {
  if (papel !== "titular") {
    return;
  }

  const params = [unidadeId];
  let extraWhere = "";

  if (usuarioId) {
    extraWhere = " AND usuario_id <> ?";
    params.push(usuarioId);
  }

  const [rows] = await connection.query(
    `
    SELECT id
    FROM unidade_usuarios
    WHERE unidade_id = ?
      AND papel = 'titular'
      AND ativo = 1${extraWhere}
    LIMIT 1
    `,
    params,
  );

  if (rows.length) {
    const error = new Error("A unidade ja possui um titular ativo");
    error.status = 409;
    throw error;
  }
}

async function createInvite(connection, { tipoConvite = "morador", usuarioId, condominioId, unidadeId = null, funcionarioId = null, emailDestino, criadoPor }) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = buildInviteHash(token);
  const conviteId = uuidv4();
  const expiraEm = buildInviteExpiryDate();

  if (tipoConvite === "funcionario" && funcionarioId) {
    await connection.query(
      `
      UPDATE convites_ativacao
      SET status = 'cancelado'
      WHERE funcionario_id = ?
        AND status = 'pendente'
      `,
      [funcionarioId],
    );
  } else {
    await connection.query(
      `
      UPDATE convites_ativacao
      SET status = 'cancelado'
      WHERE usuario_id = ?
        AND unidade_id = ?
        AND status = 'pendente'
      `,
      [usuarioId, unidadeId],
    );
  }

  await connection.query(
    `
    INSERT INTO convites_ativacao
      (id, tipo_convite, usuario_id, condominio_id, unidade_id, funcionario_id, email_destino, token_hash, status, expira_em, enviado_em, criado_por)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, NOW(), ?)
    `,
    [
      conviteId,
      tipoConvite,
      usuarioId,
      condominioId || null,
      unidadeId || null,
      funcionarioId || null,
      emailDestino,
      tokenHash,
      expiraEm,
      criadoPor,
    ],
  );

  return {
    id: conviteId,
    token,
    status: STATUS_CONVITE_PENDENTE,
    expira_em: expiraEm,
  };
}

export async function listMoradoresService(adminUsuarioId, filtros = {}) {
  const params = [adminUsuarioId];
  let extraWhere = "";

  if (filtros.condominio_id) {
    extraWhere += " AND u.condominio_id = ?";
    params.push(filtros.condominio_id);
  }

  if (filtros.unidade_id) {
    extraWhere += " AND uu.unidade_id = ?";
    params.push(filtros.unidade_id);
  }

  if (filtros.status) {
    extraWhere += " AND usr.status = ?";
    params.push(filtros.status);
  }

  if (filtros.papel) {
    extraWhere += " AND uu.papel = ?";
    params.push(filtros.papel);
  }

  const [rows] = await db.query(
    `
    SELECT
      usr.id,
      usr.nome_completo,
      usr.email,
      usr.phone_whatsapp,
      usr.documento_identificacao,
      usr.foto_perfil_url,
      usr.status AS usuario_status,
      uu.papel,
      uu.ativo AS vinculo_ativo,
      u.id AS unidade_id,
      u.identificacao AS unidade_identificacao,
      u.condominio_id,
      c.nome_fantasia AS condominio_nome,
      t.nome AS torre_nome,
      conv.status AS convite_status,
      conv.expira_em AS convite_expira_em,
      conv.enviado_em AS convite_enviado_em
    FROM unidade_usuarios uu
    INNER JOIN usuarios usr ON usr.id = uu.usuario_id
    INNER JOIN unidades u ON u.id = uu.unidade_id
    INNER JOIN condominios c ON c.id = u.condominio_id
    LEFT JOIN torres t ON t.id = u.torre_id
    LEFT JOIN convites_ativacao conv
      ON conv.id = (
        SELECT ca.id
        FROM convites_ativacao ca
        WHERE ca.usuario_id = usr.id
          AND ca.unidade_id = u.id
        ORDER BY ca.criado_em DESC
        LIMIT 1
      )
    WHERE c.admin_id = ?${extraWhere}
    ORDER BY c.nome_fantasia ASC, COALESCE(t.nome, '') ASC, u.identificacao ASC, usr.nome_completo ASC
    `,
    params,
  );

  return rows;
}

export async function listResidentesDaUnidadeService(usuarioId) {
  const contexto = await getTitularScopedUnidade(usuarioId);

  const [rows] = await db.query(
    `
    SELECT
      usr.id,
      usr.nome_completo,
      usr.email,
      usr.phone_whatsapp,
      usr.documento_identificacao,
      usr.foto_perfil_url,
      usr.status AS usuario_status,
      uu.papel,
      uu.ativo AS vinculo_ativo,
      conv.status AS convite_status,
      conv.expira_em AS convite_expira_em,
      conv.enviado_em AS convite_enviado_em
    FROM unidade_usuarios uu
    INNER JOIN usuarios usr ON usr.id = uu.usuario_id
    LEFT JOIN convites_ativacao conv
      ON conv.id = (
        SELECT ca.id
        FROM convites_ativacao ca
        WHERE ca.usuario_id = usr.id
          AND ca.unidade_id = uu.unidade_id
        ORDER BY ca.criado_em DESC
        LIMIT 1
      )
    WHERE uu.unidade_id = ?
    ORDER BY FIELD(uu.papel, 'titular', 'proprietario', 'dependente'), uu.criado_em ASC, usr.nome_completo ASC
    `,
    [contexto.unidade_id],
  );

  return {
    unidade: {
      id: contexto.unidade_id,
      condominio_id: contexto.condominio_id,
      identificacao: contexto.unidade_identificacao,
      condominio_nome: contexto.condominio_nome,
      torre_nome: contexto.torre_nome,
    },
    residentes: rows,
  };
}

export async function createMoradorService(adminUsuarioId, data) {
  const condominioId = normalizeText(data.condominio_id);
  const unidadeId = normalizeText(data.unidade_id);
  const nomeCompleto = normalizeText(data.nome_completo);
  const email = normalizeText(data.email)?.toLowerCase();
  const phoneWhatsapp = normalizeText(data.phone_whatsapp);
  const documentoIdentificacao = normalizeText(data.documento_identificacao);
  const papel = normalizeText(data.papel || "titular");
  const fotoPerfilPayload = data.foto_perfil ?? data.foto_perfil_payload ?? null;

  if (!condominioId || !unidadeId || !nomeCompleto || !email) {
    const error = new Error("Campos obrigatorios nao informados");
    error.status = 400;
    throw error;
  }

  if (!PAPEIS_UNIDADE.has(papel)) {
    const error = new Error("Papel invalido para o vinculo da unidade");
    error.status = 400;
    throw error;
  }

  const unidade = await getAdminScopedUnidade(adminUsuarioId, unidadeId, condominioId);

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    await ensureTitularDisponivel(connection, unidade.id, papel);

    let usuario = await getUsuarioByEmail(connection, email);

    if (usuario && usuario.perfil !== "morador") {
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
          (id, nome_completo, email, senha_hash, perfil, phone_whatsapp, documento_identificacao, status)
        VALUES
          (?, ?, ?, ?, 'morador', ?, ?, 'inativo')
        `,
        [usuarioId, nomeCompleto, email, senhaTemporariaHash, phoneWhatsapp || null, documentoIdentificacao || null],
      );

      usuario = {
        id: usuarioId,
        nome_completo: nomeCompleto,
        email,
        perfil: "morador",
        status: "inativo",
      };
    }

    if (fotoPerfilPayload) {
      const fotoPerfilUrl = await persistProfilePhoto(usuario.id, fotoPerfilPayload);
      await connection.query(
        `
        UPDATE usuarios
        SET foto_perfil_url = ?
        WHERE id = ?
        `,
        [fotoPerfilUrl, usuario.id],
      );
      usuario.foto_perfil_url = fotoPerfilUrl;
    }

    const [existingVinculoRows] = await connection.query(
      `
      SELECT id, papel, ativo
      FROM unidade_usuarios
      WHERE unidade_id = ? AND usuario_id = ?
      LIMIT 1
      `,
      [unidade.id, usuario.id],
    );

    if (existingVinculoRows.length) {
      const existing = existingVinculoRows[0];

      if (existing.papel !== papel || Number(existing.ativo) !== 1) {
        await ensureTitularDisponivel(connection, unidade.id, papel, usuario.id);

        await connection.query(
          `
          UPDATE unidade_usuarios
          SET papel = ?, ativo = 1
          WHERE id = ?
          `,
          [papel, existing.id],
        );
      }
    } else {
      await connection.query(
        `
        INSERT INTO unidade_usuarios
          (id, unidade_id, usuario_id, papel, ativo)
        VALUES
          (?, ?, ?, ?, 1)
        `,
        [uuidv4(), unidade.id, usuario.id, papel],
      );
    }

    const convite = await createInvite(connection, {
      tipoConvite: "morador",
      usuarioId: usuario.id,
      condominioId: unidade.condominio_id,
      unidadeId: unidade.id,
      emailDestino: email,
      criadoPor: adminUsuarioId,
    });

    await connection.commit();

    return {
      usuario: {
        id: usuario.id,
        nome_completo: nomeCompleto,
        email,
        documento_identificacao: documentoIdentificacao || null,
        foto_perfil_url: usuario.foto_perfil_url || null,
        status: usuario.status === "ativo" ? "ativo" : "inativo",
      },
      unidade: {
        id: unidade.id,
        identificacao: unidade.identificacao,
        condominio_id: unidade.condominio_id,
        condominio_nome: unidade.condominio_nome,
        torre_nome: unidade.torre_nome,
      },
      vinculo: {
        papel,
        ativo: 1,
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

export async function createResidenteDaUnidadeService(usuarioId, data) {
  const contexto = await getTitularScopedUnidade(usuarioId);
  const nomeCompleto = normalizeText(data.nome_completo);
  const email = normalizeText(data.email)?.toLowerCase();
  const phoneWhatsapp = normalizeText(data.phone_whatsapp);
  const documentoIdentificacao = normalizeText(data.documento_identificacao);
  const papel = normalizeText(data.papel || "dependente");
  const fotoPerfilPayload = data.foto_perfil ?? data.foto_perfil_payload ?? null;

  if (!nomeCompleto || !email) {
    const error = new Error("Nome completo e email sao obrigatorios");
    error.status = 400;
    throw error;
  }

  if (!["dependente", "proprietario"].includes(papel)) {
    const error = new Error("O titular so pode agregar dependentes ou proprietarios");
    error.status = 400;
    throw error;
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    let usuario = await getUsuarioByEmail(connection, email);

    if (usuario && usuario.perfil !== "morador") {
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
          (id, nome_completo, email, senha_hash, perfil, phone_whatsapp, documento_identificacao, status)
        VALUES
          (?, ?, ?, ?, 'morador', ?, ?, 'inativo')
        `,
        [usuarioId, nomeCompleto, email, senhaTemporariaHash, phoneWhatsapp || null, documentoIdentificacao || null],
      );

      usuario = {
        id: usuarioId,
        nome_completo: nomeCompleto,
        email,
        perfil: "morador",
        status: "inativo",
      };
    } else {
      await connection.query(
        `
        UPDATE usuarios
        SET
          nome_completo = COALESCE(NULLIF(?, ''), nome_completo),
          phone_whatsapp = COALESCE(?, phone_whatsapp),
          documento_identificacao = COALESCE(?, documento_identificacao)
        WHERE id = ?
        `,
        [nomeCompleto, phoneWhatsapp || null, documentoIdentificacao || null, usuario.id],
      );
    }

    if (fotoPerfilPayload) {
      const fotoPerfilUrl = await persistProfilePhoto(usuario.id, fotoPerfilPayload);
      await connection.query(
        `
        UPDATE usuarios
        SET foto_perfil_url = ?
        WHERE id = ?
        `,
        [fotoPerfilUrl, usuario.id],
      );
      usuario.foto_perfil_url = fotoPerfilUrl;
    }

    const [existingRows] = await connection.query(
      `
      SELECT id, papel, ativo
      FROM unidade_usuarios
      WHERE unidade_id = ? AND usuario_id = ?
      LIMIT 1
      `,
      [contexto.unidade_id, usuario.id],
    );

    if (existingRows.length) {
      await connection.query(
        `
        UPDATE unidade_usuarios
        SET papel = ?, ativo = 1
        WHERE id = ?
        `,
        [papel, existingRows[0].id],
      );
    } else {
      await connection.query(
        `
        INSERT INTO unidade_usuarios
          (id, unidade_id, usuario_id, papel, ativo)
        VALUES
          (?, ?, ?, ?, 1)
        `,
        [uuidv4(), contexto.unidade_id, usuario.id, papel],
      );
    }

    const convite = await createInvite(connection, {
      tipoConvite: "morador",
      usuarioId: usuario.id,
      condominioId: contexto.condominio_id,
      unidadeId: contexto.unidade_id,
      emailDestino: email,
      criadoPor: usuarioId,
    });

    await connection.commit();

    return {
      residente: {
        id: usuario.id,
        nome_completo: nomeCompleto,
        email,
        phone_whatsapp: phoneWhatsapp || null,
        documento_identificacao: documentoIdentificacao || null,
        foto_perfil_url: usuario.foto_perfil_url || null,
        status: usuario.status === "ativo" ? "ativo" : "inativo",
      },
      unidade: {
        id: contexto.unidade_id,
        identificacao: contexto.unidade_identificacao,
        condominio_id: contexto.condominio_id,
        condominio_nome: contexto.condominio_nome,
        torre_nome: contexto.torre_nome,
      },
      vinculo: {
        papel,
        ativo: 1,
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

export async function resendMoradorInviteService(adminUsuarioId, moradorId) {
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT
        usr.id,
        usr.email,
        usr.nome_completo,
        u.id AS unidade_id,
        u.identificacao AS unidade_identificacao,
        u.condominio_id,
        c.nome_fantasia AS condominio_nome
      FROM usuarios usr
      INNER JOIN unidade_usuarios uu ON uu.usuario_id = usr.id AND uu.ativo = 1
      INNER JOIN unidades u ON u.id = uu.unidade_id
      INNER JOIN condominios c ON c.id = u.condominio_id
      WHERE usr.id = ?
        AND usr.perfil = 'morador'
        AND c.admin_id = ?
      ORDER BY uu.criado_em ASC
      LIMIT 1
      `,
      [moradorId, adminUsuarioId],
    );

    if (!rows.length) {
      const error = new Error("Morador nao encontrado no escopo do admin logado");
      error.status = 404;
      throw error;
    }

    const morador = rows[0];

    const convite = await createInvite(connection, {
      tipoConvite: "morador",
      usuarioId: morador.id,
      condominioId: morador.condominio_id,
      unidadeId: morador.unidade_id,
      emailDestino: morador.email,
      criadoPor: adminUsuarioId,
    });

    await connection.commit();

    return {
      morador: {
        id: morador.id,
        nome_completo: morador.nome_completo,
        email: morador.email,
      },
      unidade: {
        id: morador.unidade_id,
        identificacao: morador.unidade_identificacao,
        condominio_nome: morador.condominio_nome,
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

export async function resendResidenteInviteService(usuarioId, moradorId) {
  const contexto = await getTitularScopedUnidade(usuarioId);
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT
        usr.id,
        usr.email,
        usr.nome_completo,
        uu.papel
      FROM usuarios usr
      INNER JOIN unidade_usuarios uu ON uu.usuario_id = usr.id AND uu.ativo = 1
      WHERE usr.id = ?
        AND uu.unidade_id = ?
      LIMIT 1
      `,
      [moradorId, contexto.unidade_id],
    );

    if (!rows.length) {
      const error = new Error("Residente nao encontrado na sua unidade");
      error.status = 404;
      throw error;
    }

    const residente = rows[0];

    if (residente.id === usuarioId) {
      const error = new Error("Nao e necessario reenviar convite para o proprio titular");
      error.status = 409;
      throw error;
    }

    const convite = await createInvite(connection, {
      tipoConvite: "morador",
      usuarioId: residente.id,
      condominioId: contexto.condominio_id,
      unidadeId: contexto.unidade_id,
      emailDestino: residente.email,
      criadoPor: usuarioId,
    });

    await connection.commit();

    return {
      residente: {
        id: residente.id,
        nome_completo: residente.nome_completo,
        email: residente.email,
        papel: residente.papel,
      },
      unidade: {
        id: contexto.unidade_id,
        identificacao: contexto.unidade_identificacao,
        condominio_nome: contexto.condominio_nome,
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

export async function validateInviteService(token) {
  const normalizedToken = normalizeText(token);

  if (!normalizedToken) {
    const error = new Error("Token de convite nao informado");
    error.status = 400;
    throw error;
  }

  const tokenHash = buildInviteHash(normalizedToken);

  const [rows] = await db.query(
    `
    SELECT
      conv.id,
      conv.tipo_convite,
      conv.status,
      conv.expira_em,
      usr.id AS usuario_id,
      usr.nome_completo,
      usr.email,
      cond.nome_fantasia AS condominio,
      u.identificacao AS unidade,
      t.nome AS torre,
      uu.papel,
      f.cargo,
      f.area_atuacao
    FROM convites_ativacao conv
    INNER JOIN usuarios usr ON usr.id = conv.usuario_id
    LEFT JOIN condominios cond ON cond.id = conv.condominio_id
    LEFT JOIN unidades u ON u.id = conv.unidade_id
    LEFT JOIN torres t ON t.id = u.torre_id
    LEFT JOIN unidade_usuarios uu ON uu.unidade_id = u.id AND uu.usuario_id = usr.id
    LEFT JOIN funcionarios f ON f.id = conv.funcionario_id
    WHERE conv.token_hash = ?
    LIMIT 1
    `,
    [tokenHash],
  );

  if (!rows.length) {
    const error = new Error("Convite invalido");
    error.status = 404;
    throw error;
  }

  const convite = rows[0];

  if (convite.status !== "pendente") {
    const error = new Error("Convite indisponivel para ativacao");
    error.status = 409;
    throw error;
  }

  if (new Date(convite.expira_em) < new Date()) {
    await db.query(
      `
      UPDATE convites_ativacao
      SET status = 'expirado'
      WHERE id = ?
      `,
      [convite.id],
    );

    const error = new Error("Convite expirado");
    error.status = 410;
    throw error;
  }

  if (convite.tipo_convite === "funcionario") {
    return {
      valido: true,
      convite: {
        tipo_convite: convite.tipo_convite,
        nome_completo: convite.nome_completo,
        email: convite.email,
        condominio: convite.condominio,
        cargo: convite.cargo,
        area_atuacao: convite.area_atuacao,
        expira_em: convite.expira_em,
      },
    };
  }

  return {
    valido: true,
    convite: {
      tipo_convite: convite.tipo_convite,
      nome_completo: convite.nome_completo,
      email: convite.email,
      condominio: convite.condominio,
      torre: convite.torre,
      unidade: convite.unidade,
      papel: convite.papel,
      expira_em: convite.expira_em,
    },
  };
}

export async function activateInviteService({ token, senha }) {
  const normalizedToken = normalizeText(token);
  const normalizedPassword = normalizeText(senha);

  if (!normalizedToken || !normalizedPassword) {
    const error = new Error("Token e senha sao obrigatorios");
    error.status = 400;
    throw error;
  }

  if (normalizedPassword.length < 6) {
    const error = new Error("A senha deve ter pelo menos 6 caracteres");
    error.status = 400;
    throw error;
  }

  const tokenHash = buildInviteHash(normalizedToken);
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT id, usuario_id, status, expira_em
      FROM convites_ativacao
      WHERE token_hash = ?
      LIMIT 1
      `,
      [tokenHash],
    );

    if (!rows.length) {
      const error = new Error("Convite invalido");
      error.status = 404;
      throw error;
    }

    const convite = rows[0];

    if (convite.status !== "pendente") {
      const error = new Error("Convite indisponivel para ativacao");
      error.status = 409;
      throw error;
    }

    if (new Date(convite.expira_em) < new Date()) {
      await connection.query(
        `
        UPDATE convites_ativacao
        SET status = 'expirado'
        WHERE id = ?
        `,
        [convite.id],
      );

      const error = new Error("Convite expirado");
      error.status = 410;
      throw error;
    }

    const senhaHash = await bcrypt.hash(normalizedPassword, 10);

    await connection.query(
      `
      UPDATE usuarios
      SET senha_hash = ?, status = 'ativo'
      WHERE id = ?
      `,
      [senhaHash, convite.usuario_id],
    );

    await connection.query(
      `
      UPDATE convites_ativacao
      SET status = 'aceito', aceito_em = NOW()
      WHERE id = ?
      `,
      [convite.id],
    );

    await connection.commit();

    return {
      sucesso: true,
      mensagem: "Conta ativada com sucesso",
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
