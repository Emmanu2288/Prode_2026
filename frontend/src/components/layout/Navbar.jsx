import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import useNotificationStore from "../../store/notificationStore";
import useDarkMode from "../../hooks/useDarkMode";
import { acceptInvitation, rejectInvitation } from "../../services/group.service";

const NAV_LINKS = [
  { to: "/dashboard",   label: "Inicio" },
  { to: "/fixtures",    label: "Partidos" },
  { to: "/groups",      label: "Grupos" },
  { to: "/predictions", label: "Pronósticos" },
  { to: "/extras",      label: "Extras" },
  { to: "/leaderboard", label: "Ranking" },
];

// ─── Campana de notificaciones ───────────────────────────────
const NotificationBell = () => {
  const { notifications, markAllRead, removeNotification } = useNotificationStore();
  const unread = notifications.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAccept = async (notif) => {
    try { await acceptInvitation(notif.token); removeNotification(notif.id); } catch {}
  };
  const handleReject = async (notif) => {
    try { await rejectInvitation(notif.token); removeNotification(notif.id); } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative p-1.5 rounded-lg hover:bg-green-700 transition-colors"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-72 bg-card border border-theme rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-theme flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">Notificaciones</span>
            {notifications.length > 0 && (
              <button onClick={() => notifications.forEach((n) => removeNotification(n.id))}
                className="text-xs text-muted hover:text-red-500">Limpiar</button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">Sin notificaciones</p>
            ) : notifications.map((n) => (
              <div key={n.id} className="px-4 py-3 border-b border-theme">
                <p className="text-sm font-medium text-primary">{n.title}</p>
                <p className="text-xs text-secondary mt-0.5">{n.message}</p>
                {n.type === "invitation" && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleAccept(n)}
                      className="bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-lg">Aceptar</button>
                    <button onClick={() => handleReject(n)}
                      className="border border-theme text-secondary text-xs px-3 py-1 rounded-lg">Rechazar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Navbar principal ─────────────────────────────────────────
const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, setDark] = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  };

  // Cerrar menú al cambiar de ruta
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <>
      <nav className="bg-green-800 text-white shadow-lg border-b border-green-700 relative z-40"
           style={{ paddingLeft: "1.5rem", paddingRight: "1.5rem", paddingTop: "0.6rem", paddingBottom: "0.6rem" }}>
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 group flex-shrink-0">
            <img src="/logo.png" alt="Prode 2026"
              className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              onError={(e) => { e.target.style.display = "none"; }} />
            <span className="font-football text-xl tracking-wider text-white group-hover:text-green-200 transition-colors">
              PRODE 2026
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4 font-condensed text-sm tracking-wide">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`hover:text-green-300 transition-colors uppercase ${location.pathname === to ? "text-green-300 font-bold" : ""}`}>
                {label}
              </Link>
            ))}
            {user?.role === "admin" && (
              <Link to="/admin"
                style={{ padding: "4px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: "700", background: "#facc15", color: "#000" }}
                className="hover:opacity-90 transition-opacity">Admin</Link>
            )}
            <button onClick={() => setDark(!dark)}
              className="p-1.5 rounded-lg hover:bg-green-700 transition-colors" title={dark ? "Modo claro" : "Modo oscuro"}>
              {dark ? "☀️" : "🌙"}
            </button>
            <NotificationBell />
            <div className="flex items-center gap-2" style={{ borderLeft: "1px solid #16a34a", paddingLeft: "1rem", marginLeft: "0.5rem" }}>
              <Link to="/profile" className="text-green-200 text-sm font-medium hover:text-white transition-colors">
                {user?.first_name}
              </Link>
              <button onClick={handleLogout}
                style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "600", background: "#dc2626", color: "#fff" }}
                className="hover:opacity-90 transition-opacity">
                Salir →
              </button>
            </div>
          </div>

          {/* Mobile: iconos + hamburguesa */}
          <div className="flex md:hidden items-center gap-2">
            <button onClick={() => setDark(!dark)} className="p-1.5 rounded-lg hover:bg-green-700 transition-colors">
              {dark ? "☀️" : "🌙"}
            </button>
            <NotificationBell />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-green-700 transition-colors ml-1"
              aria-label="Menú"
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu desplegable */}
      {menuOpen && (
        <div className="md:hidden bg-green-900 text-white z-30 shadow-xl border-b border-green-700">
          <div style={{ padding: "0.75rem 1.5rem" }} className="flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`font-condensed uppercase text-base py-2.5 px-3 rounded-lg transition-colors ${
                  location.pathname === to
                    ? "bg-green-700 text-white font-bold"
                    : "hover:bg-green-800 text-green-100"
                }`}>
                {label}
              </Link>
            ))}
            {user?.role === "admin" && (
              <Link to="/admin"
                className="font-condensed uppercase text-base py-2.5 px-3 rounded-lg bg-yellow-400 text-black font-bold mt-1">
                ⭐ Admin
              </Link>
            )}
            <div className="border-t border-green-700 mt-2 pt-3 flex items-center justify-between">
              <Link to="/profile" className="text-green-200 text-sm font-medium hover:text-white">
                👤 {user?.first_name} {user?.last_name}
              </Link>
              <button onClick={handleLogout}
                style={{ padding: "6px 16px", borderRadius: "999px", fontSize: "13px", fontWeight: "600", background: "#dc2626", color: "#fff" }}
                className="hover:opacity-90 transition-opacity">
                Salir →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
