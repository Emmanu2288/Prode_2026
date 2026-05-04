import mongoose from "mongoose";
import bcrypt from "bcryptjs";

//Estuctura del usuario
const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
});
  
//Encriptar contraseña antes de guardar el usuario
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next(); // Si no cambió la contraseña, seguimos
  const salt = await bcrypt.genSalt(10);           // Generar una "sal" aleatoria
  this.password = await bcrypt.hash(this.password, salt); // Hashea la contraseña
  next();
});

// Método para comparar la contraseña ingresada con la almacenada
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;