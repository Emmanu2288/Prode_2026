import User from "../models/User.js";

export const registerUser = async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;

        // Validar que todos los campos estén presentes
        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "El email ya existe" });
        }

        // Crear un nuevo usuario
        const newUser = new User({ first_name, last_name, email, password });
        await newUser.save();

        res.status(201).json({ message: "Usuario registrado exitosamente" });
    } catch (error) {
        res.status(500).json({ message: "Error al registrar el usuario", error: error.message});
    }
};