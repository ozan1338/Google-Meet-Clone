const appProcess = (function (){
    let serverProcess;
    let myConnectionId;

    let peersConnectionId = []
    let peersConnection = []

    let remoteVideoStream = []
    let remoteAudioStream = []

    let = local_div = null;
    let audio
    let isAudioMute = true
    let rtpAudioSenders = []

    let rtpVideoSenders = []
    let videoStates = {
        None: 0,
        Camera: 1,
        ScreenShare: 2,
    }

    let videoSt = videoStates.None
    let videoCameraTrack;
    //console.log(videoSt);

    const _init = async(SDPFunction, myConnId)=>{
        serverProcess = SDPFunction;
        myConnectionId = myConnId;
        eventProcess();
        local_div = document.querySelector("#localVideoPlayer")
    }

    const eventProcess = () => {
        $("#micMuteUnmute").on("click", async()=>{
            //console.log("clicked");
            if(!audio){
                await loadAudio()
                console.log("ok");
            }
            if(!audio){
                alert("Audio Permission is not granted")
                return 
            }
            if(isAudioMute){
                audio.enable = true
                //console.log("arrasseo");
                $("#micMuteUnmute").html("<span class='material-icons' style='width: 100%;'>mic</span>")
                updateMediaSenders(audio,rtpAudioSenders);
            }else{
                audio.enable = false;
                $("#micMuteUnmute").html("<span class='material-icons' style='width: 100%;'>mic_off</span>")
                removeMediaSenders(rtpAudioSenders);
            }
            isAudioMute = !isAudioMute;


        });

        $("#videoCamOnOff").on("click", async()=>{
            if(videoSt === videoStates.Camera){
                await videoProcess(videoStates.None)
            }else{
                await videoProcess(videoStates.Camera)
            }
        })
        
        $("#btnShareOnOff").on("click", async()=>{
            if(videoSt === videoStates.ScreenShare){
                await videoProcess(videoStates.None)
            }else{
                await videoProcess(videoStates.ScreenShare)
            }
        })
    }

    const loadAudio = async() => {
        try {
            let audioStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            })

            audio = audioStream.getAudioTracks()[0]
            audio.enabled = true
        } catch (error) {
            console.log(error);
        }
    }

    const connectionStatus = (connection) => {
        if(connection && (connection.connectionState === "new" || connection.connectionState === "connecting" || connection.connectionState === "connected")){
            return true
        }else{
            return false
        }
    }

    const updateMediaSenders = async(track,rtpSenders) => {
        for(let conId in peersConnectionId){
            if(connectionStatus(peersConnection[conId])){
                //console.log(peersConnectionId);
                if(rtpSenders[conId] && rtpSenders[conId].track){
                    rtpSenders[conId].replaceTrack(track)
                    //console.log("aarraasseeo", peersConnection[conId]);
                    //console.log(new Date().getMinutes());
                    //console.log(new Date().getSeconds());
                }else {
                    rtpSenders[conId] = peersConnection[conId].addTrack(track)
                    //console.log("shinee!!", peersConnection[conId]);
                }
            }
            //console.log("shinee!!", peersConnectionId);
        }
    }

    const removeMediaSenders = (rtpVideoSenders) => {
        for(let conId in peersConnectionId){
            if(rtpVideoSenders[conId] && connectionStatus(peersConnection[conId])){
                peersConnection[conId].removeTrack(rtpVideoSenders[conId])
                rtpVideoSenders[conId] = null
            }
        }
    }

    const removeVideoStream = (rtpVideoSenders) => {
        if(videoCameraTrack){
            videoCameraTrack.stop();
            videoCameraTrack = null;
            local_div.srcObject = null;
            removeMediaSenders(rtpVideoSenders)
        }
    }

    const videoProcess = async(newVideoState) => {
        if(newVideoState === videoStates.None){
            $("#videoCamOnOff").html("<span class='material-icons' style='width: 100%;'>videocam_off</span>")
            $("#btnShareOnOff").html("<span class='material-icons'>present_to_all</span><div>Present Now</div>")
            videoSt = newVideoState
            console.log("arraseo");

            removeVideoStream(rtpVideoSenders)
            return
        }
        if(newVideoState === videoStates.Camera){
            $("#videoCamOnOff").html("<span class='material-icons' style='width: 100%;'>videocam_on</span>")
        }
        try {
            let videoStream = null
            if(newVideoState === videoStates.Camera){
                videoStream = await navigator.mediaDevices.getUserMedia({
                    video:{
                        width:1280,
                        height:768
                    },
                    audio:false
                })
            }else if(newVideoState === videoStates.ScreenShare){
                videoStream = await navigator.mediaDevices.getDisplayMedia({
                    video:{
                        width:1280,
                        height:768
                    },
                    audio:false
                })
                videoStream.oninactive = (event) => {
                    removeVideoStream(rtpVideoSenders);
                    $("#btnShareOnOff").html('<span class="material-icons  ">present_to_all</span><div class="">Present Now</div>')
                }
            }

            if(videoStream && videoStream.getVideoTracks().length > 0){
                videoCameraTrack = videoStream.getVideoTracks()[0];
                if(videoCameraTrack){
                    local_div.srcObject = new MediaStream([videoCameraTrack]);
                    //alert("camera found")
                    updateMediaSenders(videoCameraTrack, rtpVideoSenders)
                }
            }
            
        } catch (error) {
            console.error(error);
            return
        }
        videoSt = newVideoState;

        if(newVideoState === videoStates.Camera){
            $("#videoCamOnOff").html("<span class='material-icons' style='width: 100%;'>videocam</span>")
            $("#btnShareOnOff").html('<span class="material-icons  ">present_to_all</span><div class="">Present Now</div>')
        }else if(newVideoState === videoStates.ScreenShare){
            $("#videoCamOnOff").html("<span class='material-icons' style='width: 100%;'>videocam_off</span>")
            $("#btnShareOnOff").html('<span class="material-icons text-success ">present_to_all</span><div class="text-success">Stop Present Now</div>')
        }
    }

    let iceConfiguration = {
        iceServers : [
            {
                urls:"stun:stun.l.google.com:19302",
            },
            {
                urls:"stun:stun1.l.google.com:19302",
            },

        ] 
    }

    const setConnection = async(connId) => {
        let connection = new RTCPeerConnection(iceConfiguration);

        connection.onnegotiationneeded = async(event) => {
            await setOffer(connId)
        }

        connection.onicecandidate = event => {
            if(event.candidate){
                serverProcess(JSON.stringify({icecandidate: event.candidate}), 
                connId)
            }
        }

        connection.ontrack = (event => {
            if(!remoteVideoStream[connId]){
                remoteVideoStream[connId] = new MediaStream()
            }
            if(!remoteAudioStream[connId]){
                remoteAudioStream[connId] = new MediaStream()
            }

            if(event.track.kind === "video"){
                remoteVideoStream[connId].getVideoTracks().forEach((item)=>{
                    remoteVideoStream[connId].removeTrack(item);
                })
                remoteVideoStream[connId].addTrack(event.track)

                let remoteVideoPlayer = document.getElementById(`v_${connId}`)
                remoteVideoPlayer.srcObject = null
                remoteVideoPlayer.srcObject = remoteVideoStream[connId]
                remoteVideoPlayer.load()
            }else if(event.track.kind === "audio"){
                remoteAudioStream[connId].getAudioTracks().forEach((item)=>{
                    remoteAudioStream[connId].removeTrack(item);
                })
                remoteAudioStream[connId].addTrack(event.track)

                let remoteAudioPlayer = document.getElementById(`a_${connId}`)
                remoteAudioPlayer.srcObject = null
                remoteAudioPlayer.srcObject = remoteAudioStream[connId]
                remoteAudioPlayer.load()
            }
        })

        peersConnectionId[connId] = connId
        peersConnection[connId] = connection

        if(videoSt === videoStates.Camera || videoStates === videoStates.ScreenShare){
            if(videoCameraTrack){
                console.log("got it");
                updateMediaSenders(videoCameraTrack, rtpVideoSenders)
            }
        }
        
        return connection
    }

    const setOffer = async(connId) => {
        let connection = peersConnection[connId]

        let offer = await connection.createOffer();

        await connection.setLocalDescription(offer);

        serverProcess(
            JSON.stringify({
            offer: connection.localDescription
            }), 
            connId
        )
    }

    const SDPProcess = async(message,fromConnId) => {
        message = JSON.parse(message);
        if(message.answer){
            await peersConnection[fromConnId].setRemoteDescription(new RTCSessionDescription(message.answer))
        }else if(message.offer){
            if(!peersConnection[fromConnId]){
                await setConnection(fromConnId)
            }
            await peersConnection[fromConnId].setRemoteDescription(new RTCSessionDescription(message.offer))
            let answer = await peersConnection[fromConnId].createAnswer()
            await peersConnection[fromConnId].setLocalDescription(answer)
            serverProcess(JSON.stringify({
                answer
            }), fromConnId)
        }else if(message.icecandidate){
            if(!peersConnection[fromConnId]){
                await setConnection(fromConnId)
            }
            try {
                await peersConnection[fromConnId].addIceCandidate(message.icecandidate);
            } catch (error) {
                console.error(error)
            }
        }
    }

    return {
        setNewConnection: async(connId)=>{
            await setConnection(connId)
        },
        init: async(SDPFunction,myConnId) => {
            await _init(SDPFunction, myConnId)
        },
        processClientFunc: async(data,fromConnId)=>{
            await SDPProcess(data,fromConnId)
        }
    }
})();

const myApp = (function(){
    let socket = null
    let userId = "";
    let meetingId = "";
    const init = (uid, mid) => {
        userId = uid
        meetingId = mid
        $("#meetingContainer").show();
        $("#me h2").text(userId + "(Me)");
        document.title = userId
        eventProccessForSignalingServer()
    }
    
    const eventProccessForSignalingServer = () => {
        socket = io.connect();

        const SDPFunction = (data, toConnId) => {
            socket.emit("SDPProcess", {
                message: data,
                toConnId
            })
        }

        socket.on("connect", ()=>{
            if(socket.connected){
                appProcess.init(SDPFunction, socket.id)
                if(userId && meetingId){
                    socket.emit("user-connect", {
                        displayName: userId,
                        meetingId
                    })
                }
            }
        });

        socket.on("informNewUser", (data)=>{
            addUser(data.otherUserId, data.connId);
            appProcess.setNewConnection(data.connId);
            //console.log("manyy");
            //console.log(data.otherUserId);
        })
        
        socket.on("informMeToOtherUser", (otherUser)=>{
            if(otherUser){
                console.log("ciao : ", otherUser );
                for(let i = 0; i<otherUser.length; i++){
                    addUser(otherUser[i].userId, otherUser[i].connectionId);
                    appProcess.setNewConnection(otherUser[i].connectionId)
                    //console.log(otherUser[i].userId);
                    //console.log("ciao");
                }
            }
        })

        socket.on("SDPProcess", async(data)=>{
            await appProcess.processClientFunc(data.message, data.fromConnId)
        })
    }

    const addUser = (otherUserId, connId) => {
        let newDivId = $("#otherTemplate").clone()
        newDivId = newDivId.attr("id", connId).addClass("other");
        newDivId.find("h2").text(otherUserId)
        newDivId.find("video").attr("id", `v_${connId}`)
        newDivId.find("audio").attr("id", `a_${connId}`)
        newDivId.show()
        $("#divUsers").append(newDivId)
    }


    return {
        _init: function(uid,mid){
            init (uid, mid)
        }
    }
})();

