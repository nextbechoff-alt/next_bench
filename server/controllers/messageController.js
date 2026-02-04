const { io } = require("../server");

exports.sendMessage = async (req, res) => {
  const message = await Message.create({
    conversation_id: req.body.conversation_id,
    sender_id: req.user.id,
    content: req.body.content,
  });

  io.to(`conversation:${message.conversation_id}`).emit(
    "new_message",
    message
  );

  res.json(message);
};
