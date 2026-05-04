import mongoose from "mongoose";
import bcrypt from "bcryptjs";

//Estuctura del usuario
const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: false,
  },
  last_name: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true, 
  },
  password: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
   googleId: {
    type: String,
    unique: true,
    sparse: true,
  }
});
  
// Encriptar contraseña antes de guardar el usuario (solo si existe password)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar la contraseña ingresada con la almacenada
userSchema.methods.comparePassword = async function (password) {
  if (!this.password) return false; // 👈 si el usuario es de Google, no hay password
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;