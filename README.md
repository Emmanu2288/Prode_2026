# Prode 2026 API

Estructura básica de una API con Express, Mongoose, Passport y JWT.

## Archivos principales

- `src/app.js`: configuración principal de Express.
- `src/routes/`: definición de rutas.
- `src/controllers/`: lógica de cada ruta.
- `src/models/`: modelos de Mongoose.
- `src/middlewares/`: middlewares de autenticación/autorización.
- `src/config/`: configuración de base de datos y Passport.
- `src/utils/`: utilidades auxiliares.

## Variables de entorno

Crea un archivo `.env` con:

```env
MONGO_URI=mongodb://localhost:27017/prode2026
JWT_SECRET=tu_secreto_jwt_aqui
PORT=3000
```

## Ejecutar

```bash
npm install
npm run dev
```
