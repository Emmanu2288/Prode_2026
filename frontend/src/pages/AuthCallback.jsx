import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuthStore from "../store/authStore";
import BallIcon from "../components/BallIcon";

/**
 * Página intermedia que maneja el redirect de Google OAuth.
 * El backend redirige a /auth/callback?token=xxx
 * Esta página guarda el token y carga el perfil del usuario.
 */
const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loadUser } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      // Guardar el token en localStorage (igual que el login normal)
      localStorage.setItem("token", token);
      // Actualizar el store con los datos del perfil
      loadUser().then(() => {
        navigate("/dashboard", { replace: true });
      });
    } else {
      navigate("/login?error=google", { replace: true });
    }
  }, [searchParams, navigate, loadUser]);

  return (
    <div className="min-h-screen bg-green-700 flex items-center justify-center">
      <div className="text-center text-white">
        <BallIcon className="w-12 h-12 mb-4 animate-bounce" />
        <p className="text-lg font-medium">Iniciando sesión con Google...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
