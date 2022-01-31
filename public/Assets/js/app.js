const myApp = (function(){
    let socket = null
    let userId = "";
    let meetingId = "";
    const init = (uid, mid) => {
        userId = uid
        meetingId = mid
        eventProccessForSignalingServer()
    }
    
    const eventProccessForSignalingServer = () => {
        socket = io.connect()
        socket.on("connect", ()=>{
            if(socket.connected){
                if(userId && meetingId){
                    socket.emit("user-connect", {
                        displayName: userId,
                        meetingId
                    })
                }
            }
        });

        socket.on("inforNewUser", (data)=>{
            addUser(data.otherUserId, data.connId);
        })
    }


    return {
        _init: function(uid,mid){
            init (uid, mid)
        }
    }
})();