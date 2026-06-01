import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../../store/authStore";

// Protege rutas que requieren login
export const ProtectedRoute = () => {
  const token = useAuthStore((s) => s.token);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

// Protege rutas exclusivas de admin
export const AdminRoute = () => {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
