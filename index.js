const express = require('express')
const crypto = require('crypto')
require('dotenv').config()

const app = express()
const server = app.listen(3001, function() {
    console.log('server running on port 3001')
});

const io = require('socket.io')(server, {
    cors: {
        origin: process.env.ORIGIN_HOST,
        methods: ["GET", "POST"]
    }
})

function randomStrings(val){
    const S = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return Array.from(crypto.randomFillSync(new Uint8Array(val))).map((n)=>S[n%S.length]).join('')
}


let store = {}
let users = {}

io.on('connection', function(socket) {
    socket.on('create', function(data) {
        if (typeof data.url === 'undefined' || data.url.length < 10) {
            socket.emit('error', 'リンク形式が正しくありません')
            return
        }

        if (typeof data.name === 'undefined' || data.name.length < 5) {
            socket.emit('error', 'ユーザー名形式が正しくありません')
            return
        }
        
        console.log(socket.id)

        let roomId = 'room-' + randomStrings(32)
        store[roomId] = {users: {[socket.id]: data.name}, link: data.url}
        users[socket.id] = roomId

        socket.join(roomId)
        socket.emit('created', roomId)
    })

    socket.on('join', function(data) {
        if (typeof store[data.roomId] === 'undefined'){
            socket.emit('error', 'error')
        }

        store[data.roomId].users.push(socket.id)
        users[socket.id] = data.roomId
        socket.join(data.roomId)

        io.sockets.in(data.roomId).emit('joinned', store[users[socket.id]].users[socket.id])
        console.log(store)
    })

    socket.on('send message', function(data) {
        io.sockets.in(data.roomId).emit('receive', data.message)
        console.log(store)
    })

    socket.on('disconnect', function () {
        if (typeof store[users[socket.id]] === 'undefined') return

        socket.broadcast.to(users[socket.id]).emit('disconnected', store[users[socket.id]].users[socket.id]);
        delete store[users[socket.id]].users[socket.id]

        console.log('connections: '+ store[users[socket.id]].users.length | 0)
        if (typeof store[users[socket.id]].users.length === 'undefined') {
            delete store[users[socket.id]]
        }
        delete users[socket.id]

        console.log('disconnected: '+ socket.id)
        console.log(store)
    });
})

console.log(process.env.ORIGIN_HOST)