const config = require('../config');
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const wss = new WebSocket.Server({ port: config.server.websocketPort });
const { nanoid } = require('nanoid');

const NANOID_LENGTH = 10;

const app = express();
app.use(cors());

const rooms = {
    'hidden_room': {
        users: [] // empty by default
    }
};

app.get('/create_room', function(req, res) {
    const roomId = nanoid(NANOID_LENGTH);
    const username = req.query.username;

    // creates new room in 
    rooms[roomId] = {
        users: []
    };

    res.json({ username: username, roomId: roomId });
});

app.get('/join_room', function(req, res) {
    const username = req.query.username;
    const roomId = req.query.roomId;

    if (roomId in rooms) {
        res.json({ roomId: roomId }); // room does exist! return back the roomId
    } else {
        res.json({ roomId: null }); // room doesn't exist
    }
});

app.get('/check_if_room_exists', function(req, res) {
    const roomId = req.query.roomId;

    if (roomId in rooms) {
        res.json({ exists: true });
    } else {
        res.json({ exists: false });
    }
});

app.get('/check_if_username_exists', function(req, res) {
    const username = req.query.username;
    const roomId = req.query.roomId;

    if (rooms[roomId].users.includes(username)) {
        res.json({ alreadyExists: true });
    } else {
        res.json({ alreadyExists: false });
    }
});

wss.on('connection', function(ws) {
    const [username, roomId] = decodeURIComponent(ws.protocol).split(',');
    rooms[roomId].users.push(username);

    // this gets sent when someone joins a room
    wss.clients.forEach(function(client) {
        client.send(JSON.stringify({ roomId: roomId, type: 'serverMessage', message: `${username} has joined the room.` }));
        client.send(JSON.stringify({ roomId: roomId, type: 'roomList', message: rooms[roomId].users }));
    });

    ws.on('message', function(data) {
        wss.clients.forEach(function(client) {
            client.send(data);
        });
    });

    ws.on('close', function(data) {
        if (roomId in rooms) {
            const index = rooms[roomId].users.indexOf(username);

            if (index > -1) {
                // remove user from user list
                rooms[roomId].users.splice(index, 1);
            }

            // if the room becomes empty...
            if (rooms[roomId].users.length < 1) {
                delete rooms[roomId]; // delete the room once all users leave
            } else {
                // this gets sent when someone leaves a room
                wss.clients.forEach(function(client) {
                    client.send(JSON.stringify({ roomId: roomId, type: 'serverMessage', message: `${username} has left the room.` }));
                    client.send(JSON.stringify({ roomId: roomId, type: 'roomList', message: rooms[roomId].users }));
                });
            }
        }
    });
});

app.listen(config.server.port, function() {
    console.log(`Chat Server is listening at port ${config.server.port}...`);
});