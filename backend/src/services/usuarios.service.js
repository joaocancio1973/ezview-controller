import db from "../config/database.js";

export async function listUsuariosService() {
  const [rows] = await db.query(`
    SELECT
      id,
      nome_completo,
      email,
      perfil,
      status,
      criado_em
    FROM usuarios
    ORDER BY criado_em DESC
  `);

  return rows;
}
