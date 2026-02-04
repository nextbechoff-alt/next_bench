const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const http = require("http");
const app = require("./app");
const supabase = require("./config/supabaseClient");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// 🔐 SUPABASE AUTH MIDDLEWARE
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) throw new Error("No token");

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error("Unauthorized");

    socket.user = user;
    next();
  } catch (err) {
    console.error("Socket Auth Error:", err.message);
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log("🔐 Authenticated socket:", socket.user.id);

  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`User ${socket.user.id} joined room: ${conversationId}`);
  });

  socket.on("leave_conversation", (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on("typing", ({ conversationId }) => {
    socket
      .to(`conversation:${conversationId}`)
      .emit("typing", { userId: socket.user.id, conversationId });
  });

  socket.on("stop_typing", ({ conversationId }) => {
    socket
      .to(`conversation:${conversationId}`)
      .emit("stop_typing", { userId: socket.user.id, conversationId });
  });

  socket.on("send_message", (message) => {
    // Broadcast to everyone in the room (including sender to confirm receipt if client expects it)
    io.to(`conversation:${message.conversation_id}`).emit(
      "new_message",
      message
    );
  });
});

server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

module.exports = { io };
