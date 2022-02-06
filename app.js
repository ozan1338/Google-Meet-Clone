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

        socket.emit("informMeToOtherUser", otherUser)

    })

    socket.on("SDPProcess", (data)=>{
        socket.to(data.toConnId).emit("SDPProcess", {
            message: data.message,
            fromConnId: socket.id
        })
        //console.log("success");
    })

    socket.on("disconnect", ()=>{
        console.log("user disconnected: "+ socket.id);
        console.log(userConnections);
        let userDisconnected = userConnections.find(item => item.connectionId === socket.id)
        
        console.log(userDisconnected);

        if(userDisconnected){
            let meetingId = userDisconnected.meetingId;
            userConnections = userConnections.filter(item => item.connectionId !== socket.id)
            let list = userConnections.filter(item => item.meetingId == meetingId)
            console.log(list);
            list.forEach(item => {
                socket.to(item.connectionId).emit("informOtherAboutDisconnectedUser", {
                    connId: socket.id,
                    
                })
            })
        }
    })

})