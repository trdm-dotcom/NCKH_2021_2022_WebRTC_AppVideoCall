let socket = io('/');
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
const listUserPopup = document.getElementById("list_user_popup");
const msgerChat = document.getElementById("msger_chat");
const listUserOnl = document.getElementById("listUserOnl");
const localVideo = document.getElementById("localVideo");
const shareVideo = document.createElement("video");
const configuration = {
  "iceServers": [{ "url": "stun:stun.1.google.com:19302" }]
};
var socketId = null;
var userName = null;
var pc = [];
var myStream = null;
var myScreen = null;
var recordedStream = [];
var mediaRecorder = null;
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;


socket.on('connect', () => {
  socketId = socket.io.engine.id;
  userName = prompt("Nhập tên của bạn", '');
  userName = userName ? userName.trim() : socketId;
  getUserFullMedia().then((stream) => {
    myStream = stream;
    localVideo.mute = true;
    localVideo.srcObject = stream;
    localVideo.addEventListener("loadedmetadata", () => {
      localVideo.play();
    });
  }).catch((error) => {
    throw error;
  });

  socket.emit("joinRoom", { room: ROOM_ID, socketId: socketId, name: userName });

  socket.on('newUser', (data) => {
    console.log('newUser', data.socketId);
    socket.emit("connectNewUser", { to: data.socketId, sender: socketId });
    pc.push(data.socketId);
    init(true, data.socketId);
  });

  socket.on('newUserStart', (data) => {
    console.log('oldUser', data.sender);
    pc.push(data.sender);
    init(false, data.sender);
  });

  socket.on('ice candidates', async (data) => {
    if (data.candidate) {
      await pc[data.sender].addIceCandidate(new RTCIceCandidate(data.candidate))
    }
  });

  socket.on('sdp', async (data) => {
    if (data.description.type === 'offer') {
      if (data.description) {
        await pc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description))
      }
      getUserFullMedia().then(async (stream) => {
        // if (!document.getElementById(`${socketId}-video`).srcObject) {
        //   document.getElementById(`${socketId}-video`).srcObject = stream;
        // }
        myStream = stream;

        stream.getTracks().forEach((track) => {
          pc[data.sender].addTrack(track, stream);
        });

        let answer = await pc[data.sender].createAnswer();

        await pc[data.sender].setLocalDescription(answer);

        socket.emit('sdp', { description: pc[data.sender].localDescription, to: data.sender, sender: socketId });
      }).catch((e) => {
        throw e;
      });
    }
    else if (data.description.type === 'answer') {
      await pc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description));
    }
  });

  socket.on('showChat', (data) => showMsg(data));

  socket.on('startRecord', (data) => {
    if (!confirm(`${data.sender} bắt đầu ghi hình!\n bắt đầu ghi hình`)){

    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === 'Enter' && chatMessage.value.trim() != "") {
      chat();
    }
  });

  buttonSend.addEventListener("click", () => {
    if (chatMessage.value.trim() != "") {
      chat();
    }
  });
  recordButton.addEventListener("click", record);
  shareScreemButton.addEventListener("click", shareScreem);
});

function init(createOffer, partnerName) {
  pc[partnerName] = new RTCPeerConnection(configuration);
  if (myScreen && myScreen.getTracks().length) {
    myScreen.getTracks().forEach((track) => {
      pc[partnerName].addTrack(track, myScreen);
    });
  } else if (myStream) {
    myStream.getTracks().forEach((track) => {
      pc[partnerName].addTrack(track, myStream);
    });
  } else {
    getUserFullMedia().then((stream) => {
      myStream = stream;
      stream.getTracks().forEach((track) => {
        pc[partnerName].addTrack(track, stream);
      });
    }).catch((error) => {
      throw error;
    });
  }

  if (createOffer) {
    pc[partnerName].onnegotiationneeded = async () => {
      let offer = await pc[partnerName].createOffer();
      await pc[partnerName].setLocalDescription(offer);
      socket.emit('sdp', { description: pc[partnerName].localDescription, to: partnerName, sender: socketId });
    };
  }

  pc[partnerName].onicecandidate = ({ candidate }) => {
    socket.emit('ice candidates', { candidate: candidate, to: partnerName, sender: socketId });
  };

  pc[partnerName].ontrack = (e) => {
    let stream = e.streams[0];
    if (document.getElementById(`${partnerName}-video`)) {
      document.getElementById(`${partnerName}-video`).srcObject = stream;
    }

    else {
      let video = document.createElement('video');
      addVideoStream(video, stream, `${partnerName}-video`);
    }
  };

  pc[partnerName].onconnectionstatechange = (d) => {
    switch (pc[partnerName].iceConnectionState) {
      case 'disconnected':
      case 'failed':
        closeVideo(`${partnerName}-video`);
        break;

      case 'closed':
        closeVideo(`${partnerName}-video`);
        break;
    }
  };

  pc[partnerName].onsignalingstatechange = (d) => {
    switch (pc[partnerName].signalingState) {
      case 'closed':
        closeVideo(`${partnerName}-video`);
        break;
    }
  };
}

function hasUserMedia() {
  return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia);
}

function getUserFullMedia() {
  if (hasUserMedia()) {
    return navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      }
    });
  }
  else {
    throw new Error("WebRTC is not supported");
  }
}

function getUserDisplayMedia() {
  if (hasUserMedia()) {
    return navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always"
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    });
  }
  else {
    throw new Error("WebRTC is not supported");
  }
}

function addVideoStream(videoEl, stream, id) {
  videoEl.srcObject = stream;
  videoEl.id = id;
  videoEl.addEventListener("loadedmetadata", () => {
    videoEl.play();
  });
  videoGrid.append(videoEl);
  retoreVideoGrid();
};

function retoreVideoGrid() {
  let totalVideos = videoGrid.getElementsByTagName("video").length;
  let newWidth = totalVideos <= 2 ? '50%' : (
    totalVideos == 3 ? '33.33%' : (
      totalVideos <= 8 ? '25%' : (
        totalVideos <= 15 ? '20%' : (
          totalVideos <= 18 ? '16%' : (
            totalVideos <= 23 ? '15%' : (
              totalVideos <= 32 ? '12%' : '10%'
            )
          )
        )
      )
    )
  );
  for (let index = 0; index < totalVideos; index++) {
    document.getElementsByTagName("video")[index].style.width = newWidth;
  }
}

function closeVideo(elemId) {
  if (document.getElementById(elemId)) {
    document.getElementById(elemId).remove();
    retoreVideoGrid();
  }
}

function shareScreem() {
  getUserDisplayMedia().then((stream) => {
    myScreen=stream;
    broadcastNewTracks(stream,'video');
    shareScreemButton.classList.toggle("play");
    addVideoStream(shareVideo, stream, `${socketId}-sharea`);
    myScreen.getVideoTracks()[0].addEventListener( 'ended', () => {
      stopSharingScreen();
    });
  }).catch((e) => {
    throw e;
  });
}

function stopSharingScreen(){
  return new Promise((res,rej) => {
    if (myScreen.getTracks().length){
      myScreen.getTracks().forEach(track => track.stop())
    }
    res();
  }).then(()=>{
    broadcastNewTracks(myStream,'video');
    videoGrid.removeChild(shareVideo);
    shareScreemButton.classList.remove("play");
  }).catch((e) => {
    throw e;
  })
}

function broadcastNewTracks(stream, type) {
  let track = type == 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
  for (let p in pc) {
    let pName = pc[p];
    if (typeof pc[pName] == 'object') {
      replaceTrack(track, pc[pName]);
    }
  }
}

function replaceTrack( stream, recipientPeer ) {
  let sender = recipientPeer.getSenders ? recipientPeer.getSenders().find(s => s.track && s.track.kind === stream.kind) : false;
  if (sender) {
    sender.replaceTrack(stream)
  }
}

function record() {
  if (recordButton.dataset.status === "start") {
    if (myScreen && myScreen.getVideoTracks().length) {
      startRecord(myScreen);
    }
    else {
      getUserDisplayMedia().then((screenStream) => {
        startRecord(screenStream);
      }).catch((e) => {
        throw e;
      });
    }
  }
  else if (recordButton.dataset.status === "pause") {
    pauseRecord();
  }
  else if (recordButton.dataset.status === "resume") {
    resumeRecord();
  }
}

function startRecord(stream) {
  if (confirm("Start record ?")) {
    recordedBlobs = [];
    var options = { mimeType: "video/webm; codecs=vp9" };
    try {
      mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorder.ondataavailable = handleDataAvailable;
      mediaRecorder.start();
    } catch (error) {
      console.error(error);
      return;
    }
    mediaRecorder.onresume = () => {
      socket.emit("record", { room: ROOM_ID, sender: userName });
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
      socket.emit("record", { room: ROOM_ID, sender: userName });
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
  }
}

function pauseRecord() {
  if (confirm("Pause record ?")) {
    mediaRecorder.pause();
  } else {
    mediaRecorder.stop();
  }
}

function resumeRecord() {
  mediaRecorder.resume();
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedStream.push(event.data);
  }
}

function downloadRecord() {
  let blob = new Blob(recordedBlobs, { type: 'video/webm' });
  let url = window.URL.createObjectURL(blob);
  let a = document.createElement('a');
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


function showMsg(data, type) {
  let html = '';
  if (type) {
    html = `<div class="msg right-msg">
                  <div class="msg-bubble">
                    <div class="msg-info">
                      <div class="msg-info-name">${data.sender}</div>
                      <div class="msg-info-time">${data.time}</div>
                    </div>
                    <div class="msg-text">${data.msg}</div>
                  </div>
                </div>`
  }
  else {
    html = `<div class="msg left-msg">
                  <div class="msg-bubble">
                    <div class="msg-info">
                      <div class="msg-info-name">${data.sender}</div>
                      <div class="msg-info-time">${data.time}</div>
                    </div>
                    <div class="msg-text">${data.msg}</div>
                  </div>
                </div>`
  }
  msgerChat.innerHTML += html
}

function chat() {
  let current = new Date();
  let msg = chatMessage.value.trim();
  chatMessage.value = "";
  data = {
    room: ROOM_ID,
    msg: msg,
    sender: userName,
    time: current.toLocaleTimeString()
  }
  socket.emit("chat", data);
  showMsg(data, true);
}

function showInvitePopup() {
  invitePopup.classList.toggle("show-modal");
  document.getElementById("roomLink").value = window.location.href;
}

function showChatPopup() {
  chatPopup.classList.toggle("show-modal");
}

function windowOnClick(event) {
  if (event.target === invitePopup) {
    showInvitePopup();
  }
  if (event.target === chatPopup) {
    showChatPopup();
  }
}

function copyToClipboard() {
  let copyText = document.getElementById("roomLink");
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(copyText.value);
}

inviteButton.addEventListener("click", showInvitePopup);
chatButton.addEventListener("click", showChatPopup);
window.addEventListener("click", windowOnClick);
copyButton.addEventListener("click", copyToClipboard);