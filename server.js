const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
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
    socket.to(roomId).broadcast.emit("userConnected", user.id);
    io.to(roomId).emit("refeshListUser",listUserInfo);
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message);
    });
    socket.on("startShare",(user) => {
      io.to(roomId).emit("callShare",user);
    });
    socket.on("stopShare",(user)=>{
      io.to(roomId).emit("stopCallShare",user);
    });
  });
  socket.on("leaveRoom",(roomId,userId) => {
    socket.to(roomId).broadcast.emit("userDisconnected", userId);
  })
});

server.listen(process.env.PORT || 3030);
