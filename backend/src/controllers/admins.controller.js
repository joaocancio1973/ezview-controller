import {
  createAdminService,
  listAdminsService,
  getAdminCapacityService,
} from "../services/admins.service.js";

/**
 * Criar um novo Admin (somente Super Admin)
 */
export async function createAdmin(req, res) {
  const { nome_completo, email, senha, plano_id, limite_condominios } =
    req.body;

  if (!nome_completo || !email || !senha || !plano_id) {
    return res.status(400).json({
      erro: "Campos obrigatÃ³rios nÃ£o informados",
    });
  }

  try {
    const admin = await createAdminService({
      ...req.body,
      limite_condominios,
    });

    return res.status(201).json({
      sucesso: true,
      mensagem: "Admin criado com sucesso",
      admin: {
        id: admin.id,
        usuario_id: admin.usuario_id,
        nome_completo: admin.nome_completo,
        email: admin.email,
        plano_id: admin.plano_id,
        limite_condominios: admin.limite_condominios,
      },
    });
  } catch (error) {
    console.error("Erro ao criar admin:", error);

    if (
      error.message === "E-mail jÃ¡ cadastrado" ||
      error.message === "Plano invÃ¡lido ou inativo"
    ) {
      return res
        .status(error.message === "E-mail jÃ¡ cadastrado" ? 409 : 400)
        .json({
          erro: error.message,
        });
    }

    if (
      error.message === "Limite de condomÃ­nios excede o permitido pelo plano"
    ) {
      return res.status(400).json({
        erro: error.message,
      });
    }

    return res.status(500).json({
      erro: "Erro interno ao criar admin",
    });
  }
}

/**
 * Listar todos os Admins (Somente Super Admin)
 */
export async function getAdmins(req, res) {
  try {
    const admins = await listAdminsService();

    return res.status(200).json({
      sucesso: true,
      total: admins.length,
      admins,
    });
  } catch (error) {
    console.error("Erro ao buscar admins:", error);

    return res.status(500).json({
      erro: "Erro interno ao buscar admins",
    });
  }
}


export async function getMyAdminCapacity(req, res) {
  try {
    const resumo = await getAdminCapacityService(req.user.id);

    return res.status(200).json({
      sucesso: true,
      resumo,
    });
  } catch (error) {
    console.error("Erro ao buscar capacidade do admin:", error);

    if (error.message === "ADMIN_NOT_FOUND") {
      return res.status(404).json({
        erro: "Admin nao encontrado",
      });
    }

    return res.status(500).json({
      erro: "Erro interno ao buscar capacidade do admin",
    });
  }
}
