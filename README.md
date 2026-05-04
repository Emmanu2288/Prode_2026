# Prode 2026 API

## Descripción

API REST para gestión de usuarios con autenticación y autorización construida con:

- `Express` para el servidor HTTP.
- `Mongoose` para conexión y modelo de datos en MongoDB.
- `Passport` para estrategias de login local y Google OAuth.
- `JWT` para emisión y validación de tokens.
- `bcryptjs` para hash de contraseñas.

El proyecto ofrece registro, login con JWT, login con Passport local y Google, y administración básica de usuarios.

## Estructura del proyecto

- `src/app.js`: servidor principal y configuración global.
- `src/config/db.js`: conexión a MongoDB.
- `src/config/passport.js`: configuración de estrategias de Passport.
- `src/routes/auth.routes.js`: rutas de autenticación.
- `src/routes/user.routes.js`: rutas de gestión de usuarios.
- `src/controllers/auth.controller.js`: lógica de registro y login JWT.
- `src/controllers/user.controller.js`: controlador de usuarios (archivo vacío actualmente).
- `src/models/User.js`: esquema de usuario con hash de contraseña y Google OAuth.
- `src/middlewares/auth.middleware.js`: verificación de token JWT.
- `src/middlewares/role.middleware.js`: autorización por rol.
- `src/utils/jwt.js`: utilidades para JWT (implementación con CommonJS).
- `postman/Usuarios.postman_collection.json`: colección Postman para probar endpoints.

## Tecnologías usadas

- Node.js
- Express
- MongoDB / Mongoose
- Passport.js
- Passport Local Strategy
- Passport Google OAuth2.0
- JSON Web Tokens (JWT)
- bcryptjs
- dotenv
- express-session
- cookie-parser

## Requisitos previos

- Node.js instalado
- MongoDB accesible (local o Atlas)
- Credenciales de Google OAuth para la estrategia de login con Google

## Variables de entorno

Crear un archivo `.env` en la raíz con las siguientes variables:

```env
MONGO_URI=mongodb://localhost:27017/prode2026
JWT_SECRET=tu_secreto_jwt_aqui
SESSION_SECRET=tu_secreto_de_sesion
COOKIE_SECRET=tu_secreto_de_cookies
PORT=3000
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
NODE_ENV=development
```

> `MONGO_URI` también puede apuntar a MongoDB Atlas.

## Instalación y ejecución

```bash
npm install
npm run dev
```

O en producción:

```bash
npm start
```

El servidor se expondrá por defecto en `http://localhost:3000`.

## Flujo general de la aplicación

1. `src/app.js` carga variables de entorno y conecta a MongoDB.
2. Se habilitan middlewares de JSON, URL encoded, cookies y sesiones.
3. Se inicializa Passport y se monta la sesión de Passport.
4. Se registran las rutas de autenticación y usuarios.
5. Se inicia el servidor en el puerto configurado.

## Modelos

### Usuario (`src/models/User.js`)

Campos principales:

- `first_name`: String
- `last_name`: String
- `email`: String, único
- `password`: String (opcional para usuarios Google)
- `role`: String, valores `admin` o `user`, por defecto `user`
- `googleId`: String, único para OAuth con Google

Comportamiento adicional:

- Antes de guardar, si `password` está presente y se modificó, se hash con `bcryptjs`.
- Se define un método `comparePassword` para comparar contraseña ingresada con la almacenada.

## Autenticación y autorización

### JWT

- En `src/controllers/auth.controller.js` el login genera un token JWT con `id`, `email` y `role`.
- El token se firma con `process.env.JWT_SECRET` y expira en 1 hora.
- El token se envía también como cookie HTTP Only.
- El middleware `src/middlewares/auth.middleware.js` valida el token enviado en el header `Authorization: Bearer <token>`.

### Passport

- `src/config/passport.js` define dos estrategias:
  - `LocalStrategy` para login con email y password.
  - `GoogleStrategy` para login con Google OAuth.
- `passport.serializeUser` y `passport.deserializeUser` mantienen la sesión de usuario.

### Roles

- `src/middlewares/role.middleware.js` permite acceso solo a roles autorizados.
- Se usa en rutas de administración como listado y eliminación de usuarios.

## Endpoints disponibles

### Autenticación - `/api/auth`

- `POST /api/auth/register`
  - Registra un usuario nuevo.
  - Body esperado: `{ first_name, last_name, email, password }`.
  - Respuestas:
    - `201` registro correcto
    - `400` datos incompletos o email ya existente

- `POST /api/auth/login`
  - Login clásico con JWT.
  - Body esperado: `{ email, password }`.
  - Respuestas:
    - `200` login exitoso + token JWT
    - `400` email/contraseña inválidos

- `POST /api/auth/passport-login`
  - Login usando Passport Local Strategy.
  - Passport maneja la validación y redirige a `/api/auth/fail` en caso de fallo.
  - Devuelve `user` en la respuesta al autenticarse correctamente.

- `GET /api/auth/fail`
  - Ruta de fallback cuando Passport no valida las credenciales.
  - Retorna `401` con mensaje de error.

- `GET /api/auth/google`
  - Inicia el flujo de Google OAuth.
  - Solicita acceso a `profile` y `email`.

- `GET /api/auth/google/callback`
  - Callback de Google OAuth.
  - Al completar, retorna `message` y `user`.

### Usuarios - `/api/users`

- `GET /api/users`
  - Lista todos los usuarios.
  - Requiere token JWT válido.
  - Requiere rol `admin`.

- `PUT /api/users/:id`
  - Actualiza un usuario.
  - Requiere token JWT válido.
  - Permite que el propio usuario actualice su perfil o que un admin actualice cualquier usuario.

- `DELETE /api/users/:id`
  - Elimina un usuario.
  - Requiere token JWT válido y rol `admin`.

## Configuración de base de datos

- `src/config/db.js` conecta con MongoDB usando `mongoose.connect(process.env.MONGO_URI)`.
- Si la conexión falla, el proceso termina con `process.exit(1)`.

## Notas importantes

- `src/controllers/user.controller.js` está presente pero actualmente no contiene lógica propia.
- `src/utils/jwt.js` usa `require` en un proyecto configurado con `type: module`; esta discrepancia puede requerir ajuste futuro.
- Las rutas de sesión de Passport y las cookies están configuradas para `secure` solo en `production`.

## Colección Postman

La colección `postman/Usuarios.postman_collection.json` incluye ejemplos para probar:

- Registro de usuario
- Login JWT
- Login con Passport local
- Login con Google OAuth
- Listar usuarios
- Actualizar usuario
- Eliminar usuario

## Próximos pasos sugeridos

- Implementar `src/controllers/user.controller.js` para separar la lógica de usuario.
- Agregar validación más estricta de datos (por ejemplo, con `Joi` o `express-validator`).
- Añadir tests unitarios e integración.
- Mejorar manejo de errores compartido.
- Agregar rutas protegidas adicionales para perfil y logout.
