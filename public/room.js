const socket = io("/");
const chatButton = document.getElementById("chatButton");
const playStopButton = document.getElementById("playStopButton");
const muteButton = document.getElementById("muteButton");
const inviteButton = document.getElementById("inviteButton");
const copyButton = document.getElementById("copyButton");
const invitePopup = document.getElementById("invite_popup");
const chatPopup = document.getElementById("chat_popup");
const videoGrid = document.getElementById("video-grid");
const recordButton = document.getElementById("recordButton");
const shareScreemButton = document.getElementById("shareScreemButton");
const myVideo = document.createElement("video");
const shareVideo = document.createElement("video");
myVideo.muted = true;
var userId = null;
var localStream;
var mediaRecorder;
var recordedBlobs;
var peers = {};
var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "3030",
});

peer.on('open', function (id) {
  userId = id;
  socket.emit("join-room", ROOM_ID, id);
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
  addVideoStream(myVideo, stream, userId);
  socket.on("user-connected", (peerID) => {
    connectToNewUser(peerID, stream);
  });
});

peer.on("call", (call) =>{
  console.log(call.peer);
  getUserMedia(
    { video: true, audio: true },
    function (stream) {
      call.answer(stream); // Answer the call with an A/V stream.
      const video = document.createElement("video");
      call.on("stream", function (remoteStream) {
        addVideoStream(video, remoteStream,call.peer);
      });
    },
    function (err) {
      console.log("Failed to get local stream", err);
    }
  );
});

// CHAT

const connectToNewUser = (peerId, streams) => {
  var call = peer.call(peerId, streams);
  var video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, peerId);
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

const playStop = () => {
  let enabled = localStream.getVideoTracks()[0].enabled;
  if (enabled) {
    localStream.getVideoTracks()[0].enabled = false;
    localStream.getVideoTracks()[0].stop();
    playStopButton.classList.toggle("stop");
  } else {
    playStopButton.classList.remove("stop");
    localStream.getVideoTracks()[0].enabled = true;
    playVideoFromCamera().then(stream => {
      localStream = stream;
      addVideoStream(myVideo, stream, "share")
    })
      .catch(error => {
        console.error(error)
      });
  }
};

const muteUnmute = () => {
  const enabled = localStream.getAudioTracks()[0].enabled;
  if (enabled) {
    localStream.getAudioTracks()[0].enabled = false;
    localStream.getAudioTracks()[0].stop();
    muteButton.classList.toggle("stop");
  } else {
    muteButton.classList.remove("stop");
    localStream.getAudioTracks()[0].enabled = true;
  }
};

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
  shareScreemButton.classList.toggle("play");
  addVideoStream(shareVideo, stream);
  stream.getVideoTracks()[0].addEventListener('ended', () => {
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

function windowOnClick(event) {
  if (event.target === invitePopup) {
    showInvitePopup();
  }
  if (event.target === chatPopup) {
    showChatPopup();
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
playStopButton.addEventListener("click", playStop);
muteButton.addEventListener("click", muteUnmute);
shareScreemButton.addEventListener("click", shareScreem);
recordButton.addEventListener("click", record);