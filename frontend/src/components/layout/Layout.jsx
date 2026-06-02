import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import useSocket from "../../hooks/useSocket";
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

const Layout = () => {
  useSocket();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-main)" }}>
      <Navbar />
      <ExtrasReminder />
      <main className="flex-1 w-full" style={{ padding: "2rem 2%" }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
