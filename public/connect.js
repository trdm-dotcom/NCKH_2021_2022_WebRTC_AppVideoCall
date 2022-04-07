const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
const buttonConnect = document.getElementById("buttonConnect");
const getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;

var userId = null;
var peer = new Peer(undefined, {
    path: "/peerjs",
    host: "/",
    port: "3030",
});

peer.on("open", (id) => {
    userId = id;
    console.log(userId);
});

async function playVideoFromCamera() {
    navigator.getUserMedia = getUserMedia;
    const config = { video: true, audio: true }
    return await navigator.mediaDevices.getUserMedia(config);
}
//call
function joinRoom(stream){
    const call = peer.call(ROOM_ID,stream);
    call.on(stream)
}

playVideoFromCamera().then((stream) => {
    localStream = stream;
    addVideoStream(myVideo, stream, userId);
    buttonConnect.addEventListener("click",joinRoom(stream));
});

function addVideoStream(videoEl, stream, id) {
    videoEl.srcObject = stream;
    videoEl.id = id;
    videoEl.addEventListener("loadedmetadata", () => {
        videoEl.play();
    });
    videoGrid.append(videoEl);
};