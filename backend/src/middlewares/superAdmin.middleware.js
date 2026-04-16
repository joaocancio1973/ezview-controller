export default function superAdminOnly(req, res, next) {
  /**
   * O authMiddleware já colocou o usuário em req.user
   * Esperamos algo como:
   * req.user = { id, perfil, iat, exp }
   */

  if (!req.user) {
    return res.status(401).json({
      erro: "Usuário não autenticado",
    });
  }

  if (req.user.perfil !== "super_admin") {
    return res.status(403).json({
      erro: "Acesso restrito ao Super Admin",
    });
  }

  next();
}
