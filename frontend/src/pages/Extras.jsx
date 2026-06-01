import { useEffect, useState } from "react";
import useMatches from "../hooks/useMatches";
import { getExtras, saveExtras } from "../services/prediction.service";

const KNOCKOUT_DATE = new Date("2026-06-27T00:00:00");

const getDaysToLock = () => {
  const diff = Math.ceil((KNOCKOUT_DATE - new Date()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

const isLocked = () => new Date() >= KNOCKOUT_DATE;

// Extrae equipos únicos de los fixtures
const extractTeams = (matches) => {
  const teamMap = {};
  matches.forEach((m) => {
    const { home, away } = m.teams;
    if (!teamMap[home.id]) teamMap[home.id] = { id: home.id, name: home.name, logo: home.logo };
    if (!teamMap[away.id]) teamMap[away.id] = { id: away.id, name: away.name, logo: away.logo };
  });
  return Object.values(teamMap).sort((a, b) => a.name.localeCompare(b.name));
};

// Selector de equipo con búsqueda
const TeamSelector = ({ value, onChange, teams, placeholder, locked }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = teams.find((t) => t.name === value);
  const filtered = query
    ? teams.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : teams;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={locked}
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 border rounded-xl px-4 py-3 text-left transition-colors ${
          locked
            ? "bg-gray-50 border-gray-200 cursor-not-allowed"
            : "bg-white border-gray-300 hover:border-green-400 focus:ring-2 focus:ring-green-500"
        }`}
      >
        {selected ? (
          <>
            <img src={selected.logo} alt="" className="w-7 h-7 object-contain" />
            <span className="text-sm font-medium text-gray-800">{selected.name}</span>
          </>
        ) : (
          <span className="text-sm text-gray-400">{placeholder}</span>
        )}
        {!locked && <span className="ml-auto text-gray-400 text-xs">▼</span>}
      </button>

      {open && !locked && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar selección..."
              className="w-full text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.name); setOpen(false); setQuery(""); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 transition-colors text-left"
              >
                <img src={t.logo} alt="" className="w-6 h-6 object-contain" />
                <span className="text-sm text-gray-700">{t.name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Input de texto para jugadores
const PlayerInput = ({ value, onChange, placeholder, locked }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={locked}
    className={`w-full border rounded-xl px-4 py-3 text-sm transition-colors ${
      locked
        ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
        : "bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
    }`}
  />
);

const CATEGORIES = [
  {
    key: "worldChampion",
    icon: "🏆",
    title: "Campeón del Mundial",
    desc: "¿Qué selección va a ganar la Copa del Mundo?",
    type: "team",
  },
  {
    key: "bestPlayer",
    icon: "⭐",
    title: "Mejor Jugador (MVP)",
    desc: "El Balón de Oro del torneo",
    type: "player",
    placeholder: "Ej: Lionel Messi",
  },
  {
    key: "topScorer",
    icon: "👟",
    title: "Goleador del Mundial",
    desc: "El jugador que más goles anote",
    type: "player",
    placeholder: "Ej: Kylian Mbappé",
  },
  {
    key: "bestGoalkeeper",
    icon: "🧤",
    title: "Mejor Arquero",
    desc: "El Guante de Oro del torneo",
    type: "player",
    placeholder: "Ej: Emiliano Martínez",
  },
];

const Extras = () => {
  const { matches } = useMatches();
  const teams = extractTeams(matches);
  const locked = isLocked();
  const daysLeft = getDaysToLock();

  const [form, setForm] = useState({
    worldChampion: "",
    bestPlayer: "",
    topScorer: "",
    bestGoalkeeper: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getExtras()
      .then((res) => {
        if (res.data && Object.keys(res.data).length > 0) {
          setForm({
            worldChampion:  res.data.worldChampion  || "",
            bestPlayer:     res.data.bestPlayer     || "",
            topScorer:      res.data.topScorer      || "",
            bestGoalkeeper: res.data.bestGoalkeeper || "",
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locked) return;
    setSaving(true);
    setError(null);
    try {
      await saveExtras(form);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">⚽</div>
      </div>
    );
  }

  const filledCount = Object.values(form).filter(Boolean).length;

  return (
    <div className="space-y-5" style={{ maxWidth: "680px", margin: "0 auto" }}>

      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ backgroundImage: "url(/hero-bg.jpg)", backgroundSize: "100% 100%", backgroundPosition: "center", minHeight: "210px" }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(10,22,40,0.72)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(168,85,247,0.2) 0%, transparent 70%)" }} />
        <div className="relative flex items-center justify-between" style={{ padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 3rem)" }}>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Pronósticos extras</h1>
            <p className="text-purple-300 text-sm mt-1">Campeón, goleador, MVP y más</p>
          </div>
          <div className="text-center">
            {locked ? (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2 text-center">
                <p className="text-red-300 text-xs font-semibold">🔒 Cerrado</p>
                <p className="text-red-400 text-xs">Octavos ya empezaron</p>
              </div>
            ) : (
              <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
                <p className="text-2xl font-bold text-white">{daysLeft}</p>
                <p className="text-purple-300 text-xs">días para cerrar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div className="bg-card rounded-xl border border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Completado</span>
          <span className="text-sm font-bold text-purple-600">{filledCount} / {CATEGORIES.length}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all"
            style={{ width: `${(filledCount / CATEGORIES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="bg-card rounded-xl border border-gray-100 p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{cat.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{cat.desc}</p>
              </div>
              {form[cat.key] && (
                <span className="ml-auto text-green-500 text-lg">✓</span>
              )}
            </div>

            {cat.type === "team" ? (
              <TeamSelector
                value={form[cat.key]}
                onChange={(v) => handleChange(cat.key, v)}
                teams={teams}
                placeholder="Seleccioná una selección..."
                locked={locked}
              />
            ) : (
              <PlayerInput
                value={form[cat.key]}
                onChange={(v) => handleChange(cat.key, v)}
                placeholder={cat.placeholder}
                locked={locked}
              />
            )}
          </div>
        ))}

        {/* Feedback */}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm text-center font-medium">
            ✅ Pronósticos guardados correctamente
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        {!locked && (
          <button
            type="submit"
            disabled={saving || filledCount === 0}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? "Guardando..." : saved ? "✅ Guardado" : "Guardar pronósticos extras"}
          </button>
        )}

        {locked && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-gray-500 text-sm">
            🔒 Los pronósticos extras cerraron el 27 de junio cuando empezaron los octavos
          </div>
        )}
      </form>
    </div>
  );
};

export default Extras;
