export default function authorize(allowedRoles = []) {
  return (req, res, next) => {
    // 1️⃣ Verifica se usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        erro: "Usuário não autenticado",
      });
    }

    // 2️⃣ Verifica se perfil foi informado no token
    if (!req.user.perfil) {
      return res.status(403).json({
        erro: "Perfil não identificado no token",
      });
    }

    // 3️⃣ Verifica se o perfil está autorizado
    if (!allowedRoles.includes(req.user.perfil)) {
      return res.status(403).json({
        erro: "Você não tem permissão para acessar este recurso",
      });
    }

    next();
  };
}
