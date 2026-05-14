export const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Token no proporcionado o usuario no autenticado" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acceso denegado: rol insuficiente" });
    }

    next();
  };
};
