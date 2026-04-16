import { listUsuariosService } from "../services/usuarios.service.js";

export async function getUsuarios(req, res) {
  try {
    const usuarios = await listUsuariosService();

    return res.status(200).json({
      sucesso: true,
      total: usuarios.length,
      usuarios,
    });
  } catch (error) {
    console.error("Erro ao buscar usuarios:", error);

    return res.status(500).json({
      erro: "Erro interno ao buscar usuarios",
    });
  }
}
