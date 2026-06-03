# ⚽ Prode 2026

App de predicciones para el **FIFA World Cup 2026**. Competí con tus amigos pronosticando resultados de partidos, MVP, campeón y más.

🌐 **Producción:** [prode-2026-mundial.vercel.app](https://prode-2026-mundial.vercel.app)

---

## 🚀 Stack Tecnológico

### Backend
| Tecnología | Uso |
|---|---|
| Node.js + Express | Servidor REST API |
| MongoDB Atlas + Mongoose | Base de datos |
| JWT + Passport.js | Autenticación (local + Google OAuth) |
| express-session + connect-mongo | Sesiones persistidas en MongoDB |
| Socket.IO | Notificaciones y live scores en tiempo real |
| node-cron | Reconciliación automática de puntos (c/5 min) |
| Resend | Emails transaccionales (forgot password) |
| api-football.com | Datos del Mundial (fixtures, jugadores, ratings) |

### Frontend
| Tecnología | Uso |
|---|---|
| React 18 + Vite | Framework frontend |
| React Router v6 | Navegación SPA |
| Zustand | Estado global (auth, notificaciones) |
| Tailwind CSS v4 | Estilos |
| Axios | Llamadas HTTP |
| socket.io-client | Conexión Socket.IO |
| vite-plugin-pwa | Progressive Web App instalable |

### Deploy
| Servicio | Uso |
|---|---|
| Railway | Backend (Node.js) |
| Vercel | Frontend (React) |
| MongoDB Atlas | Base de datos |

---

## 🏗️ Estructura del Proyecto

```
Prode_2026/
├── src/                        # Backend
│   ├── config/                 # DB, Passport
│   ├── controllers/            # Lógica de negocio
│   ├── middlewares/            # Auth, roles
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # Express routers
│   ├── services/               # Cron, points, webhooks, notifications
│   └── utils/                  # Alertas
├── frontend/                   # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # Navbar, Footer, Layout, ProtectedRoute
│   │   │   └── fixtures/       # MatchCard, RoundFilter, StatusBadge
│   │   ├── hooks/              # useSocket, useMatches, useDarkMode, useInstallPrompt
│   │   ├── pages/              # Todas las páginas
│   │   ├── services/           # API calls
│   │   └── store/              # Zustand stores
│   └── public/                 # Imágenes, logo, PWA icons
├── postman/                    # Collections de Postman
├── scripts/                    # Scripts utilitarios
└── .env.example                # Variables de entorno de ejemplo
```

---

## 📱 Funcionalidades

### Autenticación
- Registro con email/contraseña o Google OAuth
- JWT (8h de duración) + cookie HttpOnly
- Recuperación de contraseña por email (Resend)
- Perfil editable (nombre, apellido, contraseña)

### Pronósticos
- Pronosticar resultado de cada partido (habilitado hasta que empiece)
- Editar pronóstico hasta el inicio del partido
- MVP del partido (Superior Player of the Match) — jugador de ambos equipos
- Extras del torneo: Campeón, Goleador, Golden Ball, Golden Glove (cierra el 27/06)

### Sistema de puntos
| Resultado | Puntos |
|---|---|
| Marcador exacto | +3 |
| Ganador/empate correcto | +1 |
| MVP acertado | +2 |
| Extras del torneo (cada uno) | +5 |

Los puntos se calculan automáticamente al finalizar cada partido via cron/webhook. El MVP se determina por el jugador con mayor rating en api-football.

### Grupos
- Crear grupos privados con nombre y descripción
- Invitar por usuario interno (notificación Socket.IO en tiempo real)
- Invitar por link compartible (un solo link sirve para múltiples personas)
- Modal de aceptar/rechazar invitación al entrar a la app
- Ranking interno del grupo con posiciones y puntos
- Ver predicciones de todos los miembros por partido
- Eliminar grupo (solo el creador)

### Ranking Global
- Leaderboard de todos los usuarios ordenados por puntos
- Medallas para el top 3

### Panel Admin
- Lista de usuarios con estadísticas
- Vista de todos los grupos
- Premios del torneo: calcular puntos para campeón, goleador (automáticos) + Golden Ball y Golden Glove (manuales)
- MVP manual por partido (plan B si el rating automático no coincide)

### PWA
- Instalable en Android y iOS como app nativa
- Botón "📲 Instalar app" en la navbar
- Caché de logos de equipos (carga instantánea)
- Dark mode persistente

---

## ⚙️ Instalación local

### Requisitos
- Node.js 18+
- MongoDB Atlas (cuenta gratuita)
- api-football.com (plan Pro para Mundial 2026)
- Resend.com (cuenta gratuita para emails)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Emmanu2288/Prode_2026.git
cd Prode_2026

# 2. Instalar dependencias del backend
npm install

# 3. Instalar dependencias del frontend
cd frontend && npm install && cd ..

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# 5. Crear frontend/.env
# VITE_FOOTBALL_API_KEY=tu_key
# (VITE_API_URL solo en producción)

# 6. Copiar imágenes al frontend/public/
# logo.png, hero-bg.jpg, card-puntos.jpg, card-pronosticos.jpg,
# card-pendientes.jpg, card-grupos.jpg

# 7. Levantar backend
npm start

# 8. Levantar frontend (en otra terminal)
cd frontend && npm run dev
```

### Variables de entorno (.env)

```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
SESSION_SECRET=...
COOKIE_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FOOTBALL_API_KEY=...
WORLD_CUP_LEAGUE_ID=1
API_SEASON=2026
WEBHOOK_SECRET=...
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=...
```

---

## 🔌 Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/google` | OAuth Google |
| GET | `/api/auth/profile` | Perfil del usuario |
| POST | `/api/auth/forgot-password` | Solicitar reset de contraseña |
| POST | `/api/auth/reset-password` | Confirmar nueva contraseña |
| GET | `/api/matches` | Fixtures del Mundial 2026 |
| GET | `/api/matches/:id/players` | Jugadores de un partido |
| POST | `/api/predictions` | Crear/actualizar pronóstico |
| GET | `/api/predictions/me` | Mis pronósticos |
| GET | `/api/predictions/extras` | Mis pronósticos extras |
| POST | `/api/predictions/extras` | Guardar pronósticos extras |
| GET | `/api/groups/my` | Mis grupos |
| POST | `/api/groups` | Crear grupo |
| POST | `/api/groups/:id/invite` | Invitar a grupo |
| GET | `/api/groups/:id/leaderboard` | Ranking del grupo |
| GET | `/api/users/leaderboard` | Ranking global |
| GET | `/api/admin/users` | Usuarios (admin) |

---

## 🔒 Seguridad

- Contraseñas hasheadas con bcrypt (salt 10)
- JWT firmado con secret aleatorio (expiración 8h)
- Cookies HttpOnly + sameSite: Lax
- CORS configurado para el dominio de producción
- Webhooks verificados con HMAC-SHA256
- Variables de entorno nunca en el repositorio

---

## 📅 Notas importantes

- **API Season:** El plan gratuito de api-football solo da acceso hasta 2024. Para el Mundial 2026 se requiere el plan Pro ($19/mes)
- **Railway:** Plan Hobby ($5/mes). El plan vence el 30/06 — **renovar antes** ya que el Mundial termina el 19/07
- **Resend:** Plan gratuito (3000 emails/mes)

---

## 👨‍💻 Desarrollado por

**Emmanuel López** — [github.com/Emmanu2288](https://github.com/Emmanu2288)
