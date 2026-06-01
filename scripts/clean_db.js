/**
 * Script de limpieza de base de datos
 * Elimina todos los datos de prueba / 2022 y deja solo el usuario admin.
 *
 * Uso: node scripts/clean_db.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const ADMIN_EMAIL = "emma.229288@gmail.com"; // ← tu email de admin

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log("\n🧹 Script de limpieza de base de datos — Prode 2026\n");
  console.log(`   Se conservará solo el usuario admin: ${ADMIN_EMAIL}`);
  console.log("   Se eliminarán: predictions, processedfixtures, grouppoints,");
  console.log("   mvppredictions, corrections, groups, memberships, invitations\n");

  const confirm = await ask("¿Confirmas la limpieza? (escribe 'si' para continuar): ");
  if (confirm.trim().toLowerCase() !== "si") {
    console.log("❌ Operación cancelada.");
    rl.close();
    process.exit(0);
  }

  console.log("\n🔌 Conectando a MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Conectado.\n");

  const db = mongoose.connection.db;

  // Colecciones a limpiar completamente
  const toDrop = [
    "predictions",
    "processedfixtures",
    "grouppoints",
    "mvppredictions",
    "corrections",
    "groups",
    "memberships",
    "invitations",
  ];

  for (const col of toDrop) {
    try {
      await db.collection(col).deleteMany({});
      console.log(`🗑️  ${col}: limpia`);
    } catch {
      console.log(`⚠️  ${col}: no existe o ya está vacía`);
    }
  }

  // Usuarios: eliminar todos menos el admin
  const usersCol = db.collection("users");
  const admin = await usersCol.findOne({ email: ADMIN_EMAIL });

  if (!admin) {
    console.log(`\n⚠️  No se encontró el usuario admin (${ADMIN_EMAIL})`);
    console.log("   Eliminando TODOS los usuarios...");
    const r = await usersCol.deleteMany({});
    console.log(`🗑️  users: ${r.deletedCount} eliminados`);
  } else {
    const r = await usersCol.deleteMany({ email: { $ne: ADMIN_EMAIL } });
    console.log(`🗑️  users: ${r.deletedCount} eliminados, admin conservado (${ADMIN_EMAIL})`);
  }

  console.log("\n✅ Limpieza completada.\n");
  await mongoose.disconnect();
  rl.close();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
