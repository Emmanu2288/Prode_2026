import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader) {
            return res.status(401).json({ message: "Token no proporcionado" });
        }

        // El token se espera en el formato "Bearer <token>"
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Formato de token inválido" });
        }

        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Almacenar la información del usuario en la solicitud
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token inválido o expirado", error: error.message });
    }
};