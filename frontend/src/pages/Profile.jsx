import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import api from "../services/api";

const Profile = () => {
  const { user, loadUser } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name:  user?.last_name  || "",
  });
  const [passForm, setPassForm] = useState({ password: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [msg, setMsg] = useState(null);
  const [passMsg, setPassMsg] = useState(null);

  const isGoogleUser = !!user?.googleId;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.put(`/users/${user._id}`, form);
      await loadUser();
      setMsg({ type: "ok", text: "✅ Perfil actualizado" });
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.message || "Error al guardar" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.password !== passForm.confirm) {
      setPassMsg({ type: "err", text: "Las contraseñas no coinciden" });
      return;
    }
    if (passForm.password.length < 8) {
      setPassMsg({ type: "err", text: "Mínimo 8 caracteres" });
      return;
    }
    setSavingPass(true);
    setPassMsg(null);
    try {
      await api.put(`/users/${user._id}`, { password: passForm.password });
      setPassForm({ password: "", confirm: "" });
      setPassMsg({ type: "ok", text: "✅ Contraseña actualizada" });
    } catch (err) {
      setPassMsg({ type: "err", text: err.response?.data?.message || "Error al cambiar contraseña" });
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-6" style={{ maxWidth: "560px", margin: "0 auto" }}>

      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ backgroundImage: "url(/hero-bg.jpg)", backgroundSize: "100% 100%", backgroundPosition: "center", minHeight: "210px" }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(10,22,40,0.72)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(34,197,94,0.18) 0%, transparent 70%)" }} />
        <div className="relative flex flex-col items-center justify-center text-center" style={{ padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 3rem)" }}>
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <h1 className="text-2xl font-bold text-white">{user?.first_name} {user?.last_name}</h1>
          <p className="text-green-300 text-sm mt-1">{user?.email}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${user?.role === "admin" ? "bg-yellow-400 text-yellow-900" : "bg-white/20 text-white"}`}>
              {user?.role === "admin" ? "Admin" : "Jugador"}
            </span>
            <span className="text-xs bg-green-500/30 text-green-200 px-3 py-1 rounded-full font-semibold">
              🏆 {user?.totalPoints ?? 0} puntos
            </span>
          </div>
        </div>
      </div>

      {/* Editar nombre */}
      <div className="bg-card rounded-2xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Editar perfil</h2>
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apellido</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          {msg && (
            <p className={`text-xs px-3 py-2 rounded-lg ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {msg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            style={{ padding: "8px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", background: "#16a34a", color: "#fff" }}
            className="hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      {!isGoogleUser && (
        <div className="bg-card rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Cambiar contraseña</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={passForm.password}
                onChange={(e) => setPassForm({ ...passForm, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={passForm.confirm}
                onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {passMsg && (
              <p className={`text-xs px-3 py-2 rounded-lg ${passMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {passMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingPass}
              style={{ padding: "8px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", background: "#dc2626", color: "#fff" }}
              className="hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {savingPass ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        </div>
      )}

      {isGoogleUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 text-center">
          Tu cuenta está vinculada con Google. La contraseña se gestiona desde Google.
        </div>
      )}
    </div>
  );
};

export default Profile;
