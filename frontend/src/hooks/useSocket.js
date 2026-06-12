import { useEffect } from "react";
import { io } from "socket.io-client";
import useAuthStore from "../store/authStore";
import useNotificationStore from "../store/notificationStore";

let socketInstance = null;

const useSocket = () => {
  const { user, token } = useAuthStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!token || !user) return;

    if (!socketInstance) {
      const socketUrl = import.meta.env.VITE_API_URL || "/";
      socketInstance = io(socketUrl, {
        auth: { token },
        withCredentials: true,
      });
    }

    socketInstance.emit("join_user", { userId: user._id });

    // Escuchar invitaciones entrantes
    const onInvitation = (data) => {
      addNotification({
        type: "invitation",
        title: "Nueva invitación a grupo",
        message: data.message || `Te invitaron al grupo "${data.groupName}"`,
        token: data.token,
        groupId: data.groupId,
        groupName: data.groupName,
      });
    };

    socketInstance.on("invitation_received", onInvitation);

    // Escuchar avisos del admin para todos los usuarios
    const onAnnouncement = (data) => {
      addNotification({
        type: "announcement",
        title: data.title,
        message: data.message,
        url: data.url,
      });
    };

    socketInstance.on("announcement", onAnnouncement);

    return () => {
      socketInstance?.off("invitation_received", onInvitation);
      socketInstance?.off("announcement", onAnnouncement);
    };
  }, [token, user, addNotification]);

  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export default useSocket;
