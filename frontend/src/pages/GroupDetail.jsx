import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BallIcon from "../components/BallIcon";
import {
  getGroupById,
  getGroupMembers,
  getGroupLeaderboard,
  getGroupPredictions,
  getGroupPayments,
  togglePayment,
  toggleMemberEnabled,
  deleteGroup,
  inviteToGroup,
  addGroupMember,
  updateGroup,
} from "../services/group.service";
import useMatches from "../hooks/useMatches";
import useAuthStore from "../store/authStore";

const formatMoney = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [groupPredictions, setGroupPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ranking");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [payments, setPayments] = useState([]);
  const [amountDraft, setAmountDraft] = useState(null);
  const [savingAmount, setSavingAmount] = useState(false);

  // Invitar — búsqueda de usuarios registrados
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [addingDirectId, setAddingDirectId] = useState(null);
  const [inviteMsg, setInviteMsg] = useState(null);

  // Invitar a la app (link externo)
  const [appInviteLink, setAppInviteLink] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const { matches } = useMatches();

  useEffect(() => {
    const load = async () => {
      try {
        const [groupRes, membersRes, lbRes, predsRes] = await Promise.all([
          getGroupById(groupId),
          getGroupMembers(groupId),
          getGroupLeaderboard(groupId),
          getGroupPredictions(groupId),
        ]);
        setGroup(groupRes.data);
        setMembers(membersRes.data);
        setLeaderboard(lbRes.data || []);
        setGroupPredictions(predsRes.data || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  // Buscar usuarios con debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { searchUsers } = await import("../services/group.service");
        const res = await searchUsers(searchQuery);
        // Excluir miembros ya existentes
        const memberIds = new Set(members.map((m) => m.user?._id));
        setSearchResults(res.data.filter((u) => !memberIds.has(u._id)));
      } catch (err) { console.error(err); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, members]);

  const handleInviteUser = async (userId) => {
    setInviting(true);
    setInviteMsg(null);
    try {
      await inviteToGroup(groupId, { userIds: [userId] });
      setInviteMsg({ type: "ok", text: "✅ Invitación enviada. El usuario la verá cuando ingrese a la app." });
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUser(null);
    } catch (err) {
      setInviteMsg({ type: "error", text: "Error al enviar la invitación." });
    } finally {
      setInviting(false);
    }
  };

  // Sumar al grupo directamente, sin pasar por invitación (admin/owner)
  const handleAddDirect = async (userId) => {
    setAddingDirectId(userId);
    setInviteMsg(null);
    try {
      await addGroupMember(groupId, userId);
      setInviteMsg({ type: "ok", text: "✅ Usuario agregado al grupo directamente." });
      setSearchQuery("");
      setSearchResults([]);
      const membersRes = await getGroupMembers(groupId);
      setMembers(membersRes.data);
    } catch (err) {
      setInviteMsg({ type: "error", text: err.response?.data?.message || "Error al agregar al usuario." });
    } finally {
      setAddingDirectId(null);
    }
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      // Generar invitación con email vacío para obtener link externo
      const res = await inviteToGroup(groupId, { emails: ["__external__@prode2026.app"] });
      const link = res.data?.invited?.[0]?.link;
      if (link) setAppInviteLink(link);
    } catch (err) { console.error(err); }
    finally { setGeneratingLink(false); }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOwner = group?.owner?._id === user?._id ||
                  group?.owner?._id === user?.id  ||
                  group?.owner === user?._id      ||
                  group?.owner === user?.id;

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar el grupo "${group.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteGroup(group._id);
      navigate("/groups");
    } catch (err) {
      alert(err.response?.data?.message || "Error al eliminar el grupo");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <BallIcon className="w-9 h-9 animate-bounce" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Grupo no encontrado.</p>
        <button onClick={() => navigate("/groups")} className="mt-4 text-green-600 hover:underline text-sm">
          Volver a grupos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <button onClick={() => navigate("/groups")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← Volver a grupos
      </button>

      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ backgroundImage: "url(/hero-bg.jpg)", backgroundSize: "100% 100%", backgroundPosition: "center", minHeight: "210px" }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(10,22,40,0.72)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(34,197,94,0.18) 0%, transparent 70%)" }} />
        <div className="relative" style={{ padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 3rem)" }}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{group.name}</h1>
              {group.description && <p className="text-green-300 text-sm mt-1">{group.description}</p>}
              <p className="text-green-400 text-xs mt-1">{members.length} miembro{members.length !== 1 ? "s" : ""}</p>
              {group.paymentAmount > 0 && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-yellow-400 text-yellow-900 rounded-full px-3 py-1 text-xs font-bold">
                  🏆 Pozo acumulado: {formatMoney(group.poolTotal)}
                </div>
              )}
            </div>
            {isOwner && (
              <div className="flex items-center gap-2">
                <span style={{ background: "#facc15", color: "#713f12", fontSize: "13px", fontWeight: "700", padding: "5px 14px", borderRadius: "999px" }}>
                  Admin
                </span>
                <button
                  onClick={handleDelete}
                  style={{ background: "#dc2626", color: "#fff", fontSize: "13px", fontWeight: "600", padding: "5px 14px", borderRadius: "999px" }}
                  className="hover:opacity-90 transition-opacity"
                  title="Eliminar grupo"
                >
                  🗑️ Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {["ranking", "partidos", "miembros", ...(user?.role === "admin" ? ["pagos", "invitar"] : ["invitar"])].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-green-600 text-green-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "ranking" ? "🏆 Ranking" : t === "partidos" ? "⚽ Partidos" : t === "miembros" ? "👥 Miembros" : t === "pagos" ? "💰 Pagos" : "✉️ Invitar"}
          </button>
        ))}
      </div>

      {/* Tab: Ranking */}
      {tab === "ranking" && (
        <div className="space-y-2">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl">🏆</span>
              <p className="mt-2 text-sm">Todavía no hay puntos registrados</p>
            </div>
          ) : (
            leaderboard.map((entry, i) => (
              <div
                key={entry.user?._id || i}
                className={`flex items-center gap-4 bg-white rounded-xl border px-4 py-3 ${
                  i === 0 ? "border-yellow-300 bg-yellow-50" :
                  i === 1 ? "border-gray-300 bg-gray-50" :
                  i === 2 ? "border-orange-200 bg-orange-50" :
                  "border-gray-100"
                }`}
              >
                <span className={`text-lg font-bold w-6 text-center ${
                  i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-400"
                }`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {entry.user?.first_name} {entry.user?.last_name}
                    {entry.user?._id === user?._id && <span className="text-green-600 text-xs ml-1">(vos)</span>}
                  </p>
                </div>
                <span className="text-lg font-bold text-green-600">{entry.totalPoints ?? 0} pts</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Partidos */}
      {tab === "partidos" && (
        <div className="space-y-3">
          {matches
            .filter((m) => groupPredictions[String(m.fixture.id)])
            .map((m) => {
              const preds = groupPredictions[String(m.fixture.id)] || [];
              const isSelected = selectedMatch === m.fixture.id;
              const status = m.fixture.status.short;
              const isFinished = ["FT","AET","PEN"].includes(status);

              return (
                <div key={m.fixture.id} className="bg-card rounded-xl border border-gray-100 overflow-hidden">
                  {/* Cabecera del partido */}
                  <button
                    onClick={() => setSelectedMatch(isSelected ? null : m.fixture.id)}
                    className="w-full flex items-center justify-between hover:bg-gray-50 transition-colors"
                    style={{ padding: "14px 20px" }}
                  >
                    <div className="flex items-center gap-3">
                      <img src={m.teams.home.logo} alt="" className="w-7 h-7 object-contain" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">
                          {m.teams.home.name} vs {m.teams.away.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {m.league.round.replace("Group Stage - ", "Fecha ")} ·{" "}
                          {isFinished ? `${m.goals.home}–${m.goals.away} FT` : "Por jugar"}
                        </p>
                      </div>
                      <img src={m.teams.away.logo} alt="" className="w-7 h-7 object-contain" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{preds.length} pronóstico{preds.length !== 1 ? "s" : ""}</span>
                      <span className="text-gray-400 text-xs">{isSelected ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Predicciones de los miembros */}
                  {isSelected && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {preds.map((p, i) => (
                        <div key={i} className="flex items-center justify-between" style={{ padding: "10px 20px" }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold flex-shrink-0">
                              {p.userName?.[0]}
                            </div>
                            <span className="text-sm text-gray-700">{p.userName}</span>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            {p.mvpPlayer && (
                              <span className="text-xs text-gray-400 hidden sm:block">⭐ {p.mvpPlayer}</span>
                            )}
                            <span className="text-sm font-bold text-green-600">{p.predictedScore}</span>
                            {isFinished && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                p.points >= 3 ? "bg-green-100 text-green-700" :
                                p.points >= 1 ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-50 text-red-400"
                              }`}>
                                {p.points} pts
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          {matches.filter(m => groupPredictions[String(m.fixture.id)]).length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <BallIcon className="w-9 h-9" />
              <p className="mt-2 text-sm">Ningún miembro ha pronosticado partidos todavía</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Pagos (solo admin) */}
      {tab === "pagos" && user?.role === "admin" && (() => {
        const phases = group?.paymentType === "multi"
          ? ["Fase de grupos 1","Fase de grupos 2","Fase de grupos 3","Octavos de final","Cuartos de final","Semifinales","3° y 4° puesto","Final"]
          : ["Pago único"];

        if (payments.length === 0) {
          getGroupPayments(groupId).then(r => setPayments(r.data)).catch(() => {});
        }

        const totalPaidCount = payments.reduce(
          (sum, m) => sum + phases.filter(p => m.payments[p]?.paid).length,
          0
        );
        const amount = amountDraft ?? group?.paymentAmount ?? 10000;

        const handleToggle = async (userId, phase, current) => {
          await togglePayment(groupId, userId, phase, { paid: !current });
          const r = await getGroupPayments(groupId);
          setPayments(r.data);
          setGroup(prev => {
            const newPaidCount = (prev.paidCount || 0) + (current ? -1 : 1);
            return { ...prev, paidCount: newPaidCount, poolTotal: newPaidCount * (prev.paymentAmount || 0) };
          });
        };

        const handleToggleEnabled = async (userId, current) => {
          await toggleMemberEnabled(groupId, userId, !current);
          setPayments(prev => prev.map(m => m.userId === userId ? { ...m, enabled: !current } : m));
        };

        const handleSaveAmount = async () => {
          setSavingAmount(true);
          try {
            const amt = Number(amount);
            await updateGroup(groupId, { paymentAmount: amt });
            setGroup(prev => ({ ...prev, paymentAmount: amt, poolTotal: (prev.paidCount || 0) * amt }));
            setAmountDraft(null);
          } catch (err) {
            console.error("Error guardando monto:", err);
          } finally {
            setSavingAmount(false);
          }
        };

        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-yellow-800">
                  <span className="font-bold">{totalPaidCount}</span> pago{totalPaidCount !== 1 ? "s" : ""} confirmado{totalPaidCount !== 1 ? "s" : ""} × {formatMoney(amount)}
                </p>
                <p className="text-lg font-bold text-yellow-900">🏆 Pozo: {formatMoney(totalPaidCount * amount)}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-yellow-700">Monto por pago</label>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmountDraft(e.target.value)}
                  className="w-28 px-2 py-1 border border-yellow-300 rounded-lg text-sm text-right bg-white"
                />
                {amountDraft !== null && (
                  <button
                    onClick={handleSaveAmount}
                    disabled={savingAmount}
                    className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                  >
                    {savingAmount ? "..." : "Guardar"}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 rounded-l-lg text-xs text-gray-500 uppercase">Jugador</th>
                    {phases.map(p => (
                      <th key={p} className="text-center px-2 py-2 text-xs text-gray-500 uppercase whitespace-nowrap">{p}</th>
                    ))}
                    <th className="text-center px-2 py-2 text-xs text-gray-500 uppercase">Total</th>
                    <th className="text-center px-3 py-2 rounded-r-lg text-xs text-gray-500 uppercase">Habilitado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((member) => {
                    const paidCount = phases.filter(p => member.payments[p]?.paid).length;
                    return (
                      <tr key={member.userId} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-gray-800 text-xs">{member.name}</p>
                          <p className="text-gray-400 text-xs">{member.email}</p>
                        </td>
                        {phases.map(phase => {
                          const paid = member.payments[phase]?.paid || false;
                          return (
                            <td key={phase} className="text-center px-2 py-2.5">
                              <button
                                onClick={() => handleToggle(member.userId, phase, paid)}
                                className={`w-7 h-7 rounded-full font-bold text-sm transition-colors ${
                                  paid
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-100 text-gray-300 hover:bg-gray-200"
                                }`}
                              >
                                {paid ? "✓" : "·"}
                              </button>
                            </td>
                          );
                        })}
                        <td className="text-center px-2 py-2.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            paidCount === phases.length ? "bg-green-100 text-green-700" :
                            paidCount > 0 ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-50 text-red-400"
                          }`}>
                            {paidCount}/{phases.length}
                          </span>
                        </td>
                        <td className="text-center px-3 py-2.5">
                          <button
                            onClick={() => handleToggleEnabled(member.userId, member.enabled)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                              member.enabled
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-600 hover:bg-red-200"
                            }`}
                            title={member.enabled ? "Click para bloquear" : "Click para habilitar"}
                          >
                            {member.enabled ? "✓ Habilitado" : "🔒 Bloqueado"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {payments.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">No hay miembros todavía</p>
            )}
          </div>
        );
      })()}

      {/* Tab: Miembros */}
      {tab === "miembros" && (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m._id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                {m.user?.first_name?.[0]}{m.user?.last_name?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {m.user?.first_name} {m.user?.last_name}
                </p>
                <p className="text-xs text-gray-400">{m.user?.email}</p>
              </div>
              {m.roleInGroup === "owner" && (
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Admin</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Invitar */}
      {tab === "invitar" && (
        <div className="space-y-4">

          {/* Buscar usuarios registrados */}
          <div className="bg-card rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Buscar usuario registrado</h3>
            <p className="text-xs text-gray-400 mb-3">Escribí nombre o email — mínimo 2 caracteres</p>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setInviteMsg(null); }}
              placeholder="Ej: Juan, Perez, juan@..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            {/* Resultados */}
            {searching && (
              <p className="text-xs text-gray-400 mt-2">Buscando...</p>
            )}

            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">No se encontraron usuarios.</p>
            )}

            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                {searchResults.map((u) => (
                  <div key={u._id} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(isOwner || user?.role === "admin") && (
                        <button
                          onClick={() => handleAddDirect(u._id)}
                          disabled={addingDirectId === u._id}
                          title="Agregar directamente al grupo, sin enviar invitación"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {addingDirectId === u._id ? "..." : "+ Directo"}
                        </button>
                      )}
                      <button
                        onClick={() => handleInviteUser(u._id)}
                        disabled={inviting}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {inviting ? "..." : "Invitar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Feedback */}
            {inviteMsg && (
              <div className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
                inviteMsg.type === "ok"
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-600"
              }`}>
                {inviteMsg.text}
              </div>
            )}
          </div>

          {/* Invitar a la app — genera link de registro */}
          <div className="bg-card rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Invitar a alguien que no usa la app</h3>
            <p className="text-xs text-gray-400 mb-3">
              Generá un link de registro. Al registrarse, quedan automáticamente en el grupo.
            </p>

            {!appInviteLink ? (
              <button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="w-full border-2 border-dashed border-green-300 text-green-700 font-medium py-3 rounded-xl text-sm hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                {generatingLink ? "Generando..." : "🔗 Generar link de invitación"}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    readOnly
                    value={appInviteLink}
                    className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600"
                  />
                  <button
                    onClick={() => copyLink(appInviteLink)}
                    className="bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {copied ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
                <button
                  onClick={() => { setAppInviteLink(null); setCopied(false); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Generar otro link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;
