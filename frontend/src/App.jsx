import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import useAuthStore from "./store/authStore";

import Layout from "./components/layout/Layout";
import { ProtectedRoute, AdminRoute } from "./components/layout/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Fixtures from "./pages/Fixtures";
import FixtureDetail from "./pages/FixtureDetail";
import NotFound from "./pages/NotFound";

import Predictions from "./pages/Predictions";
import NewPrediction from "./pages/NewPrediction";
import Extras from "./pages/Extras";

import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import Admin from "./pages/Admin";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";

const App = () => {
  const loadUser = useAuthStore((s) => s.loadUser);

  // Al iniciar la app, carga el perfil si hay token guardado
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Rutas protegidas — requieren login */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/fixtures/:id" element={<FixtureDetail />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:groupId" element={<GroupDetail />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/predictions/new" element={<NewPrediction />} />
            <Route path="/extras" element={<Extras />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />

            {/* Rutas solo para admin */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
        </Route>

        {/* Redirect raíz */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
