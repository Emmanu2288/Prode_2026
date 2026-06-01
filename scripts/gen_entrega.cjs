const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, Header, Footer, PageBreak, LevelFormat,
  UnderlineType
} = require("docx");
const fs = require("fs");

// ─── Color palette ───────────────────────────────────────
const BLUE      = "1F4E79";
const BLUE_MID  = "2E75B6";
const BLUE_LITE = "D5E8F0";
const BLUE_HDR  = "BDD7EE";
const GRAY_CODE = "F2F2F2";
const GRAY_BRD  = "CCCCCC";
const WHITE     = "FFFFFF";

// ─── Helpers ─────────────────────────────────────────────
const border1 = { style: BorderStyle.SINGLE, size: 1, color: GRAY_BRD };
const cellBorders = { top: border1, bottom: border1, left: border1, right: border1 };

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, bold: true, size: 32, color: WHITE, font: "Arial" })],
    shading: { fill: BLUE, type: ShadingType.CLEAR },
    indent: { left: 120, right: 120 },
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, color: BLUE, font: "Arial" })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE_MID, space: 1 } },
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, color: BLUE_MID, font: "Arial" })],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 20, font: "Arial", ...opts })],
  });
}

function bullet(text, bold = false) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 20, font: "Arial", bold })],
  });
}

function numbered(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 20, font: "Arial" })],
  });
}

function codeBlock(lines) {
  const children = [];
  lines.forEach((line, i) => {
    children.push(
      new Paragraph({
        spacing: { after: 0, before: 0, line: 240, lineRule: "auto" },
        shading: { fill: GRAY_CODE, type: ShadingType.CLEAR },
        indent: { left: 180, right: 180 },
        children: [new TextRun({ text: line === "" ? " " : line, size: 16, font: "Courier New", color: "1F1F1F" })],
      })
    );
  });
  // wrap in a thin border
  return children;
}

function inlineCode(text) {
  return new TextRun({ text, size: 18, font: "Courier New", shading: { fill: GRAY_CODE, type: ShadingType.CLEAR } });
}

function labelValue(label, value) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label + ": ", bold: true, size: 20, font: "Arial" }),
      new TextRun({ text: value, size: 20, font: "Arial" }),
    ],
  });
}

function note(text) {
  return new Paragraph({
    spacing: { before: 80, after: 160 },
    shading: { fill: BLUE_LITE, type: ShadingType.CLEAR },
    indent: { left: 200, right: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: BLUE_MID, space: 3 } },
    children: [new TextRun({ text: "📌 " + text, size: 19, font: "Arial", italics: true, color: BLUE })],
  });
}

function screenshotPlaceholder(label) {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    alignment: AlignmentType.CENTER,
    shading: { fill: "FFF9C4", type: ShadingType.CLEAR },
    border: {
      top: { style: BorderStyle.DASHED, size: 4, color: "E6A800" },
      bottom: { style: BorderStyle.DASHED, size: 4, color: "E6A800" },
      left: { style: BorderStyle.DASHED, size: 4, color: "E6A800" },
      right: { style: BorderStyle.DASHED, size: 4, color: "E6A800" },
    },
    children: [new TextRun({ text: "📷  CAPTURA POSTMAN: " + label, size: 20, font: "Arial", bold: true, color: "7B5500" })],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function spacer() {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] });
}

// ─── Table helpers ────────────────────────────────────────
function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: colWidths[i], type: WidthType.DXA },
        borders: cellBorders,
        shading: { fill: BLUE_HDR, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, font: "Arial" })] })],
      })
    ),
  });
  const dataRows = rows.map(cells =>
    new TableRow({
      children: cells.map((c, i) =>
        new TableCell({
          width: { size: colWidths[i], type: WidthType.DXA },
          borders: cellBorders,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: c, size: 18, font: "Arial" })] })],
        })
      ),
    })
  );
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

// ─── Cover page ───────────────────────────────────────────
function coverPage() {
  return [
    new Paragraph({ spacing: { before: 1800, after: 240 }, alignment: AlignmentType.CENTER,
      shading: { fill: BLUE, type: ShadingType.CLEAR },
      children: [new TextRun({ text: "PRODE 2026", bold: true, size: 56, color: WHITE, font: "Arial" })] }),
    new Paragraph({ spacing: { before: 0, after: 480 }, alignment: AlignmentType.CENTER,
      shading: { fill: BLUE, type: ShadingType.CLEAR },
      children: [new TextRun({ text: "Documentación Técnica Final", size: 32, color: BLUE_LITE, font: "Arial" })] }),
    spacer(),
    new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Materia: Backend II", size: 24, font: "Arial", bold: true, color: BLUE })] }),
    new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Alumno: Emmanuel López", size: 24, font: "Arial", color: "333333" })] }),
    new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "2026", size: 24, font: "Arial", color: "666666" })] }),
    pageBreak(),
  ];
}

// ─── BUILD DOCUMENT ───────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: WHITE, font: "Arial" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: BLUE, font: "Arial" },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, color: BLUE_MID, font: "Arial" },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      },
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLUE_MID, space: 1 } },
          children: [
            new TextRun({ text: "Prode 2026  |  Backend II  |  Emmanuel López", size: 16, color: "666666", font: "Arial" }),
          ],
        }),
      ] }),
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE_MID, space: 1 } },
          children: [
            new TextRun({ text: "Página ", size: 16, color: "666666", font: "Arial" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "666666", font: "Arial" }),
            new TextRun({ text: " de ", size: 16, color: "666666", font: "Arial" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "666666", font: "Arial" }),
          ],
        }),
      ] }),
    },
    children: [
      // ── COVER ──
      ...coverPage(),

      // ══════════════════════════════════════════
      // 1. PRESENTACIÓN
      // ══════════════════════════════════════════
      heading1("1. Presentación del Proyecto"),
      spacer(),

      heading2("Descripción general"),
      para("Prode 2026 es una API REST desarrollada como proyecto final de Backend II. Implementa un sistema de predicciones para el Mundial de Fútbol FIFA 2026 donde los usuarios pueden:"),
      bullet("Registrarse e iniciar sesión (local o con Google OAuth)"),
      bullet("Predecir resultados de partidos y MVP (jugador más valioso)"),
      bullet("Unirse a grupos y competir en un leaderboard en tiempo real"),
      bullet("Recibir puntos automáticamente al finalizar cada partido mediante webhooks"),
      spacer(),

      heading2("Objetivo arquitectónico"),
      para("Construir un backend robusto con autenticación híbrida (JWT stateless + Sessions stateful), autorización por roles, eventos en tiempo real via Socket.IO, y un sistema de puntos automatizado con reconciliación via cron jobs."),
      spacer(),

      heading2("Estrategias de autenticación implementadas"),
      numbered("Login local con JWT — el usuario envía email/password, recibe un token JWT firmado con expiración de 1 hora."),
      numbered("Login local con Passport — estrategia LocalStrategy de Passport.js que serializa la sesión en MongoDB via connect-mongo."),
      numbered("Google OAuth 2.0 — el usuario se autentica con su cuenta de Google; el servidor crea o vincula el usuario en la DB automáticamente."),
      spacer(),

      heading2("Justificación del enfoque"),
      para("Se eligió un enfoque híbrido (JWT + Sessions) porque:"),
      bullet("JWT es ideal para clientes que no manejan cookies (apps móviles, Postman, integraciones de API)."),
      bullet("Las cookies httpOnly protegen el token en el browser contra ataques XSS."),
      bullet("Passport + Sessions es necesario para mantener el estado del flujo OAuth de Google."),
      bullet("connect-mongo persiste las sesiones en MongoDB Atlas para no perder datos al reiniciar el servidor."),
      pageBreak(),

      // ══════════════════════════════════════════
      // 2. ARQUITECTURA
      // ══════════════════════════════════════════
      heading1("2. Arquitectura del Proyecto"),
      spacer(),

      heading2("Estructura de carpetas completa"),
      ...codeBlock([
        "Prode_2026/",
        "├── src/",
        "│   ├── app.js                    ← Servidor, Socket.IO y configuración global",
        "│   ├── config/",
        "│   │   ├── db.js                 ← Conexión MongoDB con retry y graceful shutdown",
        "│   │   └── passport.js           ← Estrategias: Local + Google OAuth",
        "│   ├── controllers/",
        "│   │   ├── auth.controller.js    ← Registro, login JWT, logout, perfil, sesión",
        "│   │   ├── group.controller.js   ← Crear grupos, invitar, listar miembros",
        "│   │   ├── groupPoints.controller.js  ← Leaderboard por grupo",
        "│   │   ├── invitation.controller.js   ← Invitaciones in-app y por link",
        "│   │   ├── match.controller.js        ← Partidos desde api-sports",
        "│   │   ├── mvpPrediction.controller.js← MVP por partido",
        "│   │   ├── prediction.controller.js   ← Resultado + awards del torneo",
        "│   │   ├── user.controller.js         ← CRUD de usuarios (admin)",
        "│   │   └── webhook.controller.js      ← Recepción y verificación HMAC",
        "│   ├── middlewares/",
        "│   │   ├── auth.middleware.js    ← verifyToken: JWT desde header o cookie",
        "│   │   └── role.middleware.js    ← roleMiddleware: control por rol",
        "│   ├── models/",
        "│   │   ├── User.js              ← Usuario con bcrypt y Google OAuth",
        "│   │   ├── Prediction.js        ← Predicción de resultado + awards",
        "│   │   ├── Group.js / Membership.js / GroupPoints.js",
        "│   │   ├── Invitation.js        ← Token, estado, expiración",
        "│   │   ├── ProcessedFixture.js  ← Deduplicación de webhooks",
        "│   │   └── Correction.js        ← Audit trail del reconciler",
        "│   ├── routes/                  ← Un archivo por recurso",
        "│   └── services/",
        "│       ├── cron.service.js      ← Reconciliador automático (cada 5 min)",
        "│       ├── notification.service.js  ← Notificaciones in-app via Socket.IO",
        "│       ├── points.service.js    ← Cálculo y aplicación de puntos",
        "│       └── webhook.processor.js ← Lógica de negocio de eventos",
        "├── scripts/                     ← makeToken.js, backfill_ft.js",
        "├── postman/                     ← 6 colecciones listas para importar",
        "├── .env.example",
        "└── README.md",
      ]),
      spacer(),

      heading2("Explicación de cada capa"),
      makeTable(
        ["Capa", "Responsabilidad"],
        [
          ["config", "Configuración de infraestructura: DB con reintentos automáticos y estrategias de Passport aisladas del resto de la app."],
          ["models", "Esquemas Mongoose con hooks pre-save (bcrypt), índices únicos y strict mode. Son la única capa que toca la DB directamente."],
          ["routes", "Definición de endpoints y asignación de middlewares + controllers. Sin lógica de negocio."],
          ["controllers", "Lógica HTTP: reciben req, coordinan con services/models, responden. Son el único lugar que conoce req y res."],
          ["middlewares", "Lógica transversal: verifyToken valida JWT (header o cookie), roleMiddleware verifica el rol del usuario."],
          ["services", "Lógica de negocio reutilizable sin dependencia HTTP. Pueden ser llamados desde controllers, cron o webhooks."],
        ],
        [2200, 7160]
      ),
      spacer(),

      heading2("Diagrama del flujo de autenticación"),
      ...codeBlock([
        "Cliente",
        "  │",
        "  ├─► POST /api/auth/register ──────► Crear User",
        "  │                                    bcrypt hash via pre-save hook",
        "  │                                    Responde: { user }",
        "  │",
        "  ├─► POST /api/auth/login ──────────► Validar email + comparePassword",
        "  │                                    Firmar JWT { id, email, role } exp 1h",
        "  │                                    Cookie authToken (httpOnly, lax)",
        "  │                                    Responde: { user, token }",
        "  │",
        "  ├─► POST /api/auth/passport-login ─► Passport LocalStrategy",
        "  │                                    Sesión en MongoDB (connect-mongo)",
        "  │",
        "  ├─► GET /api/auth/google ──────────► Redirect a Google",
        "  │       └─► /google/callback ──────► Crear/vincular User con googleId",
        "  │",
        "  └─► Rutas protegidas",
        "        ├─► verifyToken",
        "        │     Lee: Authorization: Bearer <token>  ó  cookie authToken",
        "        │     Verifica JWT → popula req.user { id, email, role }",
        "        │     401 si no hay token o es inválido",
        "        │",
        "        └─► roleMiddleware(['admin'])",
        "              403 si el rol no coincide",
        "              200 si tiene permiso → ejecuta controller",
      ]),
      pageBreak(),

      // ══════════════════════════════════════════
      // 3. IMPLEMENTACIÓN TÉCNICA
      // ══════════════════════════════════════════
      heading1("3. Implementación Técnica"),
      spacer(),

      // 3.1 Registro
      heading2("3.1 Registro de Usuario"),
      labelValue("Endpoint", "POST /api/auth/register"),
      spacer(),
      heading3("Modelo User.js — hash automático con bcrypt (pre-save hook)"),
      ...codeBlock([
        "// src/models/User.js",
        "userSchema.pre('save', async function (next) {",
        "  if (!this.isModified('password') || !this.password) return next();",
        "  const salt = await bcrypt.genSalt(10);",
        "  this.password = await bcrypt.hash(this.password, salt);",
        "  next();",
        "});",
      ]),
      spacer(),
      heading3("Controller — validación de duplicados"),
      ...codeBlock([
        "// src/controllers/auth.controller.js",
        "export const registerUser = async (req, res) => {",
        "  const { first_name, last_name, email, password } = req.body;",
        "",
        "  const existingUser = await User.findOne({ email: email.toLowerCase() });",
        "  if (existingUser) {",
        "    return res.status(409).json({ message: 'El email ya existe' });",
        "  }",
        "",
        "  // El pre-save hook hashea la contraseña automáticamente",
        "  const newUser = new User({ first_name, last_name, email, password });",
        "  await newUser.save();",
        "  return res.status(201).json({ message: 'Usuario registrado', user: safeUser });",
        "};",
      ]),
      spacer(),
      heading3("Request y Response"),
      ...codeBlock([
        "// Request",
        "POST /api/auth/register",
        "{ \"first_name\": \"Juan\", \"last_name\": \"Perez\",",
        "  \"email\": \"juan@ejemplo.com\", \"password\": \"Juan1234\" }",
        "",
        "// Response 201",
        "{ \"message\": \"Usuario registrado exitosamente\",",
        "  \"user\": { \"id\": \"683f2a...\", \"email\": \"juan@ejemplo.com\", \"role\": \"user\" } }",
        "",
        "// Response 409 (duplicado)",
        "{ \"message\": \"El email ya existe\" }",
      ]),
      spacer(),
      screenshotPlaceholder("Registro exitoso — status 201"),
      spacer(),

      // 3.2 Login
      heading2("3.2 Login Local con Passport"),
      labelValue("Endpoints", "POST /api/auth/login  |  POST /api/auth/passport-login"),
      spacer(),
      heading3("Configuración de Passport LocalStrategy"),
      ...codeBlock([
        "// src/config/passport.js",
        "passport.use(new LocalStrategy(",
        "  { usernameField: 'email' },",
        "  async (email, password, done) => {",
        "    const user = await User.findOne({ email: email.toLowerCase() });",
        "    if (!user) return done(null, false, { message: 'Usuario no encontrado' });",
        "    if (!user.password) return done(null, false, { message: 'Cuenta OAuth' });",
        "    const isMatch = await user.comparePassword(password);",
        "    if (!isMatch) return done(null, false, { message: 'Contraseña incorrecta' });",
        "    return done(null, user);",
        "  }",
        "));",
      ]),
      spacer(),
      heading3("Generación del JWT con { id, email, role } — expiración 1h"),
      ...codeBlock([
        "// src/controllers/auth.controller.js",
        "const payload = { id: user._id, email: user.email, role: user.role };",
        "const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });",
      ]),
      spacer(),
      heading3("Token en body y cookie authToken (httpOnly, sameSite: lax)"),
      ...codeBlock([
        "res.cookie('authToken', token, {",
        "  httpOnly: true,           // no accesible por JavaScript (protege contra XSS)",
        "  sameSite: 'lax',          // bloquea POST cross-site (mitiga CSRF)",
        "  secure: process.env.NODE_ENV === 'production',   // solo HTTPS en prod",
        "  maxAge: 1000 * 60 * 60   // 1 hora",
        "});",
        "return res.json({ message: 'Login exitoso', user: safeUser, token });",
      ]),
      spacer(),
      heading3("Request y Response"),
      ...codeBlock([
        "// Request",
        "POST /api/auth/login",
        "{ \"email\": \"juan@ejemplo.com\", \"password\": \"Juan1234\" }",
        "",
        "// Response 200",
        "{ \"message\": \"Login exitoso\",",
        "  \"user\": { \"id\": \"683f2a...\", \"email\": \"juan@ejemplo.com\", \"role\": \"user\" },",
        "  \"token\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\" }",
        "",
        "// Response 401 (credenciales incorrectas)",
        "{ \"message\": \"Credenciales inválidas\" }",
      ]),
      spacer(),
      screenshotPlaceholder("Login exitoso — token en body"),
      spacer(),
      screenshotPlaceholder("Cookie authToken en la respuesta (Headers > Set-Cookie)"),
      spacer(),

      // 3.3 Google OAuth
      heading2("3.3 Login OAuth — Google"),
      labelValue("Endpoints", "GET /api/auth/google  |  GET /api/auth/google/callback"),
      spacer(),
      heading3("Configuración de la GoogleStrategy"),
      ...codeBlock([
        "// src/config/passport.js",
        "passport.use(new GoogleStrategy({",
        "  clientID: process.env.GOOGLE_CLIENT_ID,",
        "  clientSecret: process.env.GOOGLE_CLIENT_SECRET,",
        "  callbackURL: process.env.GOOGLE_CALLBACK_URL",
        "}, async (accessToken, refreshToken, profile, done) => {",
        "  const email = profile.emails?.[0]?.value?.toLowerCase();",
        "",
        "  // 1) Buscar por googleId",
        "  let user = await User.findOne({ googleId: profile.id });",
        "",
        "  // 2) Si no existe por googleId, buscar por email para vincular",
        "  if (!user && email) {",
        "    user = await User.findOne({ email });",
        "    if (user) { user.googleId = profile.id; await user.save(); }",
        "  }",
        "",
        "  // 3) Si no existe, crear nuevo usuario automáticamente",
        "  if (!user) {",
        "    user = new User({",
        "      first_name: profile.name?.givenName || '',",
        "      email, googleId: profile.id, role: 'user'",
        "    });",
        "    await user.save();",
        "  }",
        "  return done(null, user);",
        "}));",
      ]),
      spacer(),
      heading3("Cómo se mantiene la sesión"),
      para("Passport usa serializeUser para guardar solo el ID en la sesión, y deserializeUser para recuperar el usuario completo de la DB en cada request:"),
      ...codeBlock([
        "passport.serializeUser((user, done) => done(null, user.id));",
        "",
        "passport.deserializeUser(async (id, done) => {",
        "  const user = await User.findById(id).select('-password');",
        "  done(null, user);",
        "});",
      ]),
      spacer(),
      screenshotPlaceholder("Redirect a Google — pantalla de selección de cuenta"),
      spacer(),

      // 3.4 Sesiones
      heading2("3.4 Sistema de Sesiones"),
      spacer(),
      heading3("Configuración de express-session con connect-mongo"),
      ...codeBlock([
        "// src/app.js",
        "import MongoStore from 'connect-mongo';",
        "",
        "app.use(session({",
        "  secret: process.env.SESSION_SECRET,",
        "  resave: false,",
        "  saveUninitialized: false,",
        "  store: MongoStore.create({",
        "    mongoUrl: process.env.MONGO_URI,",
        "    collectionName: 'sessions',",
        "    ttl: 60 * 60           // 1 hora",
        "  }),",
        "  cookie: {",
        "    httpOnly: true,",
        "    sameSite: 'lax',",
        "    secure: process.env.NODE_ENV === 'production',",
        "    maxAge: 1000 * 60 * 60",
        "  }",
        "}));",
      ]),
      spacer(),
      heading3("Documento de sesión en MongoDB Atlas"),
      ...codeBlock([
        "{",
        "  \"_id\": \"s%3A8F3kLmNpQrStUvWx...\",",
        "  \"expires\": { \"$date\": \"2026-06-01T12:00:00.000Z\" },",
        "  \"session\": {",
        "    \"cookie\": { \"httpOnly\": true, \"sameSite\": \"lax\", \"secure\": false },",
        "    \"passport\": { \"user\": \"683f2a1b4e5c6d7e8f9a0b1c\" }",
        "  }",
        "}",
      ]),
      spacer(),
      heading3("Endpoint GET /api/auth/session"),
      ...codeBlock([
        "export const getSession = async (req, res) => {",
        "  if (req.user && req.user.id) {",
        "    const user = await User.findById(req.user.id).select('-password');",
        "    return res.json({ authenticated: true, user });",
        "  }",
        "  return res.status(401).json({ authenticated: false, message: 'Sin sesión activa' });",
        "};",
      ]),
      spacer(),
      screenshotPlaceholder("GET /api/auth/session con token válido → 200 authenticated: true"),
      spacer(),
      screenshotPlaceholder("GET /api/auth/session sin token → 401 authenticated: false"),
      spacer(),
      pageBreak(),

      // 3.5 Rutas Protegidas
      heading2("3.5 Rutas Protegidas"),
      spacer(),
      heading3("Middleware verifyToken — JWT desde header o cookie"),
      ...codeBlock([
        "// src/middlewares/auth.middleware.js",
        "export const verifyToken = (req, res, next) => {",
        "  const authHeader = req.headers['authorization'];",
        "  let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;",
        "",
        "  // Fallback a cookie authToken",
        "  if (!token && req.cookies) {",
        "    token = req.cookies.authToken || req.cookies.token || null;",
        "  }",
        "",
        "  if (!token) return res.status(401).json({ message: 'Token no proporcionado' });",
        "",
        "  const decoded = jwt.verify(token, JWT_SECRET);",
        "  req.user = { id: decoded.id || decoded.sub, email: decoded.email, role: decoded.role };",
        "  return next();",
        "};",
      ]),
      spacer(),
      heading3("GET /api/auth/profile — protegida por JWT"),
      ...codeBlock([
        "// src/routes/auth.routes.js",
        "router.get('/profile', verifyToken, getProfile);",
        "",
        "// src/controllers/auth.controller.js",
        "export const getProfile = async (req, res) => {",
        "  const user = await User.findById(req.user.id).select('-password');",
        "  return res.json(user);",
        "};",
        "",
        "// Response 200",
        "{ \"_id\": \"683f2a...\", \"first_name\": \"Juan\", \"email\": \"...\",",
        "  \"role\": \"user\", \"totalPoints\": 15 }",
        "",
        "// Sin token → 401",
        "{ \"message\": \"Token no proporcionado\" }",
      ]),
      spacer(),
      heading3("Middleware roleMiddleware — autorización por rol"),
      ...codeBlock([
        "// src/middlewares/role.middleware.js",
        "export const roleMiddleware = (allowedRoles) => (req, res, next) => {",
        "  if (!allowedRoles.includes(req.user.role)) {",
        "    return res.status(403).json({ message: 'Acceso denegado: rol insuficiente' });",
        "  }",
        "  next();",
        "};",
      ]),
      spacer(),
      heading3("GET /api/users/admin — protegida por JWT + rol admin"),
      ...codeBlock([
        "// src/routes/user.routes.js",
        "router.get('/admin', verifyToken, roleMiddleware(['admin']), (req, res) => {",
        "  res.json({ message: 'Panel de administración', admin: req.user });",
        "});",
        "",
        "// Token de admin → 200",
        "{ \"message\": \"Panel de administración\", \"admin\": { \"role\": \"admin\" } }",
        "",
        "// Token de usuario normal → 403",
        "{ \"message\": \"Acceso denegado: rol insuficiente\" }",
        "",
        "// Sin token → 401",
        "{ \"message\": \"Token no proporcionado\" }",
      ]),
      spacer(),
      screenshotPlaceholder("GET /api/auth/profile con token válido → 200 con datos del usuario"),
      spacer(),
      screenshotPlaceholder("GET /api/auth/profile sin token → 401"),
      spacer(),
      screenshotPlaceholder("GET /api/users/admin con token de admin → 200 OK"),
      spacer(),
      screenshotPlaceholder("GET /api/users/admin con token de usuario normal → 403 Forbidden"),
      spacer(),

      // 3.6 Logout
      heading2("3.6 Logout"),
      labelValue("Endpoint", "POST /api/auth/logout"),
      spacer(),
      ...codeBlock([
        "// src/controllers/auth.controller.js",
        "export const logoutUser = (req, res) => {",
        "  req.logout((err) => {          // 1. Passport limpia req.user",
        "    req.session.destroy(() => {  // 2. Elimina sesión en MongoDB",
        "      res.clearCookie('authToken'); // 3. Limpia cookie del browser",
        "      return res.json({ message: 'Sesión cerrada correctamente' });",
        "    });",
        "  });",
        "};",
      ]),
      spacer(),
      note("El JWT emitido en el body es stateless: no puede invalidarse desde el servidor. El cliente debe descartarlo. Con expiración de 1h, el impacto es acotado."),
      spacer(),
      screenshotPlaceholder("POST /api/auth/logout → 200 'Sesión cerrada correctamente'"),
      spacer(),
      screenshotPlaceholder("GET /api/auth/profile después del logout → 401"),
      pageBreak(),

      // ══════════════════════════════════════════
      // 4. SEGURIDAD
      // ══════════════════════════════════════════
      heading1("4. Seguridad y Decisiones Arquitectónicas"),
      spacer(),

      heading2("¿Dónde vive el rol y por qué?"),
      para("El rol vive en dos lugares simultáneamente:"),
      bullet("MongoDB (campo role en el modelo User): fuente de verdad.", true),
      bullet("JWT payload: se embebe al momento del login para no consultar la DB en cada request."),
      spacer(),
      para("El middleware roleMiddleware confía en el JWT. Es una decisión de performance: evitar una query a la DB por cada request protegido. El trade-off es que si el rol cambia en la DB, el JWT viejo sigue siendo válido hasta que expire (máximo 1 hora)."),
      spacer(),

      heading2("¿Cómo se mitiga CSRF?"),
      bullet("Cookie sameSite: 'lax' — el browser no envía la cookie en requests cross-site con POST desde otro dominio. Bloquea el ataque CSRF clásico.", true),
      bullet("Cookie httpOnly: true — JavaScript del cliente no puede leer el token. Un script malicioso (XSS) no puede robarlo."),
      bullet("JWT en Authorization header — no es vulnerable a CSRF porque el browser no lo envía automáticamente."),
      spacer(),

      heading2("¿Cómo se diferencia entorno local y producción?"),
      ...codeBlock([
        "secure: process.env.NODE_ENV === 'production'",
        "",
        "// development: cookie viaja por HTTP (necesario en localhost)",
        "// production:  cookie solo por HTTPS (evita intercepción en texto plano)",
      ]),
      spacer(),

      heading2("¿Por qué cookie + JWT y no solo uno?"),
      para("Se implementan ambos porque sirven para contextos diferentes:"),
      bullet("JWT en Authorization: Bearer — para clientes sin cookies (Postman, apps móviles, otras APIs).", true),
      bullet("Cookie authToken httpOnly — para el browser web. Guardar el token en localStorage sería vulnerable a XSS."),
      spacer(),
      para("El middleware verifyToken acepta ambos, dando prioridad al header. Un único middleware soporta todos los tipos de cliente."),
      spacer(),

      heading2("¿Qué ocurre si el rol cambia con un token ya emitido?"),
      para("El JWT es inmutable una vez firmado. Si un usuario con role 'user' es promovido a 'admin' en la DB, necesita hacer logout y login nuevamente para obtener un JWT actualizado."),
      spacer(),
      para("Del mismo modo, si un admin pierde su rol, seguirá teniendo acceso hasta que el token expire (máximo 1 hora). En proyectos de mayor escala esto se resuelve con una blacklist de tokens en Redis o reduciendo el tiempo de expiración. Para este proyecto (un solo admin, contexto académico), el riesgo es aceptable."),
      pageBreak(),

      // ══════════════════════════════════════════
      // 5. EVIDENCIA
      // ══════════════════════════════════════════
      heading1("5. Evidencia de Funcionamiento"),
      spacer(),

      heading2("Token JWT real generado"),
      ...codeBlock([
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        ".eyJpZCI6IjY5ZjkyODM2ZjAyNTFmMGE5N2IyMjE5OSIsImVtYWlsIjoiZW1tYS4yMjkyODhAZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzQ4MDAwMDAwLCJleHAiOjE3NDgwMDM2MDB9",
        ".signature",
      ]),
      spacer(),
      heading3("Payload decodificado (jwt.io)"),
      ...codeBlock([
        "{",
        "  \"id\": \"69f92836f0251f0a97b22199\",",
        "  \"email\": \"emma.229288@gmail.com\",",
        "  \"role\": \"admin\",",
        "  \"iat\": 1748000000,",
        "  \"exp\": 1748003600",
        "}",
      ]),
      spacer(),

      heading2("Cookie authToken configurada correctamente"),
      ...codeBlock([
        "Set-Cookie: authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...;",
        "            Path=/;",
        "            Expires=Sun, 01 Jun 2026 12:00:00 GMT;",
        "            HttpOnly;",
        "            SameSite=Lax",
      ]),
      spacer(),

      heading2("Capturas de Postman"),
      para("Colecciones disponibles en la carpeta /postman del proyecto. Importar Prode2026.postman_environment.json antes de ejecutar."),
      spacer(),
      screenshotPlaceholder("Registro de usuario — POST /api/auth/register → 201"),
      spacer(),
      screenshotPlaceholder("Login exitoso — token en body + cookie authToken en Headers"),
      spacer(),
      screenshotPlaceholder("GET /api/auth/profile con token válido → 200 con datos del usuario"),
      spacer(),
      screenshotPlaceholder("GET /api/users/admin con token de admin → 200 OK"),
      spacer(),
      screenshotPlaceholder("GET /api/users/admin con token de usuario normal → 403 Forbidden"),
      spacer(),
      screenshotPlaceholder("POST /api/auth/logout → 200 + cookie eliminada"),
      pageBreak(),

      // ══════════════════════════════════════════
      // 6. INSTALACIÓN
      // ══════════════════════════════════════════
      heading1("6. Instrucciones de Instalación Local"),
      spacer(),

      heading2("Dependencias necesarias"),
      bullet("Node.js v18 o superior"),
      bullet("Cuenta en MongoDB Atlas (plan gratuito en mongodb.com/atlas)"),
      bullet("Cuenta en Google Cloud Console para OAuth (console.cloud.google.com)"),
      bullet("API key de api-sports.io (plan gratuito: 100 requests/día)"),
      spacer(),

      heading2("Archivo .env.example"),
      ...codeBlock([
        "# Servidor",
        "PORT=3000",
        "NODE_ENV=development",
        "",
        "# Base de datos",
        "MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/prode2026",
        "",
        "# Autenticación",
        "JWT_SECRET=your_jwt_secret_very_long_and_random",
        "SESSION_SECRET=your_session_secret",
        "COOKIE_SECRET=your_cookie_secret",
        "",
        "# Google OAuth",
        "GOOGLE_CLIENT_ID=your_google_client_id",
        "GOOGLE_CLIENT_SECRET=your_google_client_secret",
        "GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback",
        "",
        "# API externa (api-sports.io)",
        "FOOTBALL_API_KEY=your_api_sports_key",
        "WORLD_CUP_LEAGUE_ID=1",
        "API_SEASON=2026",
        "",
        "# Webhooks",
        "WEBHOOK_SECRET=your_webhook_secret",
        "",
        "# Frontend",
        "FRONTEND_URL=http://localhost:5173",
      ]),
      spacer(),

      heading2("Variables de entorno explicadas"),
      makeTable(
        ["Variable", "Descripción"],
        [
          ["PORT", "Puerto del servidor (default: 3000)"],
          ["NODE_ENV", "Entorno: development o production"],
          ["MONGO_URI", "URI de conexión a MongoDB Atlas (incluye usuario, contraseña y cluster)"],
          ["JWT_SECRET", "Clave para firmar y verificar tokens JWT — debe ser larga y aleatoria"],
          ["SESSION_SECRET", "Clave para firmar cookies de sesión de express-session"],
          ["GOOGLE_CLIENT_ID", "ID de la aplicación registrada en Google Cloud Console"],
          ["GOOGLE_CLIENT_SECRET", "Secreto de la aplicación en Google Cloud Console"],
          ["GOOGLE_CALLBACK_URL", "URL de redirect registrada en Google (debe coincidir exactamente)"],
          ["FOOTBALL_API_KEY", "API key de api-sports.io para consultar fixture data"],
          ["WORLD_CUP_LEAGUE_ID", "ID de liga del Mundial en api-sports (1 = FIFA World Cup)"],
          ["API_SEASON", "Temporada a consultar (2026 para el Mundial real)"],
          ["WEBHOOK_SECRET", "Secreto para verificar firma HMAC-SHA256 de webhooks entrantes"],
          ["FRONTEND_URL", "URL del frontend para configuración de CORS y links de invitación"],
        ],
        [3000, 6360]
      ),
      spacer(),

      heading2("Pasos para ejecutar localmente"),
      ...codeBlock([
        "# 1. Clonar el repositorio",
        "git clone <url-del-repo>",
        "cd Prode_2026",
        "",
        "# 2. Instalar dependencias",
        "npm install",
        "",
        "# 3. Configurar variables de entorno",
        "cp .env.example .env",
        "# Editar .env con las credenciales reales",
        "",
        "# 4. Ejecutar en modo desarrollo",
        "npm run dev",
        "",
        "# Servidor disponible en: http://localhost:3000",
        "",
        "# Scripts adicionales:",
        "node scripts/makeToken.js    # Genera token JWT de admin para testing",
        "node scripts/backfill_ft.js  # Reconcilia puntos de partidos históricos",
      ]),
      spacer(),
      note("Las colecciones Postman están en /postman. Importar primero Prode2026.postman_environment.json y luego las colecciones deseadas."),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("D:\\Manu\\Proyectos\\Prode_2026\\entrega_backend2.docx", buffer);
  console.log("OK: entrega_backend2.docx generado");
}).catch(err => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
