const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const redis = require("redis");
// Peer

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/peerjs", peerServer);

router.get("/", (req, rsp) => {
  rsp.redirect(`/${uuidv4()}`);
});

router.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

app.use(router);
let listUserInfo = [];
io.on("connection", (socket) => {
  socket.on("joinRoom", (roomId, user) => {
    socket.join(roomId);
    listUserInfo.push(user);
    console.log(listUserInfo);
    socket.to(roomId).broadcast.emit("userConnected", user.id);
    io.to(roomId).emit("refeshListUser",listUserInfo);
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message);
    });
  });
  socket.on("leaveRoom",(roomId,userId) => {
    socket.to(roomId).broadcast.emit("userDisconnected", userId);
  })
});

server.listen(3000);
