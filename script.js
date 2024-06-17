const socket = io('/');
const videoGrid = document.getElementById('video-grid');
let myPeer, myVideoStream, myVideo;
let currentUser = '';

function login() {
    currentUser = document.getElementById('username').value;
    document.getElementById('login').style.display = 'none';
    document.getElementById('conference').style.display = 'block';
}

function startCall() {
    myPeer = new Peer(undefined, {
        host: '/',
        port: '3001'
    });

    myVideo = document.createElement('video');
    myVideo.muted = true;
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then(stream => {
        myVideoStream = stream;
        addVideoStream(myVideo, stream);

        myPeer.on('call', call => {
            call.answer(stream);
            const video = document.createElement('video');
            call.on('stream', userVideoStream => {
                addVideoStream(video, userVideoStream);
            });
        });

        socket.on('user-connected', userId => {
            connectToNewUser(userId, stream);
        });
    });

    socket.emit('join-room', ROOM_ID, currentUser);

    myPeer.on('open', id => {
        socket.emit('join-room', ROOM_ID, id);
    });
}

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    });
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoGrid.append(video);
}

function shareScreen() {
    navigator.mediaDevices.getDisplayMedia({
        video: true
    }).then(stream => {
        let videoTrack = stream.getVideoTracks()[0];
        videoTrack.onended = () => {
            stopScreenShare();
        };
        for (let sender of myPeer._connections.values()) {
            sender.peerConnection.getSenders().find(s => s.track.kind === 'video').replaceTrack(videoTrack);
        }
    });
}

function stopScreenShare() {
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then(stream => {
        let videoTrack = stream.getVideoTracks()[0];
        for (let sender of myPeer._connections.values()) {
            sender.peerConnection.getSenders().find(s => s.track.kind === 'video').replaceTrack(videoTrack);
        }
    });
}

function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            socket.emit('file', { file: e.target.result, name: file.name });
        };
        reader.readAsDataURL(file);
    }
}

socket.on('file', data => {
    const a = document.createElement('a');
    a.href = data.file;
    a.download = data.name;
    a.click();
});

let whiteboard = document.getElementById('whiteboard');
let context = whiteboard.getContext('2d');
let drawing = false;

function toggleWhiteboard() {
    whiteboard.style.display = whiteboard.style.display === 'none' ? 'block' : 'none';
}

whiteboard.addEventListener('mousedown', () => drawing = true);
whiteboard.addEventListener('mouseup', () => drawing = false);
whiteboard.addEventListener('mousemove', draw);

function draw(event) {
    if (!drawing) return;
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#000000';
    context.lineTo(event.clientX - whiteboard.offsetLeft, event.clientY - whiteboard.offsetTop);
    context.stroke();
    context.beginPath();
    context.moveTo(event.clientX - whiteboard.offsetLeft, event.clientY - whiteboard.offsetTop);
}
