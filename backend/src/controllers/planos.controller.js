import db from "../config/database.js";

export async function getPlanos(req, res) {
  try {
    const [planos] = await db.query(`
      SELECT id, nome, descricao
      FROM planos
      WHERE ativo = 'sim'
      ORDER BY criado_em ASC
    `);

    return res.status(200).json({
      sucesso: true,
      total: planos.length,
      planos,
    });
  } catch (error) {
    console.error("Erro ao buscar planos:", error);

    return res.status(500).json({
      erro: "Erro interno ao buscar planos",
    });
  }
}
