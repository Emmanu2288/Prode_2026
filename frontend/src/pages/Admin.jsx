import { useEffect, useState } from "react";
import {
  getAdminUsers, getAdminGroups, getTournamentData,
  processTournamentAwards, getFinishedMatches, setManualMvp,
  generateResetLink,
} from "../services/admin.service";
import { getFixturePlayers } from "../services/match.service";

const TABS = [
  { key: "users",    label: "👥 Usuarios" },
  { key: "groups",   label: "🏘️ Grupos" },
  { key: "awards",   label: "🏆 Premios del torneo" },
  { key: "mvp",      label: "⭐ MVP por partido" },
];

// ─── Tab Usuarios ─────────────────────────────────────────────────────────────
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [resetLinkInfo, setResetLinkInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getAdminUsers().then((r) => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  const handleResetLink = async (u) => {
    setGeneratingId(u._id);
    try {
      const r = await generateResetLink(u._id);
      setResetLinkInfo({ name: `${u.first_name} ${u.last_name}`, url: r.data.resetUrl });
      setCopied(false);
    } catch (err) {
      alert(err.response?.data?.message || "Error al generar el link");
    } finally {
      setGeneratingId(null);
    }
  };

  const copyResetLink = () => {
    navigator.clipboard.writeText(resetLinkInfo.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-3">{users.length} usuarios registrados</p>

      {resetLinkInfo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2 mb-3">
          <p className="text-sm text-yellow-800">
            🔑 Link de reseteo para <b>{resetLinkInfo.name}</b> (válido 1 hora):
          </p>
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={resetLinkInfo.url}
              className="flex-1 text-xs bg-white border border-yellow-300 rounded-lg px-3 py-2 text-gray-600"
            />
            <button
              onClick={copyResetLink}
              className="bg-yellow-500 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
            >
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
          <button onClick={() => setResetLinkInfo(null)} className="text-xs text-gray-400 hover:text-gray-600">
            Cerrar
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-2 rounded-l-lg">#</th>
              <th className="text-left px-4 py-2">Nombre</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Rol</th>
              <th className="text-right px-4 py-2">Pronósticos</th>
              <th className="text-right px-4 py-2">Puntos</th>
              <th className="text-center px-4 py-2 rounded-r-lg">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u, i) => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {u.first_name} {u.last_name}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    u.role === "admin" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
                  }`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{u.predictionCount ?? 0}</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">{u.totalPoints ?? 0}</td>
                <td className="px-4 py-3 text-center">
                  {u.googleId ? (
                    <span className="text-xs text-gray-300">—</span>
                  ) : (
                    <button
                      onClick={() => handleResetLink(u)}
                      disabled={generatingId === u._id}
                      className="text-xs font-semibold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {generatingId === u._id ? "..." : "🔑 Reset"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Tab Grupos ───────────────────────────────────────────────────────────────
const GroupsTab = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminGroups().then((r) => setGroups(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10 text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-3">{groups.length} grupos creados</p>
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g._id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">{g.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Admin: {g.owner?.first_name} {g.owner?.last_name}
                {g.description && ` · ${g.description}`}
              </p>
            </div>
            <span className="text-sm font-bold text-green-600">{g.memberCount} miembros</span>
          </div>
        ))}
        {groups.length === 0 && <p className="text-center text-gray-400 py-8">No hay grupos todavía</p>}
      </div>
    </div>
  );
};

// ─── Tab Premios del torneo ───────────────────────────────────────────────────
const AwardsTab = () => {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ goldenBall: "", goldenGlove: "", triggerChampion: true, triggerTopScorer: true });
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTournamentData().then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const handleProcess = async () => {
    if (!window.confirm("¿Estás seguro? Esto asignará puntos a los usuarios que acertaron. No se puede deshacer.")) return;
    setProcessing(true);
    try {
      const r = await processTournamentAwards(form);
      setResult(r.data);
    } catch (err) {
      alert(err.response?.data?.error || "Error al procesar");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Cargando datos del torneo...</div>;

  return (
    <div className="space-y-5 max-w-lg">
      {/* Datos automáticos */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-blue-800">Datos automáticos desde la API</h3>
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={form.triggerChampion}
            onChange={(e) => setForm({ ...form, triggerChampion: e.target.checked })}
            className="w-4 h-4 accent-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-700">🏆 Campeón del Mundial</p>
            {data?.champion ? (
              <div className="flex items-center gap-2 mt-0.5">
                <img src={data.champion.logo} alt="" className="w-5 h-5" />
                <p className="text-xs text-green-700 font-semibold">{data.champion.name}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No disponible aún</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={form.triggerTopScorer}
            onChange={(e) => setForm({ ...form, triggerTopScorer: e.target.checked })}
            className="w-4 h-4 accent-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-700">👟 Goleador</p>
            {data?.topScorer ? (
              <p className="text-xs text-green-700 font-semibold">
                {data.topScorer.name} · {data.topScorer.goals} goles · {data.topScorer.team}
              </p>
            ) : (
              <p className="text-xs text-gray-400">No disponible aún</p>
            )}
          </div>
        </div>
      </div>

      {/* Datos manuales */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Ingresar manualmente</h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">⭐ Golden Ball (Mejor Jugador)</label>
          <input
            type="text"
            value={form.goldenBall}
            onChange={(e) => setForm({ ...form, goldenBall: e.target.value })}
            placeholder="Ej: Lionel Messi"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">🧤 Golden Glove (Mejor Arquero)</label>
          <input
            type="text"
            value={form.goldenGlove}
            onChange={(e) => setForm({ ...form, goldenGlove: e.target.value })}
            placeholder="Ej: Emiliano Martínez"
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <button
        onClick={handleProcess}
        disabled={processing}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
      >
        {processing ? "Procesando..." : "Calcular y asignar puntos"}
      </button>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-800">
            ✅ Procesado: {result.processed} pronósticos revisados
          </p>
          <p className="text-xs text-green-600 mt-1">
            {result.pointsAwarded?.length} usuario(s) recibieron puntos
          </p>
          {result.pointsAwarded?.map((r, i) => (
            <p key={i} className="text-xs text-green-600">{r.awarded.join(", ")}</p>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tab MVP por partido ──────────────────────────────────────────────────────
const MvpTab = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [players, setPlayers] = useState(null);
  const [mvpTeam, setMvpTeam] = useState(null);
  const [mvpName, setMvpName] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    getFinishedMatches().then((r) => setMatches(r.data)).finally(() => setLoading(false));
  }, []);

  const selectMatch = async (match) => {
    setSelected(match);
    setPlayers(null);
    setMvpTeam(null);
    setMvpName("");
    setSuccess(null);
    try {
      const r = await getFixturePlayers(match.id);
      setPlayers(r.data);
    } catch { setPlayers(null); }
  };

  const handleSave = async () => {
    if (!mvpName || !selected) return;
    setSaving(true);
    try {
      const r = await setManualMvp(selected.id, { mvpName, finalScore: selected.score });
      setSuccess(`✅ MVP "${mvpName}" seteado. ${r.data.predictionsUpdated} pronósticos actualizados.`);
      setMvpName("");
      setMvpTeam(null);
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    } finally {
      setSaving(false);
    }
  };

  const POS_ES = { G: "Portero", Goalkeeper: "Portero", D: "Defensor", Defender: "Defensor",
    M: "Mediocampista", Midfielder: "Mediocampista", F: "Delantero", A: "Delantero", Attacker: "Delantero" };

  if (loading) return <div className="text-center py-10 text-gray-400">Cargando partidos finalizados...</div>;

  return (
    <div className="space-y-4">
      {matches.length === 0 && (
        <p className="text-center text-gray-400 py-8">No hay partidos finalizados todavía</p>
      )}

      {/* Lista de partidos */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {matches.map((m) => (
          <button key={m.id} onClick={() => selectMatch(m)}
            className={`w-full flex items-center gap-3 border rounded-xl px-4 py-3 text-left transition-colors ${
              selected?.id === m.id ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-300 bg-white"
            }`}
          >
            <img src={m.home.logo} alt="" className="w-7 h-7 object-contain" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {m.home.name} {m.score} {m.away.name}
              </p>
              <p className="text-xs text-gray-400">{m.round}</p>
            </div>
            <img src={m.away.logo} alt="" className="w-7 h-7 object-contain" />
          </button>
        ))}
      </div>

      {/* Panel MVP del partido seleccionado */}
      {selected && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            MVP de: {selected.home.name} vs {selected.away.name}
          </h3>

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 font-medium">
              {success}
            </div>
          )}

          {mvpName ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-green-700">⭐ {mvpName}</span>
              <button onClick={() => { setMvpName(""); setMvpTeam(null); }}
                className="text-xs text-gray-400 hover:text-red-500">✕ Cambiar</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {["home", "away"].map((side) => (
                  <button key={side} type="button"
                    onClick={() => setMvpTeam(mvpTeam === side ? null : side)}
                    className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      mvpTeam === side ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 hover:border-green-300"
                    }`}
                  >
                    <img src={selected[side].logo} alt="" className="w-6 h-6 object-contain" />
                    <span className="truncate">{selected[side].name}</span>
                  </button>
                ))}
              </div>

              {mvpTeam && players && (
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {(players[mvpTeam]?.players || []).map((p) => (
                    <button key={p.id || p.name} type="button"
                      onClick={() => setMvpName(p.name)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-green-50 transition-colors text-left border-b border-gray-50 last:border-0"
                    >
                      <span className="text-gray-800">{p.name}</span>
                      {p.pos && <span className="text-xs text-gray-400">{POS_ES[p.pos] || p.pos}</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <button onClick={handleSave} disabled={!mvpName || saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Confirmar MVP y recalcular puntos"}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
const Admin = () => {
  const [tab, setTab] = useState("users");

  return (
    <div className="space-y-5">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ backgroundImage: "url(/hero-bg.jpg)", backgroundSize: "100% 100%", backgroundPosition: "center", minHeight: "210px" }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(10,22,40,0.72)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(168,85,247,0.2) 0%, transparent 70%)" }} />
        <div className="relative" style={{ padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 3rem)" }}>
          <h1 className="text-3xl font-bold text-white">Panel Admin</h1>
          <p className="text-purple-300 text-sm mt-1">Gestión del Prode 2026</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "users"  && <UsersTab />}
        {tab === "groups" && <GroupsTab />}
        {tab === "awards" && <AwardsTab />}
        {tab === "mvp"    && <MvpTab />}
      </div>
    </div>
  );
};

export default Admin;
