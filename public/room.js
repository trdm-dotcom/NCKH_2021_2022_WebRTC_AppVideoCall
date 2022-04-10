let socket = io('');
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
const msgerChat = document.getElementById("msger_chat");
const listUserOnl = document.getElementById("listUserOnl");
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
    let video = document.createElement("video");
    video.mute = true
    addVideoStream(video, myStream, `${socketId}-video`);
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
        if (!document.getElementById(`${socketId}-video`).srcObject) {
          document.getElementById(`${socketId}-video`).srcObject = stream;
        }
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
      addVideoStream(video, stream, `${partnerName}-video`)
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
  let totalVideos = document.getElementsByTagName("video").length;
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

function shareScreen() {
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
    throw new Error('User media not available');
  }
}

function shareScreen() {
  shareScreen().then((stream) => {
    //save my screen stream
    myScreen = stream;

    //When the stop sharing button shown by the browser is clicked
    myScreen.getVideoTracks()[0].addEventListener('ended', () => {
      stopSharingScreen();
    });
  }).catch((e) => {
    throw e;
  });
}

function stopSharingScreen() {
  return new Promise((res, rej) => {
    myScreen.getTracks().length ? screen.getTracks().forEach(track => track.stop()) : '';
    res();
  }).then(() => {

  }).catch((e) => {
    throw e;
  });
}