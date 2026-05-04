import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

//🔑 Login con JWT
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar que ambos campos estén presentes
        if (!email || !password) {
            return res.status(400).json({ message: "Email y contraseña son obligatorios" });
        }

        //Buscar el usuario por email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Usuario no encontrado" });
        }
        
        //Comparar la contraseña ingresada con la almacenada
         const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Contraseña incorrecta" });
        }
        
        // Generar token JWT
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,   
            { expiresIn: "1h" }       
        );

         res.json({ message: "Login exitoso", token });
    } catch (error) {
        res.status(500).json({ message: "Error en el login", error: error.message });
    }
};