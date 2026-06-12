import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyGroups, getPendingInvitations, acceptInvitation, rejectInvitation } from "../services/group.service";
import useAuthStore from "../store/authStore";
import BallIcon from "../components/BallIcon";

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", paymentType: "single" });
  const [creating, setCreating] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyGroups(), getPendingInvitations()])
      .then(([groupsRes, invRes]) => {
        if (cancelled) return;
        setGroups(groupsRes.data);
        setInvitations(invRes.data);
      })
      .catch((err) => { if (!cancelled) console.error(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshIndex]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const { createGroup } = await import("../services/group.service");
      const res = await createGroup(form);
      setShowCreate(false);
      setForm({ name: "", description: "" });
      navigate(`/groups/${res.data.group._id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleAccept = async (token) => {
    try {
      await acceptInvitation(token);
      setRefreshIndex((i) => i + 1);
    } catch (err) { console.error(err); }
  };

  const handleReject = async (token) => {
    try {
      await rejectInvitation(token);
      setInvitations((prev) => prev.filter((i) => i.token !== token));
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <BallIcon className="w-9 h-9 animate-bounce" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ backgroundImage: "url(/hero-bg.jpg)", backgroundSize: "100% 100%", backgroundPosition: "center", minHeight: "210px" }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(10,22,40,0.72)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(34,197,94,0.18) 0%, transparent 70%)" }} />
        <div className="relative flex items-center justify-between" style={{ padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 3rem)" }}>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Grupos</h1>
            <p className="text-green-300 text-sm mt-1">Competí con tus amigos</p>
          </div>
          {user?.role === "admin" && (
            <button
              onClick={() => setShowCreate(true)}
              style={{ padding: "8px 20px", borderRadius: "12px", fontSize: "14px", fontWeight: "600", background: "#22c55e", color: "#fff" }}
              className="hover:opacity-90 transition-opacity"
            >
              + Crear grupo
            </button>
          )}
        </div>
      </div>

      {/* Invitaciones pendientes */}
      {invitations.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            🔔 Invitaciones pendientes
          </h2>
          {invitations.map((inv) => (
            <div key={inv._id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">{inv.group?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Invitado por {inv.inviter?.first_name} {inv.inviter?.last_name}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleAccept(inv.token)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => handleReject(inv.token)}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mis grupos */}
      {groups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <span className="text-5xl">👥</span>
          <p className="text-gray-600 font-medium mt-4">Todavía no pertenecés a ningún grupo</p>
          <p className="text-gray-400 text-sm mt-1">
            {user?.role === "admin" ? "Creá uno o esperá una invitación" : "Esperá una invitación de tu organizador"}
          </p>
          {user?.role === "admin" && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-5 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Crear mi grupo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group) => (
            <button
              key={group._id}
              onClick={() => navigate(`/groups/${group._id}`)}
              className="bg-card rounded-xl border border-gray-100 text-left hover:shadow-md hover:border-green-200 transition-all group"
              style={{ padding: "16px 20px" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-green-700 transition-colors">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="text-xs text-gray-400 mt-1">{group.description}</p>
                  )}
                </div>
                {group.roleInGroup === "owner" && (
                  <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">Ver ranking y miembros →</p>
            </button>
          ))}
        </div>
      )}

      {/* Modal crear grupo */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Crear nuevo grupo</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del grupo *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Ej: Los Cracks del Trabajo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de pago</label>
                <select
                  value={form.paymentType}
                  onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="single">Pago único (Grupo 1)</option>
                  <option value="multi">Por fase — 8 pagos (Grupo 2)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Una descripción corta"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {creating ? "Creando..." : "Crear grupo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
