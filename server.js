const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const { ExpressPeerServer } = require('peer');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const { v4: uuidV4 } = require('uuid');

app.use(express.static('public'));

const peerServer = ExpressPeerServer(server, {
    debug: true
});
app.use('/peerjs', peerServer);

app.get('/', (req, res) => {
    res.redirect(`/${uuidV4()}`);
});

app.get('/:room', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).broadcast.emit('user-connected', userId);

        socket.on('disconnect', () => {
            socket.to(roomId).broadcast.emit('user-disconnected', userId);
        });

        socket.on('file', data => {
            socket.to(roomId).broadcast.emit('file', data);
        });
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
