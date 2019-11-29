const { router } = require("./oauth2");

const config = require('./config')
const { dc, getNewContactInGroup } = require('./dc')
const path = require('path')
const C = require('deltachat-node/constants')
const uuid = require('uuid/v4');
const { asyncMiddleware } = require('./util');

const {
    getChats,
} = require('./database')


const app = require('express')();
exports.app = app;
const http = require('http').createServer(app);
const qrcode_generator = require('qrcode')
var ejs = require('ejs')
var session = require('express-session');

app.use(session({
    secret: uuid(), // use a new secret on every startup of the app
    saveUninitialized: true,
    resave: false,
    name: 'delta-login-session',
    cookie: {
        httpOnly: false, // allow to use the cookie for JavaScript-requests, too.
        sameSite: true,
    }
}));


app.get('/', asyncMiddleware(async function (req, res) {
    if (req.session.contactId) {
        return res.redirect('/dashboard')
    } else {
        res.sendFile(path.join(__dirname, '../web/new_user.html'))
    }
}));

app.get('/requestQR',asyncMiddleware(async function (req, res) {
    console.log("session:", req.session)
    const group_name = `LoginBot group (${uuid().slice(0, 4)})`
    console.log("new group name:", group_name)
    const group_id = dc.createUnverifiedGroupChat(group_name)
    console.log("new group_id:", group_id)
    const qr_data = dc.getSecurejoinQrCode(group_id)
    const qr_code_data_url = await qrcode_generator.toDataURL(qr_data)
    req.session.groupId = group_id
    res.json({ qr_code_data_url, qr_data })
}))

app.get('/checkStatus', asyncMiddleware(async function (req, res) {
    if (!req.session.groupId) {
        return res.redirect('/')
    }
    console.log("Looking for new contact in group", req.session.groupId)
    let newContactId = getNewContactInGroup(req.session.groupId)
    console.log("newContactId in group:", newContactId)
    if (newContactId) {
        req.session.contactId = newContactId
        res.send("OK")
    } else {
        res.send('Not yet...')
    }

}))



const ensureAuthenticated = function (req, res, next) {
    console.log("Checking authentication")
    if (!req.session.contactId) {
        console.log("Unauthenticated request, redirecting to /")
        return res.redirect('/')
    } else {
        next()
    }
}



app.get('/dashboard', ensureAuthenticated, asyncMiddleware(async function (req, res) {
    let contactId = req.session.contactId
    console.log(`Rendering dashboard for contactId ${contactId}`)
    let chatIds = await getChats() || []
    let chats = chatIds.map(chatId => {
        return {
            "chatId": chatId,
            "chatName": dc.getChat(chatId).getName(),
            "already_joined": dc.isContactInChat(chatId, contactId)
        }
    })

    const content = await ejs.renderFile(
        path.join(__dirname, '../web/loggedin.ejs').toString(),
        {
            address: dc.getContact(contactId).toJson().address,
            chats: chats,
            successMessage: req.session.successMessage
        }
    )
    req.session.successMessage = ''
    res.send(content)
}))


app.get('/logout', function (req, res, next) {
    req.session.destroy((err) => {
        if (err) throw err
        else next()
    })
}, function (req, res) {
    console.log("Session destroyed, redirecting to /")
    res.redirect('/')
});


app.get('/joinGroup/:chatId', ensureAuthenticated, asyncMiddleware(async function (req, res) {
    console.log("Request to joinGroup")
    const chatId = req.params.chatId
    const chat = chatId && dc.getChat(chatId)

    if (!chat) {
        console.log("The requested chat_id does not exist")
        res.session.successMessage = "You'd have to create that group first, please. It does not exist yet :)"
        res.redirect('/')
        return
    }

    // Shouldn't happen, but better check twice.
    if (!req.session.contactId) {
        console.log("Error: not contactId in session!")
        return res.redirect('/')
    }

    console.log(`Adding contact ${req.session.contactId} to group ${chatId}`);
    dc.addContactToChat(chatId, req.session.contactId)
    res.session.successMessage = `✓ You joined group ${chat.getName()}`
    res.redirect('/')
}));


app.use('/oauth2', router)

app.get('/styles.css', (_req, res) => { res.sendFile(path.join(__dirname, '../web/styles.css')) })

const PORT = process.env.PORT || 3000

http.listen(PORT, function () {
    console.log(`listening on *:${PORT}`);
});
