import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const verifyToken = (req, res, next) => {
  try {
    // 1) Intentar header Authorization
    const authHeader = req.headers["authorization"];
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // 2) Fallback a cookie 'token'
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Normalizar distintos nombres de claim que el token pueda traer
    const userId = decoded?.id || decoded?.sub || decoded?._id;

    if (!userId) {
      console.error("verifyToken error: token no contiene id/sub/_id", decoded);
      return res.status(401).json({ message: "Token inválido: falta identificador de usuario" });
    }

    // Guardamos solo lo necesario en req.user
    req.user = {
      id: userId,
      email: decoded?.email,
      role: decoded?.role
    };

    return next();
  } catch (error) {
    console.error("verifyToken error:", error);
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};