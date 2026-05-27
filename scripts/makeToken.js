import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const secret = process.env.JWT_SECRET || "tu_jwt_secret_de_dev";
const token = jwt.sign(
  { sub: "69f92836f0251f0a97b22199", role: "admin" },
  secret,
  { expiresIn: "7d" }
);
console.log(token);
