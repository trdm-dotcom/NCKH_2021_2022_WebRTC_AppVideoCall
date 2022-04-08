const socket = io("");
const chatButton = document.getElementById("chatButton");
const inviteButton = document.getElementById("inviteButton");
const copyButton = document.getElementById("copyButton");
const invitePopup = document.getElementById("invite_popup");
const chatPopup = document.getElementById("chat_popup");
const videoGrid = document.getElementById("video-grid");
const chatMessage = document.getElementById("chat_message");
const buttonSend = document.getElementById("button_send");
const recordButton = document.getElementById("recordButton");
const shareScreemButton = document.getElementById("shareScreemButton");
const listButton = document.getElementById("listButton");
const listUserPopup = document.getElementById("list_user_popup");
const myVideo = document.createElement("video");
const shareVideo = document.createElement("video");
const msgerChat = document.getElementById("msger_chat");
const listUserOnl = document.getElementById("listUserOnl");
myVideo.muted = true;
var peers = {};
var userId = null;
var localStream;
var shareStream;
var mediaRecorder;
var recordedBlobs;
var peer = new Peer();

peer.on('open', function (id) {
  userId = id;
  let name = prompt("Nhập tên của bạn",'');
  name = name.trim() == '' ? id : name.trim()
  socket.emit("joinRoom", ROOM_ID, {id:id,name:name});
});

var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;
const hasUserMedia = () => {
  return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia);
}
const playVideoFromCamera = async () => {
  let stream = null;
  if (hasUserMedia) {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    const config = { video: true, audio: true }
    stream = await navigator.mediaDevices.getUserMedia(config);
  }
  else {
    alert("WebRTC is not supported");
  }
  return stream;
}
playVideoFromCamera().then((stream) => {
  localStream = stream;
  addVideoStream(myVideo, localStream, userId);
  socket.on("userConnected", (peerID) => {
    connectToNewUser(peerID, localStream);
  });
  socket.on("disconnect",() => {
    socket.emit("leaveRoom",ROOM_ID,userId);
  });
  socket.on("userDisconnected",(peerID) => {
    if(peers[peerID]) peers[peerID].close();
  });
  socket.on("createMessage", (msg) => {
    let html = '';
    console.log(msg);
    if (msg.user != userId){
      html = `<div class="msg left-msg">
                  <div class="msg-bubble">
                    <div class="msg-info">
                      <div class="msg-info-name">${msg.user}</div>
                      <div class="msg-info-time">${msg.time}</div>
                    </div>
                    <div class="msg-text">${msg.msg}</div>
                  </div>
                </div>`
    }
    else{
      html = `<div class="msg right-msg">
                  <div class="msg-bubble">
                    <div class="msg-info">
                      <div class="msg-info-name">${msg.user}</div>
                      <div class="msg-info-time">${msg.time}</div>
                    </div>
                    <div class="msg-text">${msg.msg}</div>
                  </div>
                </div>`
    }
    msgerChat.innerHTML += html
  });
  socket.on("callShare",(user) => {
    if (user != userId){
      var conn = peer.connect(user);
      conn.on('open', function(){
        conn.send({type:false});
        var call = peer.call(user, localStream);
        var video = document.createElement("video");
        call.on("stream", (userVideoStream) => {
          addVideoStream(video, userVideoStream, `share_${user}`);
        });
        call.on("close",() => {
          video.remove();
        });
        peers[user] = call;
      });
    }
  });
  socket.on("stopCallShare",(user)=>{
    if (user != userId){
      console.log(user);
    }
  })
  document.addEventListener("keydown", (e) => {
    if (e.key === 'Enter' && chatMessage.value.trim() != "") {
      let current = new Date();
      let msg = chatMessage.value.trim(); 
      chatMessage.value = "";
      socket.emit("message", {
        msg:msg,
        user:userId,
        time:current.toLocaleTimeString()
      });
    }
  });
  buttonSend.addEventListener("click",() => {
    if (chatMessage.value.trim() != "") {
      let current = new Date();
      let msg = chatMessage.value.trim(); 
      chatMessage.value = "";
      socket.emit("message", {
        msg:msg,
        user:userId,
        time:current.toLocaleTimeString()
      });
    }
  });
  shareScreemButton.addEventListener("click", shareScreem);
  recordButton.addEventListener("click", record);
}).catch(error => {
  console.error(error)
});

socket.on("refeshListUser",(listUserInfo) => {
  let html = '';
  listUserInfo.forEach(element => {
    html += `<li class="list-item">
              <div class="list-item-content">
                <h4>${element.name}</h4>
              </div>
            </li>`
  });
  listUserOnl.innerHTML = html;
});

peer.on('connection', function(conn) {
  conn.on('data', function(data){
    stream = data.type ? localStream : shareStream;
    peer.on("call", (call) =>{
      call.answer(stream);
      if (data.type){
        var video = document.createElement("video");
        call.on("stream", function (remoteStream) {
          addVideoStream(video, remoteStream,call.peer);
        });
      }      
    });
  });
});

const connectToNewUser = (peerId, streams) => {
  var conn = peer.connect(peerId);
  conn.on('open', function(){
    conn.send({type:true});
    var call = peer.call(peerId, streams);
    var video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
      addVideoStream(video, userVideoStream, peerId);
    });
    call.on("close",() => {
      video.remove();
    });
    peers[peerId] = call;
  });
};

const addVideoStream = (videoEl, stream, id) => {
  videoEl.srcObject = stream;
  videoEl.id = id;
  videoEl.addEventListener("loadedmetadata", () => {
    videoEl.play();
  });

  videoGrid.append(videoEl);
  let totalUsers = document.getElementsByTagName("video").length;
  if (totalUsers > 1) {
    for (let index = 0; index < totalUsers; index++) {
      document.getElementsByTagName("video")[index].style.width =
        100 / totalUsers + "%";
    }
  }
};

const retoreVideoGrid = () => {
  let totalVideos = document.getElementsByTagName("video").length;
  if (totalVideos > 1) {
    for (let index = 0; index < totalVideos; index++) {
      document.getElementsByTagName("video")[index].style.width = 100 / totalVideos + "%";
    }
  }
}

const record = () => {
  if (recordButton.dataset.status === "start") {
    startRecord();
  }
  else if (recordButton.dataset.status === "pause") {
    pauseRecord();
  }
  else if (recordButton.dataset.status === "resume") {
    resumeRecord();
  }
}

const startRecord = () => {
  if (confirm("Start record ?")) {
    recordedBlobs = [];
    var options = { mimeType: "video/webm; codecs=vp9" };
    try {
      mediaRecorder = new MediaRecorder(localStream, options);
    } catch (error) {
      console.error(error);
      return;
    }
    mediaRecorder.onresume = () => {
      recordButton.classList.remove("pause");
      recordButton.classList.toggle("play");
      recordButton.dataset.status = "pause";
    };
    mediaRecorder.onpause = () => {
      recordButton.classList.remove("play");
      recordButton.classList.toggle("pause");
      recordButton.dataset.status = "resume";
    };
    mediaRecorder.onstart = () => {
      recordButton.classList.toggle("play");
      recordButton.dataset.status = "pause";
    };
    mediaRecorder.onstop = () => {
      if (confirm("Download record ?")) {
        downloadRecord();
      } else {
        recordButton.classList.remove("play");
        return;
      }
      recordButton.dataset.status = "play";
    };

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();
  }
}

const pauseRecord = () => {
  if (confirm("Pause record ?")) {
    mediaRecorder.pause();
  } else {
    mediaRecorder.stop();
  }
}

const resumeRecord = () => {
  mediaRecorder.resume();
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

const downloadRecord = () => {
  const blob = new Blob(recordedBlobs, { type: 'video/webm' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'test.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

const shareScreem = () => {
  navigator.mediaDevices.getDisplayMedia({ video: true })
    .then(handleSuccess, handleError);
}

const handleSuccess = (stream) => {
  shareStream = stream;
  shareScreemButton.classList.toggle("play");
  addVideoStream(shareVideo, shareStream,`share_${userId}`);
  socket.emit("startShare",userId);
  shareStream.getVideoTracks()[0].addEventListener('ended', () => {
    socket.emit("stopShare",userId);
    shareScreemButton.classList.remove("play");
    videoGrid.removeChild(shareVideo);
    retoreVideoGrid
  });
}

const handleError = (error) => {
  console.error(error);
  return;
}

const showInvitePopup = () => {
  invitePopup.classList.toggle("show-modal");
  document.getElementById("roomLink").value = window.location.href;
}

const showChatPopup = () => {
  chatPopup.classList.toggle("show-modal");
}

const showListUserPopUp = () => {
  listUserPopup.classList.toggle("show-modal");
}

function windowOnClick(event) {
  if (event.target === invitePopup) {
    showInvitePopup();
  }
  if (event.target === chatPopup) {
    showChatPopup();
  }
  if (event.target === listUserPopup){
    showListUserPopUp();
  }
}

const copyToClipboard = () => {
  let copyText = document.getElementById("roomLink");
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(copyText.value);
}

inviteButton.addEventListener("click", showInvitePopup);
chatButton.addEventListener("click", showChatPopup);
copyButton.addEventListener("click", copyToClipboard);
window.addEventListener("click", windowOnClick);
listButton.addEventListener("click",showListUserPopUp);