const config = require('./config')
const DeltaChat = require('deltachat-node')
const C = require('deltachat-node/constants')
const path = require('path')

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
    console.log(`Got a message for chat ${chatId}: ${msg.getText()}`)
    
    switch (msg.getText()) {
      case '/publish':
        console.log("Saving chat as public group")
        saveChat(chatId).then(_ => {
            console.log("Saved chat, sending acknowledging message", chatId);
            dc.sendMessage(chatId, "OK, chat was opened to public subscription through the web login app. ✓")
        })
        break
      case '/unpublish':
        console.log("Deleting chat from public groups")
        deleteChat(chatId).then(_ => {
            console.log("Deleted chat, sending acknowledging message", chatId);
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


dc.on('DC_EVENT_SECUREJOIN_MEMBER_ADDED', function (chat_id, contact_id) {
    console.log(`Group ${chat_id} was successfully created and joined by contact ${contact_id}`)
    console.log(`Sending you-may-leave-message to chat ${chat_id}`)
    dc.sendMessage(chat_id, "You may leave and remove this chat now.")
    console.log(`Leaving chat ${chat_id}`)
    dc.removeContactFromChat(chat_id, C.DC_CONTACT_ID_SELF)
    console.log(`Deleting chat ${chat_id}`)
    dc.deleteChat(chat_id)
})

dc.open(path.join(__dirname, '../data'), () => {
    if (!dc.isConfigured()) {
        dc.configure({
            addr: config.email_address,
            mail_pw: config.email_password,
            e2ee_enabled: false,
        })
    }
    console.log('init done')
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
