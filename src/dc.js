const config = require('./config')
const DeltaChat = require('deltachat-node')
const C = require('deltachat-node/constants')
const path = require('path')

let listeners = []
global.listeners = listeners
function listenOnGroupchange(id, cb){
    listeners.push({id, cb})
}
function onGroupChange(id) {
    const i = listeners.findIndex(({id})=> id===id)
    if(i !== -1){
        const cb = listeners[i].cb
        listeners.splice(i, 1)
        cb()
    }
}

// Start DC
const dc = new DeltaChat()

const handleDCMessage = async (dc, chatId, msgId) => {
    // handle dc message
    
}

dc.on('DC_EVENT_MSGS_CHANGED', (chatId, msgId) => {
    // Deaddrop fix for bot, otherwise first message would be ignored
    const message = dc.getMessage(msgId)
    if (message && message.isDeadDrop()) {
        handleDCMessage(dc, dc.createChatByMessageId(msgId), msgId)
    }
})
dc.on('DC_EVENT_INCOMING_MSG', (...args) => handleDCMessage(dc, ...args))
// dc.on('ALL', console.log.bind(null, 'core |'))// for debugging


dc.on('DC_EVENT_CHAT_MODIFIED', function (chat_id) {
    console.log(chat_id)
    onGroupChange(chat_id)
})

dc.open(path.join(__dirname, '../data'), () => {
    if (!dc.isConfigured()) {
        dc.configure({
            addr: config.email_address,
            mail_pw: config.email_password,
            e2ee_enabled: false,
        })
    }
    console.log(console.log('init done'))
})

process.on('exit', () => {
    dc.close(() => {
        close_db()
    })
})

module.exports = {
    dc,
    listenOnGroupchange
}