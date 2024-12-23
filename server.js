require('dotenv').config();
const { log } = require('console');
const express = require("express");
const https = require("https");
const app = express();
const fs = require('fs');
app.use(express.static(__dirname))


const key = fs.readFileSync('cert.key');
const cert = fs.readFileSync('cert.crt');

const server =  https.createServer({key, cert}, app);

const socket = require("socket.io");
const io = socket(server, {
    cors: {
        origin: [
            // "https://localhost",
            "https://192.168.252.167"
        ],
        methods:["GET", "POST"]
    }
});

const users = {};

const socketToRoom = {};

io.on('connection', socket => {
    console.log("user joined");
    socket.on("join room", roomID => {
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
            console.log("user joining in live room");
            console.log("currnt user: ", socket.id);
            
            console.log("users, ", users);
            
        } else {
            console.log("user created room");
            users[roomID] = [socket.id];
            console.log("users, ", users);

        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);

        socket.emit("all users", usersInThisRoom);
    });

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });


    socket.on("send message", ({ roomID, message }) => {
        console.log("67)roomiID: ", roomID, " message: ", message);
        console.log("68)from sockteid: ", socket.id);
        const from = socket.id;
        console.log("70)users, ", users);
        console.log("users[roomID]: ", users[roomID]);
        
        users[roomID].forEach(userSocketId => {
            if(userSocketId!=socket.id)
            io.to(userSocketId).emit('receive message', {from, message});
        });
    });


    function removeSocketIdFromRoom(){
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }

        console.log("emitting all userd to say good bye to ", socket.id);
        console.log("usersinthis rrooom: ", users[roomID], "\n");
        
        if(users[roomID]){
            users[roomID].forEach(userSocketId => {
                io.to(userSocketId).emit('remove user', socket.id);
            });
        }
    }

    socket.on('leave room', ()=>{
        console.log(`${socket.id} wants to leave\n`);
        
        removeSocketIdFromRoom();
    })


    socket.on('disconnect', () => {
        removeSocketIdFromRoom();
        console.log(`${socket.id} removed from ${socketToRoom[socket.id]}\n`);
        console.log("user in 99 server: ", users);
    });

});

server.listen(process.env.PORT || 8181, () => console.log('server is running on port 8181'));


