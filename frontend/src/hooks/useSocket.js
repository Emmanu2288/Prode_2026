import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useAuthStore from "../store/authStore";
import useNotificationStore from "../store/notificationStore";

let socketInstance = null;

const useSocket = () => {
  const { user, token } = useAuthStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !user) return;

    if (!socketInstance) {
      socketInstance = io("/", {
        auth: { token },
        withCredentials: true,
      });
    }

    socketRef.current = socketInstance;
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

    return () => {
      socketInstance?.off("invitation_received", onInvitation);
    };
  }, [token, user]);

  return socketRef.current;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export default useSocket;
