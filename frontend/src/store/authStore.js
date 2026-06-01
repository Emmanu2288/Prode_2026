import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getProfile, login, logout, register } from "../services/auth.service";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

      // Registro
      register: async (data) => {
        set({ loading: true, error: null });
        try {
          const res = await register(data);
          return res.data;
        } catch (err) {
          set({ error: err.response?.data?.message || "Error al registrarse" });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      // Login
      login: async (data) => {
        set({ loading: true, error: null });
        try {
          const res = await login(data);
          const { token, user } = res.data;
          localStorage.setItem("token", token);
          set({ user, token });
          return res.data;
        } catch (err) {
          set({ error: err.response?.data?.message || "Credenciales inválidas" });
          throw err;
        } finally {
          set({ loading: false });
        }
      },

      // Logout
      logout: async () => {
        try {
          await logout();
        } finally {
          localStorage.removeItem("token");
          set({ user: null, token: null });
        }
      },

      // Cargar perfil al iniciar la app
      loadUser: async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
          const res = await getProfile();
          set({ user: res.data, token }); // también sincroniza el token en el store
        } catch {
          localStorage.removeItem("token");
          set({ user: null, token: null });
        }
      },

      clearError: () => set({ error: null }),

      isAuthenticated: () => !!get().token,
      isAdmin: () => get().user?.role === "admin",
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

export default useAuthStore;
