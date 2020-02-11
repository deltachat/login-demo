const config = require('./config')
const DeltaChat = require('deltachat-node')
const C = require('deltachat-node/constants')
const path = require('path')
const { log } = require('./util')

const {
    saveChat,
    deleteChat
} = require('./database')

// Start the DC core engine (threads etc.).
const dc = new DeltaChat()

/**
 * Helper to get the ID of the new contact in the group. Implemented here
 * because is uses DC constants.
 */
const getNewContactInGroup = (chat_id) => {
    const contacts = dc.getChatContacts(chat_id)
    return contacts.filter(cid => cid !== C.DC_CONTACT_ID_SELF)[0]
}

/**
 * This function handles incoming messages that we might want to work with. It
 * is called from the event listeners (see below).
 */
const handleDCMessage = async (dc, chatId, msgId) => {
    var msg = dc.getMessage(msgId)
    log(`Got a message for chat ${chatId}: ${msg.getText()}`)
    
    switch (msg.getText()) {
      case '/publish':
        log("Saving chat as public group")
        saveChat(chatId).then(_ => {
            log("Saved chat, sending acknowledging message", chatId);
            dc.sendMessage(chatId, "OK, chat was opened to public subscription through the web login app. ✓")
        })
        break
      case '/unpublish':
        log("Deleting chat from public groups")
        deleteChat(chatId).then(_ => {
            log("Deleted chat, sending acknowledging message", chatId);
            dc.sendMessage(chatId, "OK, chat was removed from public subscription. ✓")
        })
        break
    }

}

/**
 * Listen to event about incoming messages, and hand the payload over to the
 * handling function.
 */
dc.on('DC_EVENT_INCOMING_MSG', (...args) => handleDCMessage(dc, ...args))

/**
 * Listen to this event, too, in order to not miss messages from a completely
 * unknown sender.
 * This works around the behaviour of deltachat-core-rust that doesn't fire the
 * event DC_EVENT_INCOMING_MSG if the sender is unknown to the client (the core
 * considers this message to be part of the "deaddrop").
 */
dc.on('DC_EVENT_MSGS_CHANGED', (chatId, msgId) => {
    const message = dc.getMessage(msgId)
    if (message && message.isDeadDrop()) {
        handleDCMessage(dc, dc.createChatByMessageId(msgId), msgId)
    }
})

// To log all events uncomment the next line.
//dc.on('ALL', log.bind(null, 'core |'))

/**
 * Initialize the app, open the database.
 */
dc.open(path.join(__dirname, '../data'), () => {
    if (!dc.isConfigured()) {
        dc.configure({
            addr: config.email_address,
            mail_pw: config.email_password,
            e2ee_enabled: false,
        })
    }
    log('Initialization done')
})

/**
 * Close the database when the app exits.
 */
process.on('exit', () => {
    dc.close(() => {
        close_db()
    })
})

module.exports = {
    dc,
    getNewContactInGroup
}
