const config = require('./config')
const DeltaChat = require('deltachat-node')
const C = require('deltachat-node/constants')
const path = require('path')

let listeners = []
global.listeners = listeners
function listenOnGroupchange(id, cb) {
    listeners.push({ id, cb })
}
function onGroupChange(id, newContactId) {
    const i = listeners.findIndex(({ id }) => id === id)
    if (i !== -1) {
        const cb = listeners[i].cb
        listeners.splice(i, 1)
        cb(newContactId)
    }
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
    console.log("got a message:", msg)

    switch (msg.getText()) {
        case '/publish':
            saveChat(chatId).then(_ => {
                console.log("saved chat", chatId);
                // TODO: send acknowledgement to group
            })
            break
        case '/unpublish':
            deleteChat(chatId).then(_ => {
                console.log("deleted chat", chatId);
                // TODO: send acknowledgement to group
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


dc.on('DC_EVENT_CHAT_MODIFIED', function (chat_id) {
    console.log(`Event Chat Modified for group ${chat_id}`)
    // Try 3 times with delay because deltachat might be slower updating the
    // group state than us.
    setTimeout(_ => {
        if (!findAndHandleContactId(chat_id)) {
            console.log("Trying again in 1s")
            setTimeout(_ => {
                if (!findAndHandleContactId(chat_id)) {
                    setTimeout(_ => {
                        if (!findAndHandleContactId(chat_id)) {
                            console.error("Error: could not find new contact id, cancelling!")
                        }
                    }, 1000)
                }
            }, 1000)
        }
    }, 1000)
})

function findAndHandleContactId(chat_id) {
    console.log("Looking to find a new contact id in the group")
    const contacts = dc.getChatContacts(chat_id)
    const newContactId = contacts.filter(cid => cid !== C.DC_CONTACT_ID_SELF)[0]
    console.log({ chat_id, contacts, newContactId })
    if (newContactId == null) {
        console.error("no new contact id found")
        return false
    }
    console.log(`found new contact id: ${newContactId}`)
    onGroupChange(chat_id, newContactId)
    // TODO: send notice to contact that they may delete this group now
    // TODO: remove self from group
    return true
}

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
    listenOnGroupchange
}
