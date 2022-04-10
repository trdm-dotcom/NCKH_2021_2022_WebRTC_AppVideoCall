const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
const router = express.Router();

app.set("view engine", "ejs");
app.use(express.static("public"));

router.get("/", (req, rsp) => {
  rsp.redirect(`/${uuidv4()}`);
});

router.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

app.use(router);
io.on("connection", (socket) => {
  socket.on("joinRoom", (data) => {
    socket.join(data.room);
    socket.join(data.socketId);
    if(socket.adapter.rooms[data.room]){
      socket.to(data.room).emit("newUser",{socketId:data.socketId});
    }
  });

  socket.on("connectNewUser",(data) => {
    socket.to(data.to).emit("newUserStart", {sender:data.sender});
  });
  
  socket.on("chat",(data) => {
    socket.to(data.room).emit("showChat",{ sender: data.sender, msg: data.msg, time: data.time });
  });

  socket.on("record",(data) => {
    socket.to(data.room).emit("startRecord",{ sender: data.sender});
  });

  socket.on("sdp",(data) => {
    socket.to(data.to).emit("sdp",{ description: data.description, sender: data.sender })
  });

  socket.on( 'ice candidates', ( data ) => {
    socket.to( data.to ).emit( 'ice candidates', { candidate: data.candidate, sender: data.sender } );
  });
});

server.listen(3030);
