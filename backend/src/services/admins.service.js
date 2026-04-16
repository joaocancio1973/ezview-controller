import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db from "../config/database.js";

export async function listAdminsService() {
  const [rows] = await db.query(`
    SELECT
      a.id,
      u.nome_completo,
      u.email,
      u.status AS usuario_status,
      p.nome AS plano_nome,
      a.limite_condominios,
      a.status AS admin_status,
      a.criado_em
    FROM admins a
    INNER JOIN usuarios u ON u.id = a.usuario_id
    INNER JOIN planos p ON p.id = a.plano_id
    ORDER BY a.criado_em DESC
  `);

  return rows;
}

export async function createAdminService(data) {
  const {
    nome_completo,
    email,
    senha,
    phone_whatsapp,
    plano_id,
    limite_condominios,
    status = "ativo",
  } = data;

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existingUser] = await connection.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [email],
    );

    if (existingUser.length > 0) {
      throw new Error("E-mail jÃ¡ cadastrado");
    }

    const [planos] = await connection.query(
      "SELECT id, nome, max_condominios FROM planos WHERE id = ? AND ativo = 'sim'",
      [plano_id],
    );

    if (planos.length === 0) {
      throw new Error("Plano invÃ¡lido ou inativo");
    }

    const plano = planos[0];
    const limiteFinal = limite_condominios ?? plano.max_condominios;

    if (limiteFinal > plano.max_condominios) {
      throw new Error("Limite de condomÃ­nios excede o permitido pelo plano");
    }

    const usuarioId = uuidv4();
    const senhaHash = await bcrypt.hash(senha, 10);

    await connection.query(
      `INSERT INTO usuarios
        (id, nome_completo, email, senha_hash, perfil, phone_whatsapp, status)
       VALUES (?, ?, ?, ?, 'admin', ?, ?)`,
      [
        usuarioId,
        nome_completo,
        email,
        senhaHash,
        phone_whatsapp || null,
        status,
      ],
    );

    const adminId = uuidv4();

    await connection.query(
      `INSERT INTO admins
        (id, usuario_id, plano_id, limite_condominios, status)
       VALUES (?, ?, ?, ?, ?)`,
      [adminId, usuarioId, plano_id, limiteFinal, status],
    );

    await connection.commit();

    return {
      id: adminId,
      usuario_id: usuarioId,
      nome_completo,
      email,
      plano_id,
      plano_nome: plano.nome,
      limite_condominios: limiteFinal,
      status,
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

export async function getAdminCapacityService(usuarioId) {
  const [rows] = await db.query(
    `SELECT
      a.usuario_id,
      a.limite_condominios,
      a.status AS admin_status,
      COUNT(c.id) AS total_condominios
    FROM admins a
    LEFT JOIN condominios c ON c.admin_id = a.usuario_id
    WHERE a.usuario_id = ?
    GROUP BY a.id, a.usuario_id, a.limite_condominios, a.status`,
    [usuarioId],
  );

  if (!rows.length) {
    throw new Error("ADMIN_NOT_FOUND");
  }

  const admin = rows[0];
  const limite = Number(admin.limite_condominios || 0);
  const total = Number(admin.total_condominios || 0);

  return {
    usuario_id: admin.usuario_id,
    status: admin.admin_status,
    limite_condominios: limite,
    total_condominios: total,
    saldo_condominios: Math.max(limite - total, 0),
  };
}
