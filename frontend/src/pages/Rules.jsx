import { Link } from "react-router-dom";
import useAuthStore from "../store/authStore";

const Rules = () => {
  const user = useAuthStore((s) => s.user);
  const backTo = user ? "/dashboard" : "/login";
  const backLabel = user ? "← Volver al inicio" : "← Volver al login";

  return (
    <div className="min-h-screen bg-green-700 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between text-white pt-2 px-1">
          <Link to={backTo} className="text-sm font-medium hover:underline">{backLabel}</Link>
          <h1 className="font-football text-xl tracking-wider">⚽ PRODE 2026</h1>
        </div>

        {/* Hero */}
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
          <p className="text-4xl mb-2">⚽🏆</p>
          <h2 className="text-2xl font-bold text-gray-800">¡Así se juega el Prode 2026!</h2>
          <p className="text-gray-500 text-sm mt-2">
            Pronosticá los resultados del Mundial, sumá puntos y competí por el pozo de tu grupo.
          </p>
        </div>

        {/* Sistema de puntos */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Sistema de puntos</h3>
          <ul className="space-y-2.5 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="shrink-0 bg-green-100 text-green-700 font-bold text-xs px-2 py-1 rounded-lg">3 pts</span>
              <span>Acertás el <b>resultado exacto</b> del partido (ej: pronosticaste 2-1 y terminó 2-1).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 bg-blue-100 text-blue-700 font-bold text-xs px-2 py-1 rounded-lg">1 pt</span>
              <span>Acertás <b>quién gana</b> (o el empate), pero no el resultado exacto.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 bg-yellow-100 text-yellow-700 font-bold text-xs px-2 py-1 rounded-lg">⭐ +2 pts</span>
              <span>Bonus extra si además acertás la <b>figura (MVP)</b> del partido.</span>
            </li>
          </ul>
        </div>

        {/* Importante */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">⚠️ Importante</h3>
          <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
            <li>Los pronósticos se cargan <b>antes de que arranque cada partido</b>. Una vez que empieza, se cierra automáticamente.</li>
            <li>Si no llegaste a cargar tu pronóstico, ese partido queda como <b>0-0</b> por defecto.</li>
            <li>💡 <b>Tip:</b> cargá tu pronóstico cerca de <b>1 hora antes</b> del partido. Para ese momento ya suelen confirmarse los <b>titulares</b> de cada equipo, que vas a ver destacados al elegir la figura (MVP).</li>
          </ul>
        </div>

        {/* Pronóstico especial */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">🎯 Pronóstico especial</h3>
          <p className="text-sm text-gray-600 mb-3">
            Además de los partidos, sumá puntos extra prediciendo:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">🏆 Campeón del Mundial</div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">⭐ Balón de Oro (mejor jugador)</div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">👟 Bota de Oro (goleador)</div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">🧤 Mejor arquero</div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">🌱 Golden Boy (mejor jugador joven Sub-21)</div>
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">🤝 Fair Play (selección con menos tarjetas)</div>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Cada acierto vale <b className="text-green-600">5 puntos</b>. Estos pronósticos se cierran al inicio de los octavos de final (27 de junio).
          </p>
          <p className="text-xs text-gray-400 mt-2">
            💡 En la página <b>Tabla</b> encontrás candidatos al Golden Boy y el ranking de Fair Play por selección para ayudarte a elegir.
          </p>
        </div>

        {/* Empate en puntos */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">🤝 Empate en puntos</h3>
          <p className="text-sm text-gray-600">
            Si dos o más jugadores terminan con la misma cantidad de puntos, el premio correspondiente se reparte en partes iguales entre ellos.
          </p>
        </div>

        {/* Premios */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">💰 Premios</h3>
          <p className="text-sm text-gray-600 mb-2">
            Se reparten del pozo acumulado de tu grupo:
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span>🥇 1° puesto</span>
              <span className="font-bold text-green-600">85%</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span>🥈 2° puesto</span>
              <span className="font-bold text-green-600">15%</span>
            </div>
          </div>
          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5">
            <p className="text-sm text-yellow-800 font-semibold">🚀 Bonus +75 jugadores</p>
            <p className="text-xs text-yellow-700 mt-1">
              Si el grupo llega a 75 jugadores o más, se suma un 3° puesto y la distribución pasa a ser 80% / 15% / 5%.
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            🏅 Los premios se entregan dentro de las 24 hs de finalizado el torneo.
          </p>
        </div>

        {/* Cómo jugar */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">📲 Cómo jugar</h3>
          <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
            <li>Registrate con el link de invitación de tu grupo: te suma automáticamente.</li>
            <li>Instalá la app: abrí el link desde el celular y elegí "Agregar a pantalla de inicio" (Android) o "Compartir → Agregar a inicio" (iPhone).</li>
            <li>Hacé tu pago y enviale el comprobante al admin de tu grupo.</li>
            <li>Al unirte a un grupo, aceptás estas reglas. ¡A disfrutar el Mundial! ⚽</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Rules;
