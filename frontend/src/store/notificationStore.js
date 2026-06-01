import { create } from "zustand";

const useNotificationStore = create((set, get) => ({
  notifications: [],

  addNotification: (notif) =>
    set((state) => ({
      notifications: [{ ...notif, id: Date.now(), read: false }, ...state.notifications],
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));

export default useNotificationStore;
