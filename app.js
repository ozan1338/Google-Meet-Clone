const express = require("express")
const path = require("path")
const app = express()

const server = app.listen(3001, ()=>{console.log(`listening on port 3001`)})

const io = require("socket.io")(server, {
    allowEIO3: true
})
app.use(express.static(path.join(__dirname,"")))

let userConnections = []

io.on("connection",(socket)=>{
    console.log(`socket id is : ${socket.id}`);
    socket.on("user-connect", (data)=>{
        console.log("user connect ", data.displayName);
        console.log("user connect ", data.meetingId);

        let otherUser = userConnections.filter((item)=> item.meetingId === data.meetingId)

        userConnections.push({
            connectionId: socket.id,
            userId: data.displayName,
            meetingId: data.meetingId
        })

        otherUser.forEach((item)=> {
            socket.to(item.connectionId).emit("informNewUser", {
                otherUserId: data.displayName,
                connId: socket.id
            })
        })
    })
})