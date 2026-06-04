import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import useSocket from "../../hooks/useSocket";
import usePushNotifications, { subscribeToPush } from "../../hooks/usePushNotifications";
import { getExtras } from "../../services/prediction.service";

const KNOCKOUT_DATE = new Date("2026-06-27T00:00:00");
const REMINDER_DATE = new Date("2026-06-26T00:00:00");

const ExtrasReminder = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const now = new Date();
    // Mostrar solo el día 26 de junio (1 día antes del cierre)
    if (now < REMINDER_DATE || now >= KNOCKOUT_DATE) return;

    // Verificar si tiene extras incompletos
    getExtras().then((res) => {
      const e = res.data;
      const filled = [e.worldChampion, e.bestPlayer, e.topScorer, e.bestGoalkeeper].filter(Boolean).length;
      if (filled < 4) setShow(true);
    }).catch(() => {});
  }, []);

  if (!show) return null;

  return (
    <div className="bg-yellow-400 text-yellow-900 px-6 py-2.5 flex items-center justify-between text-sm font-medium">
      <span>⚠️ ¡Mañana cierra Extras! Completá tus pronósticos de campeón, goleador y más antes de las 00:00.</span>
      <div className="flex items-center gap-3">
        <Link to="/extras" className="underline font-bold hover:text-yellow-700">
          Ir a Extras →
        </Link>
        <button onClick={() => setShow(false)} className="opacity-60 hover:opacity-100 font-bold">✕</button>
      </div>
    </div>
  );
};

const InvitationModal = () => {
  const [invitations, setInvitations] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    import("../../services/group.service").then(({ getPendingInvitations }) => {
      getPendingInvitations().then(res => {
        if (res.data?.length > 0) setInvitations(res.data);
      }).catch(() => {});
    });
  }, []);

  if (invitations.length === 0) return null;

  const inv = invitations[current];

  const handleAccept = async () => {
    const { acceptInvitation } = await import("../../services/group.service");
    await acceptInvitation(inv.token).catch(() => {});
    next();
  };

  const handleReject = async () => {
    const { rejectInvitation } = await import("../../services/group.service");
    await rejectInvitation(inv.token).catch(() => {});
    next();
  };

  const next = () => {
    if (current + 1 < invitations.length) setCurrent(c => c + 1);
    else setInvitations([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">¡Tenés una invitación!</h2>
        <p className="text-gray-600 text-sm mb-1">
          <span className="font-semibold text-green-700">
            {inv.inviter?.first_name} {inv.inviter?.last_name}
          </span>{" "}
          te invitó a unirte al grupo:
        </p>
        <p className="text-xl font-bold text-gray-800 my-3">
          "{inv.group?.name}"
        </p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={handleReject}
            style={{ padding: "10px 24px", borderRadius: "12px", fontSize: "14px", fontWeight: "500", border: "1px solid #d1d5db", color: "#6b7280", flex: 1 }}
            className="hover:bg-gray-50 transition-colors"
          >
            Rechazar
          </button>
          <button
            onClick={handleAccept}
            style={{ padding: "10px 24px", borderRadius: "12px", fontSize: "14px", fontWeight: "600", background: "#16a34a", color: "#fff", flex: 1 }}
            className="hover:opacity-90 transition-opacity"
          >
            ✅ Aceptar
          </button>
        </div>
        {invitations.length > 1 && (
          <p className="text-xs text-gray-400 mt-3">{current + 1} de {invitations.length}</p>
        )}
      </div>
    </div>
  );
};

const Layout = () => {
  useSocket();
  const { bannerVisible, setBannerVisible } = usePushNotifications();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-main)" }}>
      <Navbar />
      <ExtrasReminder />

      {/* Banner activar notificaciones push */}
      {bannerVisible && (
        <div className="bg-green-700 text-white px-6 py-3 flex items-center justify-between text-sm">
          <span>🔔 ¿Querés recibir avisos cuando empiece un partido?</span>
          <div className="flex gap-2 ml-4 flex-shrink-0">
            <button
              onClick={async () => {
                const ok = await subscribeToPush();
                setBannerVisible(false);
                if (ok) alert("✅ ¡Notificaciones activadas!");
              }}
              style={{ padding: "4px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: "600", background: "#fff", color: "#166534" }}
            >
              Activar
            </button>
            <button
              onClick={() => setBannerVisible(false)}
              className="text-green-200 hover:text-white text-xs"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}
      <InvitationModal />
      <main className="flex-1 w-full" style={{ padding: "2rem 2%" }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
