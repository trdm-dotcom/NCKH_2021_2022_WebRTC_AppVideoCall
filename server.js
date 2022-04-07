const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
const router = express.Router();
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

router.get("/connect", (req, res) => {
  console.log(req.query.room);
  res.render("connect", { roomId: req.query.room });
});

router.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

app.use(router);

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);
    socket.to(roomId).broadcast.emit("user-disconnected", userId);
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message);
    });
    socket.on("stopCam", (userId) => {
      io.to(roomId).emit("stopVideo",userId);
    });
    socket.on("playCam",(data) => {
      io.to(roomId).emit("playVideo",{data});
    })
  });
});

server.listen(process.env.PORT || 3030);
