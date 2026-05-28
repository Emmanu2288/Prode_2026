# Prode 2026 — API Backend

## 📌 Descripción

API REST desarrollada como proyecto final de **Backend II**. Implementa un sistema de predicciones para el **Mundial de Fútbol 2026** donde los usuarios pueden:

- Registrarse e iniciar sesión (local o con Google)
- Predecir resultados de partidos y MVP
- Unirse a grupos y competir en un leaderboard
- Recibir puntos en tiempo real al finalizar cada partido

El sistema utiliza:

- **Passport** (Local Strategy + Google OAuth 2.0)
- **JWT** (JSON Web Tokens)
- **Cookies seguras** (HttpOnly + sameSite: Lax)
- **Sesiones híbridas** (express-session + connect-mongo)
- **Socket.IO** (eventos en tiempo real)
- **MongoDB Atlas** (base de datos en la nube)
- **node-cron** (reconciliación automática de puntos)
- **Webhooks** con firma HMAC-SHA256

---

## 🧱 Arquitectura del Proyecto

El proyecto sigue una arquitectura en capas:

```
src/
├── app.js                        ← Servidor principal, Socket.IO y configuración global
├── config/
│   ├── db.js                     ← Conexión a MongoDB con retry y graceful shutdown
│   └── passport.js               ← Estrategias Local y Google OAuth
├── controllers/
│   ├── auth.controller.js        ← Registro, login, logout, perfil, sesión
│   ├── group.controller.js       ← Crear grupos, invitar, listar miembros
│   ├── groupPoints.controller.js ← Leaderboard por grupo
│   ├── invitation.controller.js  ← Sistema de invitaciones in-app y por link
│   ├── match.controller.js       ← Consulta de partidos desde api-sports
│   ├── mvpPrediction.controller.js ← Predicciones de MVP por partido
│   ├── prediction.controller.js  ← Predicciones de resultado + extras del torneo
│   ├── user.controller.js        ← CRUD de usuarios (admin)
│   └── webhook.controller.js     ← Recepción y verificación de webhooks
├── middlewares/
│   ├── auth.middleware.js        ← verifyToken: valida JWT desde header o cookie
│   └── role.middleware.js        ← roleMiddleware: control de acceso por rol
├── models/
│   ├── Correction.js             ← Audit trail de correcciones del reconciler
│   ├── Group.js                  ← Modelo de grupo
│   ├── GroupPoints.js            ← Puntos por usuario dentro de cada grupo
│   ├── Invitation.js             ← Invitaciones con token, estado y expiración
│   ├── Membership.js             ← Relación usuario-grupo
│   ├── MvpPrediction.js          ← Predicción de MVP por partido
│   ├── Prediction.js             ← Predicción de resultado + awards del torneo
│   ├── ProcessedFixture.js       ← Deduplicación de eventos de webhook
│   └── User.js                   ← Usuario con hash de contraseña y OAuth
├── routes/
│   ├── auth.routes.js            ← /api/auth
│   ├── group.routes.js           ← /api/groups
│   ├── invitation.routes.js      ← /api/invitations
│   ├── match.routes.js           ← /api/matches
│   ├── mvpPrediction.routes.js   ← /api/mvp
│   ├── prediction.routes.js      ← /api/predictions
│   ├── user.routes.js            ← /api/users
│   └── webhook.routes.js         ← /api/webhooks
├── services/
│   ├── cron.service.js           ← Reconciliador automático (cada 5 min)
│   ├── match.service.js          ← Wrapper de api-sports
│   ├── notification.service.js   ← Notificaciones in-app via Socket.IO
│   ├── points.service.js         ← Cálculo y aplicación de puntos
│   └── webhook.processor.js      ← Lógica de negocio de eventos de partido
└── utils/
    └── alerts.js                 ← Stubs de captureException y slackAlert

scripts/
├── backfill_ft.js                ← Reconcilia partidos históricos manualmente
└── makeToken.js                  ← Genera tokens JWT para testing

postman/                          ← Colecciones Postman listas para importar
```

### Explicación de capas

| Capa | Responsabilidad |
|------|----------------|
| `config` | Configuración de infraestructura: DB y estrategias de Passport |
| `models` | Esquemas de Mongoose. Aplican reglas de negocio a nivel de datos (hooks, índices únicos) |
| `routes` | Definición de endpoints y asignación de middlewares + controllers |
| `controllers` | Lógica de negocio HTTP: reciben la request, coordinan services y responden |
| `middlewares` | Autenticación (`verifyToken`) y autorización (`roleMiddleware`) transversales |
| `services` | Lógica reutilizable sin dependencia de HTTP (puntos, cron, notificaciones, webhooks) |

### Diagrama de flujo de autenticación

```
Cliente
  │
  ├─► POST /api/auth/register ──────────────────► Crear User (hash bcrypt via pre-save hook)
  │                                                Responde: { user, message }
  │
  ├─► POST /api/auth/login ─────────────────────► Validar email + comparePassword
  │                                                Firmar JWT { id, email, role } exp 1h
  │                                                Setear cookie authToken (httpOnly, lax)
  │                                                Responde: { user, token }
  │
  ├─► POST /api/auth/passport-login ───────────► Passport LocalStrategy
  │                                                Sesión serializada en MongoDB (connect-mongo)
  │                                                Responde: { user }
  │
  ├─► GET /api/auth/google ─────────────────────► Passport GoogleStrategy
  │       └─► GET /api/auth/google/callback ────► Crear/vincular User con googleId
  │                                                Responde: { user }
  │
  └─► Rutas protegidas
        │
        ├─► verifyToken middleware
        │     ├── Lee Authorization: Bearer <token>
        │     ├── O lee cookie authToken
        │     └── Verifica JWT → popula req.user { id, email, role }
        │
        └─► roleMiddleware(['admin'])
              └── Verifica req.user.role → 403 si no coincide
```

---

## 🗄️ Base de Datos

Se utiliza **MongoDB Atlas** como base de datos principal.

- Conexión mediante `mongoose` con reintentos automáticos (backoff exponencial)
- Colecciones principales:

| Colección | Descripción |
|-----------|-------------|
| `users` | Usuarios registrados (local + Google OAuth) |
| `sessions` | Sesiones de express-session (persistidas via connect-mongo) |
| `predictions` | Predicciones de resultado por partido |
| `mvppredictions` | Predicciones de MVP por partido |
| `groups` | Grupos de competencia |
| `memberships` | Relación usuario-grupo |
| `grouppoints` | Puntos de cada usuario dentro de cada grupo |
| `invitations` | Invitaciones con token, estado y expiración |
| `processedfixtures` | Log de deduplicación de webhooks |
| `corrections` | Audit trail del reconciler automático |

---

## ⚙️ Variables de Entorno

### Archivo `.env`

No se sube al repositorio. Contiene las credenciales reales del proyecto.

```env
PORT=3000
NODE_ENV=development

MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/prode2026

JWT_SECRET=secreto_largo_y_aleatorio
SESSION_SECRET=secreto_de_sesion
COOKIE_SECRET=secreto_de_cookie

GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

FOOTBALL_API_KEY=tu_api_sports_key
WORLD_CUP_LEAGUE_ID=1
API_SEASON=2026

WEBHOOK_SECRET=tu_webhook_secret
FRONTEND_URL=http://localhost:5173
```

### Archivo `.env.example`

Incluido en el repositorio como plantilla. Ver `.env.example`.

### Descripción de variables

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del servidor (default: 3000) |
| `MONGO_URI` | URI de conexión a MongoDB Atlas |
| `JWT_SECRET` | Clave para firmar y verificar tokens JWT |
| `SESSION_SECRET` | Clave para firmar cookies de sesión |
| `COOKIE_SECRET` | Clave para firmar cookies generales |
| `GOOGLE_CLIENT_ID/SECRET` | Credenciales de Google OAuth Console |
| `GOOGLE_CALLBACK_URL` | URL de callback registrada en Google Cloud |
| `FOOTBALL_API_KEY` | API key de api-sports.io para fixture data |
| `WORLD_CUP_LEAGUE_ID` | ID de liga del Mundial en api-sports (1 = FIFA WC) |
| `API_SEASON` | Temporada a consultar (2026 para el Mundial real) |
| `WEBHOOK_SECRET` | Secreto para verificar firma HMAC-SHA256 de webhooks |
| `FRONTEND_URL` | URL del frontend para CORS y links de invitación |

---

## 🔐 Flujo de Autenticación

### 1. Registro de Usuario

**Endpoint:** `POST /api/auth/register`

```javascript
// auth.controller.js — registerUser
const newUser = new User({
  first_name,
  last_name,
  email: normalizedEmail,
  password          // el pre-save hook de User.js hashea con bcrypt automáticamente
});
await newUser.save();
```

El modelo aplica el hash en el hook `pre("save")`:

```javascript
// models/User.js
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

**Request:**
```json
POST /api/auth/register
{
  "first_name": "Juan",
  "last_name": "Perez",
  "email": "juan@ejemplo.com",
  "password": "Juan1234"
}
```

**Response exitoso (201):**
```json
{
  "message": "Usuario registrado exitosamente",
  "user": {
    "id": "64f3a...",
    "first_name": "Juan",
    "last_name": "Perez",
    "email": "juan@ejemplo.com",
    "role": "user"
  }
}
```

**Response duplicado (409):**
```json
{ "message": "El email ya existe" }
```

---

### 2. Login Local (JWT)

**Endpoint:** `POST /api/auth/login`

```javascript
// auth.controller.js — loginUser
const payload = { id: user._id, email: user.email, role: user.role };
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

res.cookie("authToken", token, {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60  // 1 hora
});

return res.json({ message: "Login exitoso", user: safeUser, token });
```

El token viaja **doble**: en el body (para usar desde Postman/frontend) y en la cookie `authToken` (para el browser).

**Request:**
```json
POST /api/auth/login
{
  "email": "juan@ejemplo.com",
  "password": "Juan1234"
}
```

**Response exitoso (200):**
```json
{
  "message": "Login exitoso",
  "user": { "id": "64f3a...", "email": "juan@ejemplo.com", "role": "user" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**JWT Payload:**
```json
{
  "id": "64f3a...",
  "email": "juan@ejemplo.com",
  "role": "user",
  "iat": 1748000000,
  "exp": 1748003600
}
```

---

### 3. Login con Passport Local

**Endpoint:** `POST /api/auth/passport-login`

Usa la estrategia `LocalStrategy` de Passport, que valida email/password y serializa el usuario en la sesión (persistida en MongoDB via `connect-mongo`).

```javascript
// config/passport.js — LocalStrategy
passport.use(new LocalStrategy(
  { usernameField: "email" },
  async (email, password, done) => {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return done(null, false, { message: "Usuario no encontrado" });
    if (!user.password) return done(null, false, { message: "Cuenta registrada con OAuth." });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return done(null, false, { message: "Contraseña incorrecta" });
    return done(null, user);
  }
));
```

---

### 4. Login OAuth (Google)

```
GET /api/auth/google            → Redirige a Google
GET /api/auth/google/callback   → Google redirige de vuelta con el código
```

```javascript
// config/passport.js — GoogleStrategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  // 1) Buscar por googleId
  let user = await User.findOne({ googleId: profile.id });

  // 2) Si no existe por googleId, buscar por email para vincular
  if (!user && email) {
    user = await User.findOne({ email });
    if (user) { user.googleId = profile.id; await user.save(); }
  }

  // 3) Si no existe, crear nuevo usuario
  if (!user) {
    user = new User({ first_name, last_name, email, googleId: profile.id });
    await user.save();
  }

  return done(null, user);
}));
```

La sesión se mantiene mediante `passport.serializeUser` / `passport.deserializeUser` usando MongoDB como store.

---

### 5. Sistema de Sesiones

Las sesiones se persisten en MongoDB usando `connect-mongo`:

```javascript
// app.js
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: 60 * 60   // 1 hora
  }),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60
  }
}));
```

Ejemplo de documento de sesión en MongoDB:
```json
{
  "_id": "s8F3k...",
  "expires": "2026-06-01T12:00:00Z",
  "session": {
    "cookie": { "httpOnly": true, "sameSite": "lax" },
    "passport": { "user": "64f3a..." }
  }
}
```

**Endpoint de verificación de sesión:**
```
GET /api/auth/session   → { authenticated: true, user: {...} }
                        → 401 { authenticated: false } si no hay sesión
```

---

### 6. Rutas Protegidas

**Protegida por JWT (perfil del usuario):**

```javascript
// middlewares/auth.middleware.js — verifyToken
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  let token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  // Fallback a cookie
  if (!token && req.cookies) {
    token = req.cookies.authToken || req.cookies.token || null;
  }

  if (!token) return res.status(401).json({ message: "Token no proporcionado" });

  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = { id: decoded.id || decoded.sub, email: decoded.email, role: decoded.role };
  return next();
};
```

```
GET /api/auth/profile   → requiere JWT → devuelve datos del usuario logueado
```

**Protegida por rol (admin):**

```javascript
// middlewares/role.middleware.js
export const roleMiddleware = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Acceso denegado: rol insuficiente" });
  }
  next();
};
```

```
GET /api/users/admin    → requiere JWT + role: "admin"
                        → 401 sin token
                        → 403 con token de usuario normal
                        → 200 con token de admin
```

---

### 7. Logout

```javascript
// auth.controller.js — logoutUser
export const logoutUser = (req, res) => {
  req.logout((err) => {
    req.session.destroy(() => {
      res.clearCookie("authToken");
      return res.json({ message: "Sesión cerrada correctamente" });
    });
  });
};
```

- Destruye la sesión en MongoDB
- Elimina la cookie `authToken` del browser
- El cliente debe también descartar el token JWT que tenga guardado

---

## 🔒 Seguridad y Decisiones Arquitectónicas

### ¿Dónde vive el rol y por qué?

El rol se guarda en el **modelo User de MongoDB** (campo `role: { enum: ["admin", "user"] }`) y se embebe en el **payload del JWT** al momento de login. No se consulta la DB en cada request para verificar el rol: el middleware confía en el token firmado.

### ¿Cómo se mitiga CSRF?

- Cookie con `sameSite: "lax"`: el browser no envía la cookie en requests cross-site iniciados desde formularios o POST de terceros.
- Cookie con `httpOnly: true`: JavaScript del cliente no puede leer ni robar el token.
- El JWT en `Authorization: Bearer` no es vulnerable a CSRF por definición (no se envía automáticamente por el browser).

### ¿Cómo se diferencia entorno local y producción?

```javascript
secure: process.env.NODE_ENV === "production"
```

En local (`development`) la cookie se envía por HTTP. En producción solo por HTTPS.

### ¿Por qué cookie + JWT y no solo uno?

Se usan ambos porque sirven para contextos diferentes:
- **JWT en header**: para clientes que no manejan cookies (apps móviles, Postman, integraciones).
- **Cookie httpOnly**: para el browser, donde el JWT no debería estar en `localStorage` (vulnerable a XSS).

El middleware `verifyToken` acepta ambos, dándole prioridad al header.

### ¿Qué ocurre si el rol cambia con un token ya emitido?

El token JWT dura 1 hora y es inmutable: si un admin pierde su rol en la DB, seguirá teniendo acceso hasta que el token expire. Para mitigarlo en producción se puede reducir la expiración o implementar una blacklist de tokens revocados. En el contexto del proyecto (Mundial 2026) este riesgo es aceptable dado que hay un solo admin.

---

## 📡 Endpoints

### 🔐 Autenticación — `/api/auth`

| Método | Endpoint | Protección | Descripción |
|--------|----------|------------|-------------|
| POST | `/register` | — | Registro con email y password |
| POST | `/login` | — | Login JWT + cookie |
| POST | `/passport-login` | — | Login via Passport Local |
| POST | `/logout` | — | Destruye sesión y limpia cookie |
| GET | `/profile` | JWT | Datos del usuario logueado |
| GET | `/session` | JWT | Verifica si hay sesión activa |
| GET | `/google` | — | Inicia flujo Google OAuth |
| GET | `/google/callback` | — | Callback de Google OAuth |

### 👤 Usuarios — `/api/users`

| Método | Endpoint | Protección | Descripción |
|--------|----------|------------|-------------|
| GET | `/admin` | JWT + admin | Panel admin (demuestra 401/403) |
| GET | `/` | JWT + admin | Listar todos los usuarios |
| PUT | `/:id` | JWT (propio o admin) | Actualizar usuario |
| DELETE | `/:id` | JWT + admin | Eliminar usuario |

### ⚽ Predicciones — `/api/predictions`

| Método | Endpoint | Protección | Descripción |
|--------|----------|------------|-------------|
| POST | `/` | JWT | Crear predicción de resultado |
| POST | `/extras` | JWT | Actualizar awards del torneo |
| GET | `/user/:userId` | JWT | Ver predicciones de un usuario |

### 🏆 MVP — `/api/mvp`

| Método | Endpoint | Protección | Descripción |
|--------|----------|------------|-------------|
| POST | `/` | JWT | Crear predicción de MVP |
| GET | `/user/:userId` | JWT | Ver predicciones MVP de un usuario |

### 👥 Grupos — `/api/groups`

| Método | Endpoint | Protección | Descripción |
|--------|----------|------------|-------------|
| POST | `/` | JWT | Crear grupo |
| POST | `/:groupId/invite` | JWT | Invitar usuarios al grupo |
| GET | `/:groupId/members` | JWT | Ver miembros del grupo |
| GET | `/:groupId/leaderboard` | JWT | Ranking del grupo |

### 📨 Invitaciones — `/api/invitations`

| Método | Endpoint | Protección | Descripción |
|--------|----------|------------|-------------|
| GET | `/pending` | JWT | Mis invitaciones pendientes |
| POST | `/accept` | JWT | Aceptar invitación (usuario logueado) |
| GET | `/accept?token=` | — | Aceptar desde link (sin sesión) |
| POST | `/:token/reject` | JWT | Rechazar invitación |

### 📅 Partidos — `/api/matches`

| Método | Endpoint | Protección | Descripción |
|--------|----------|------------|-------------|
| GET | `/` | — | Consultar partidos desde api-sports |

### 🔔 Webhooks — `/api/webhooks`

| Método | Endpoint | Protección | Descripción |
|--------|----------|------------|-------------|
| POST | `/football` | HMAC-SHA256 | Recibir eventos de partido (gol, tarjeta, FT) |

---

## 🍪 Cookies y JWT

### Configuración de cookie

```javascript
res.cookie("authToken", token, {
  httpOnly: true,     // no accesible por JavaScript del cliente (protege contra XSS)
  sameSite: "lax",    // permite navegación normal, bloquea POST cross-site (mitiga CSRF)
  secure: process.env.NODE_ENV === "production",  // solo HTTPS en producción
  maxAge: 1000 * 60 * 60   // 1 hora
});
```

### JWT Payload

```json
{
  "id": "64f3a...",
  "email": "juan@ejemplo.com",
  "role": "user",
  "iat": 1748000000,
  "exp": 1748003600
}
```

✔ Expiración: 1 hora  
✔ Firmado con `HS256`  
✔ Verificado en cada request protegido

---

## 🔴 Socket.IO — Eventos en Tiempo Real

Al conectarse el cliente debe unirse a sus salas:

```javascript
// Cliente (JavaScript / React)
socket.emit("join_user", { userId });        // sala personal (invitaciones)
socket.emit("join_match", { matchId });      // sala de partido (goles, tarjetas)
```

| Evento emitido por el servidor | Sala | Cuándo |
|-------------------------------|------|--------|
| `invitation_received` | `user_<id>` | Alguien te invita a un grupo |
| `invitation_accepted` | `user_<id>` | Tu invitado aceptó |
| `match_event` | `match_<id>` | Gol o tarjeta en un partido |
| `match_finished` | `match_<id>` | Partido finalizado (FT) |
| `match_reconciled` | `match_<id>` | Reconciliación automática de puntos |

---

## 🧪 Evidencia de Funcionamiento

Las colecciones Postman están en la carpeta `/postman`. Importar el environment `Prode2026.postman_environment.json` antes de usar las colecciones.

**Colecciones disponibles:**

| Archivo | Endpoints que cubre |
|---------|-------------------|
| `Usuarios.postman_collection.json` | Registro, login, 401/403, perfil, sesión, admin, logout |
| `Predictions.postman_collection.json` | Predicciones de resultado y awards |
| `Groups.postman_collection.json` | Grupos, invitaciones, leaderboard |
| `Invitation.postman_collection.json` | Flujo completo de invitaciones |
| `Fixture.postman_collection.json` | Consulta de partidos |
| `Webhook.postman_collection.json` | Gol, tarjeta, FT, deduplicación, firma inválida, verificación de puntos |

---

## ⚠️ Manejo de Errores

### 401 Unauthorized — No autenticado

```json
{ "message": "Token no proporcionado" }
{ "message": "Token inválido o expirado" }
{ "authenticated": false, "message": "Sin sesión activa" }
```

### 403 Forbidden — Sin permisos

```json
{ "message": "Acceso denegado: rol insuficiente" }
```

### 409 Conflict — Duplicado

```json
{ "message": "El email ya existe" }
{ "error": "Ya existe una predicción para este usuario y partido." }
```

---

## 🔐 Seguridad Implementada

✔ **bcrypt** — hash de contraseñas (pre-save hook de Mongoose)  
✔ **JWT** con expiración de 1 hora  
✔ **Cookies httpOnly** — protección contra XSS  
✔ **sameSite: lax** — mitigación de CSRF  
✔ **secure** solo en producción  
✔ **Passport Local + Google OAuth**  
✔ **control de roles** (admin / user)  
✔ **HMAC-SHA256** para webhooks (`timingSafeEqual` contra timing attacks)  
✔ **Índices únicos** en Mongoose para evitar condiciones de carrera  
✔ **connect-mongo** — sesiones persistidas en DB (sin MemoryStore en producción)  

---

## ▶️ Instalación y Ejecución

### Requisitos

- Node.js v18+
- Cuenta en MongoDB Atlas (gratuita)
- Cuenta en Google Cloud Console (para OAuth)
- API key de api-sports.io (gratuita: 100 req/día)

### Pasos

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd Prode_2026

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales reales

# 4. Ejecutar en modo desarrollo
npm run dev

# 5. O en producción
npm start
```

Servidor disponible en: `http://localhost:3000`

### Scripts adicionales

```bash
# Reconciliar puntos de partidos históricos manualmente
node scripts/backfill_ft.js

# Generar token JWT de admin para testing
node scripts/makeToken.js
```

---

## 📌 Conclusión

Se implementó una API backend completa con:

- **Autenticación híbrida**: JWT (stateless) + Sessions (stateful con MongoDB)
- **Múltiples estrategias**: Passport Local, Google OAuth 2.0 y JWT propio
- **Autorización por roles**: middleware `roleMiddleware` reutilizable
- **Seguridad**: bcrypt, httpOnly, sameSite, HMAC-SHA256, timingSafeEqual
- **Tiempo real**: Socket.IO para eventos de partido e invitaciones in-app
- **Resiliencia**: cron reconciler, webhook deduplication, graceful shutdown
- **MongoDB Atlas**: con connect-mongo, índices compuestos y Mongoose strict mode
