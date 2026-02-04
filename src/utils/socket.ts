import { io } from "socket.io-client";

export const createSocket = (token: string) =>
  io(import.meta.env.VITE_API_URL, {
    auth: { token },
    transports: ["websocket"],
  });
