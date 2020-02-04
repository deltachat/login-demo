const config = require('./config')
const DeltaChat = require('deltachat-node')
const C = require('deltachat-node/constants')
const path = require('path')
const { timestamp } = require('./util')

function getNewContactInGroup(chat_id) {
    const contacts = dc.getChatContacts(chat_id)
    return contacts.filter(cid => cid !== C.DC_CONTACT_ID_SELF)[0]
}

const {
    saveChat,
    deleteChat
} = require('./database')


// Start DC
const dc = new DeltaChat()

const handleDCMessage = async (dc, chatId, msgId) => {
    // handle dc message
    var msg = dc.getMessage(msgId)
    console.log(timestamp(), `Got a message for chat ${chatId}: ${msg.getText()}`)
    
    switch (msg.getText()) {
      case '/publish':
        console.log(timestamp(), "Saving chat as public group")
        saveChat(chatId).then(_ => {
            console.log(timestamp(), "Saved chat, sending acknowledging message", chatId);
            dc.sendMessage(chatId, "OK, chat was opened to public subscription through the web login app. ✓")
        })
        break
      case '/unpublish':
        console.log(timestamp(), "Deleting chat from public groups")
        deleteChat(chatId).then(_ => {
            console.log(timestamp(), "Deleted chat, sending acknowledging message", chatId);
            dc.sendMessage(chatId, "OK, chat was removed from public subscription. ✓")
        })
        break
    }

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


dc.open(path.join(__dirname, '../data'), () => {
    if (!dc.isConfigured()) {
        dc.configure({
            addr: config.email_address,
            mail_pw: config.email_password,
            e2ee_enabled: false,
        })
    }
    console.log(timestamp(), 'init done')
})

process.on('exit', () => {
    dc.close(() => {
        close_db()
    })
})

module.exports = {
    dc,
    getNewContactInGroup
}
