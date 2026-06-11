import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useAuthStore from "../store/authStore";
import BallIcon from "../components/BallIcon";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinedGroup = searchParams.get("group");
  const justReset = searchParams.get("reset") === "1";

  const handleChange = (e) => {
    clearError();
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(form);
      navigate("/dashboard");
    } catch {
      // el error ya está en el store
    }
  };

  return (
    <div className="min-h-screen bg-green-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <BallIcon className="w-12 h-12" />
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Prode 2026</h1>
          <p className="text-gray-500 text-sm mt-1">Iniciá sesión para continuar</p>
        </div>

        {joinedGroup && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-lg px-4 py-3 mb-4 text-sm font-medium text-center">
            🎉 ¡Cuenta creada! Ya sos parte del grupo <strong>"{joinedGroup}"</strong>. Ingresá para jugar.
          </div>
        )}

        {justReset && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-lg px-4 py-3 mb-4 text-sm font-medium text-center">
            ✅ Contraseña actualizada. Podés iniciar sesión.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a
            href={`${import.meta.env.VITE_API_URL || ''}/api/auth/google`}
            className="flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            Continuar con Google
          </a>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link to="/forgot-password" className="text-gray-400 hover:text-green-600 transition-colors">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          ¿No tenés cuenta?{" "}
          <Link to="/register" className="text-green-600 hover:underline font-medium">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
