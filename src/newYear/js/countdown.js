import { io } from "socket.io-client";

const destinationDate = import.meta.env.MODE === "development" ? (()=>{
    // let d = new Date()
    // d.setMinutes(d.getMinutes() + 3)
    return new Date(new Date().getFullYear()+1, 0, 1, 0, 0, 0)
})() : new Date(new Date().getFullYear()+1, 0, 1, 0, 0, 0);

//
// Audio section
//
const clockBongAudio = new Audio("/audio/clock_bong.mp3");
const clockAudios = new Array(3).fill(null).map((_,i) => {
    const a = new Audio(`/audio/clock_tick_${i+1}.mp3`)
    a.isLoaded = false
    a.addEventListener("loadeddata", () => a.isLoaded = true, {once: true})
    return a
});
let activeClockAudio = 0
/** Get loaded clock audio list */
const getLoadedClockAudio = () => clockAudios.filter(a => a.isLoaded)
/** Get next LOADED clock audio */
const getNextClockAudio = () => getLoadedClockAudio()[activeClockAudio++%getLoadedClockAudio().length]; 

/**
 * 
 * @param {Date} date Destination date for countdown
 * @returns {Object} {months, days, hours, minutes, seconds}
 */
const howMuchLeft = (date = new Date()) => {
    const diff = date.getTime() - Date.now();
    if(diff < 0) return {months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0};
    return {
        months: Math.floor(diff / 1000 / 60 / 60 / 24 / 30),
        days: Math.floor(diff / 1000 / 60 / 60 / 24) % 30,
        hours: Math.floor(diff / 1000 / 60 / 60) % 24,
        minutes: Math.floor(diff / 1000 / 60) % 60,
        seconds: Math.floor(diff / 1000) % 60,
        totalSeconds: Math.floor(diff / 1000)
    }
}

//
// Update section
//
const fireworksEl = document.getElementById("fireworks");
const newYear = () => {
    fireworksEl.classList.add('show')
    countdown.classList.remove("countdown-msg")
    clockBongAudio.play()
    for(let i = 0; i < 5; i++) appendMessage(createSystemMessage("Happy new year! ❤ ~kb"))
}
let isSongSynced = false
const startSongSync = () => {
    songEl.classList.add("shown")
    isSongSynced = true
    song.play()
}
const countdown = document.getElementById("countdown");
/** Update countdown with current time */
const updateClock = () => {
    const {months, days, hours, minutes, seconds, totalSeconds} = howMuchLeft(destinationDate);
    if (getLoadedClockAudio().length > 0) try{getNextClockAudio().play()}catch{}
    let cleared = false
    countdown.innerText = [months,days,hours,minutes,seconds].filter((n,_,a) => {
        if(a.every(n => n === 0)) return true
        if(n === 0 && !cleared) {
            return false
        } else {
            cleared = true
            return true
        }
    }).map(n => String(n).padStart(2, "0")).join(":");
    if(totalSeconds < 121 && !isSongSynced) startSongSync(totalSeconds)
    if([months, days, hours, minutes, seconds].every(n => n === 0)) {
        clearInterval(updateInterval)
        newYear()
    }
}

//
// Starting countdown
//
let updateInterval;
window.addEventListener("click", () => {
    countdown.classList.add("countdown-msg")
    updateClock()
    updateInterval = setInterval(updateClock, 1000)
}, {once: true})

//
// Emoji section
//
const chatInput = document.getElementById('chat-input')
document.getElementById('chat-emoji').addEventListener('click', () => {
    const emojiPicker = document.getElementById('chat-emoji-picker')
    emojiPicker.classList.toggle('shown')
    if(emojiPicker.classList.contains('shown')) emojiPicker.focus()
    else document.getElementById('chat-input').focus()
})

document.getElementById('chat-emoji-picker').addEventListener('emoji-click', event => chatInput.value += event.detail.unicode);

//
// Song sync section
//
let song;
let songEl = document.getElementById('spotify-song');
window.onSpotifyIframeApiReady = async (IFrameAPI) => {
    song = await new Promise(end => IFrameAPI.createController(songEl.querySelector('div'), {
        uri: "https://open.spotify.com/track/3MrRksHupTVEQ7YbA0FsZK?si=97e6d795d3ef4502"
    },end))
}

//
//Chat section
//
const chatMsgs = document.getElementById('chat-messages')
const createMessageElement = (name, msg, isSystem = false, isAdmin = false) => {
    const el = document.createElement('div')
    el.id = "chat-message"
    if (isSystem) el.classList.add("system")
    if (isAdmin) el.classList.add("admin")
    
    const n = document.createElement('span')
    if (name) {
        n.className = "name"
        n.innerText = name
    }

    const m = document.createElement('span')
    m.innerText = msg

    el.append(n,m)
    return el
}
const createSystemMessage = (msg, showName = true, additionalCSS) => {
    const s = createMessageElement(showName ? "System" : null, msg, true)
    if(additionalCSS) s.setAttribute("style", additionalCSS)
    return s
}
const appendMessage = (msgObj) => {
    const twemojified = twemoji.parse(msgObj.innerHTML, {folder: 'svg', ext: '.svg'})
    msgObj.innerHTML = twemojified
    chatMsgs.append(msgObj)
    if(chatMsgs.children.length > 100) chatMsgs.firstElementChild.remove()
    chatMsgs.scrollTop = chatMsgs.scrollHeight
}

const chatSend = document.getElementById('chat-send')
const chatUsers = document.getElementById('chat-users')
const socket = io((import.meta.env.MODE === "development" ? "//:3001" : "https://ws.kuba.lol:3001") + "/countdown", {
    "autoConnect": false,
});
socket.on("connect", () => appendMessage(createSystemMessage("Connected to chat!", false)))
socket.on("disconnect", () => {
    captchaScreen.classList.remove("shown")
    appendMessage(createSystemMessage("Disconnected.", false))
    chatInput.disabled = true
    chatSend.disabled = true
    chatUsername.disabled = true
    chatUsers.innerText = "OFFLINE"
    chatInput.setAttribute("placeholder", "[You need to connect to start chatting.]")
})
socket.io.on("reconnection_attempt", () => appendMessage(createSystemMessage("Disconnected, reconnecting. If you won't reconnect, refresh the page.", false)))
socket.on('chat', msgInfo => {
    const msgObject = !msgInfo.isSystem ? createMessageElement(msgInfo.name, msgInfo.msg, false, msgInfo.isAdmin) : createSystemMessage(msgInfo.msg, msgInfo.name !== null)
    appendMessage(msgObject)
})
socket.on("clear", () => chatMsgs.innerHTML = "")
socket.on('ready', readyInfo => {
    chatUsers.innerText = readyInfo.clientsCount
    chatInput.disabled = false
    chatSend.disabled = false
    chatUsername.disabled = false
    captchaScreen.classList.remove("shown")
    chatInput.setAttribute("placeholder", "Enter your message here")
    if(localStorage.getItem('name')) updateName(localStorage.getItem('name'))
})
const updateName = name => {
    socket.emit('name', name)
    localStorage.setItem('name', name)
}
const chatUsername = document.getElementById("chat-username")
chatUsername.addEventListener('click', () => updateName(prompt("Enter your new username:")))

socket.on('update', updateInfo => {
    chatUsers.innerText = updateInfo.clientsCount
})

socket.on("kick", reason => {
    appendMessage(createSystemMessage(`You've been kicked for: "${reason}".`, false, "color:red;"))
})

const chatPin = document.getElementById('chat-pin')
const chatEl = document.getElementById('chat')
chatEl.addEventListener('mouseenter', () => socket.connect(), {once: true})
chatPin.addEventListener('click', () => {
    chatEl.classList.toggle("pinned")
    chatPin.title = chatEl.classList.contains("pinned") ? "Unpin" : "Pin"
})

let lastMessages = []; let pickedMessage = -1;
const chatMessage = (msg) => {
    if(!socket.connected) return alert("Connection failed. Please refresh the page and try again.")
    lastMessages.push(msg)
    if(lastMessages.length > 10) lastMessages.shift()
    if(msg.startsWith("/")) {
        let cmd = msg.split(" ")[0].substring(1)
        let args = msg.split(" ").slice(1)
        socket.emit("cmd", cmd, args)
        return
    }
    socket.emit('chat', msg)
}

const prepareSendMessage = () => {
    const msg = chatInput.value.trim().substring(0, 100)
    if(msg.length === 0) return
    chatMessage(msg)
    chatInput.value = ""
}

const awaitFor = async (statement = () => true) => {
    while(!statement()) await new Promise(resolve => setTimeout(resolve, 100))
}

const captchaScreen = document.getElementById("captchaScreen")
captchaScreen.addEventListener("click", () => {
    socket.disconnect()
})

let captchaAlreadyRendered = false
const renderCaptcha = () => {
    const captchaContainer = document.getElementById("captcha-container")
    if(!captchaAlreadyRendered) grecaptcha.render(captchaContainer, {
        sitekey: "6LeAOj0pAAAAAHFu0kZ6JK8olJ90oRIELFiwyXVd",
        theme: "dark",
        callback: (token) => {
            socket.emit("heresyourcaptcha", token)
            captchaScreen.classList.remove("shown")
            captchaAlreadyRendered = true
        }
    })
    else grecaptcha.reset()
    captchaScreen.classList.add("shown")
}

socket.on("ineedcaptcha", async () => {
    if (!window.recaptchaReady) await awaitFor(() => window.recaptchaReady)
    renderCaptcha()
})

chatSend.addEventListener('click', prepareSendMessage)
chatInput.addEventListener('keydown', event => {
    switch(event.key){
        case "Enter": {
            pickedMessage = -1
            prepareSendMessage();
            break;
        }
        case "ArrowUp":
            if(pickedMessage === lastMessages.length - 1) break
            pickedMessage = pickedMessage + 1
            chatInput.value = lastMessages[pickedMessage]
            break
        case "ArrowDown":
            if(pickedMessage <= 0) break
            pickedMessage = pickedMessage - 1
            chatInput.value = lastMessages[pickedMessage]
            break
    }
})
