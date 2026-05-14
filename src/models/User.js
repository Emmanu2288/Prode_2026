import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const userSchema = new Schema({
  first_name: {
    type: String,
    required: false,
    trim: true
  },
  last_name: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Email inválido"]
  },
  password: {
    type: String,
    required: false
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user"
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  }
}, { timestamps: true });

// Encriptar contraseña antes de guardar el usuario (solo si existe password)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar la contraseña ingresada con la almacenada
userSchema.methods.comparePassword = async function (password) {
  if (!this.password) return false; // si el usuario es de Google, no hay password
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
