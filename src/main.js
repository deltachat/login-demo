const { router } = require("./oauth2");

const config = require('./config')
const { dc, listenOnGroupchange } = require('./dc')
const path = require('path')
const C = require('deltachat-node/constants')
const uuid = require('uuid/v4');
const { asyncMiddleware } = require('./util');

const {
    insertEntry,
    getEntry,
    deleteEntry,
    getChat,
    getChats,
} = require('./database')


const app = require('express')();
exports.app = app;
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const ejs = require('ejs')
const qrcode_generator = require('qrcode')

const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.get('/', asyncMiddleware(async function (req, res) {
    console.log(req.cookies.token)
    const entry = req.cookies.token && await getEntry(req.cookies.token)
    if (entry) {
        console.log("_>", entry)
        let chatIds = await getChats() || []
        let chats = chatIds.map(chatId => {
            return {
                "chatId": chatId,
                "chatName": dc.getChat(chatId).getName(),
                "already_joined": dc.isContactInChat(chatId, entry.contactId)
            }
        })

        const content = await ejs.renderFile(
            path.join(__dirname, '../web/loggedin.ejs').toString(),
            {
                address: dc.getContact(entry.contactId).toJson().address,
                chats: chats,
                successMessage: req.cookies.successMessage
            }
        )
        res.clearCookie('successMessage')
        res.send(content)
    } else {
        res.sendFile(path.join(__dirname, '../web/new_user.html'));
    }
}));


app.get('/logout', asyncMiddleware(async function (req, res) {
    const entry = req.cookies.token && await getEntry(req.cookies.token)

    if (entry) {
        await deleteEntry(req.cookies.token)
    }

    res.clearCookie('token')
    res.redirect('/');
}));


app.get('/joinGroup/:chatId', asyncMiddleware(async function (req, res) {
    const chatId = req.params.chatId
    const chat = chatId && dc.getChat(chatId)
    const login = req.cookies.token && await getEntry(req.cookies.token)

    if (chat && login) {
        console.log(`Adding contact ${login.contactId} to group ${chatId}`);
        dc.addContactToChat(chatId, login.contactId)
        res.cookie('successMessage', `✓ You joined group ${chat.getName()}`)
    }
    res.redirect('/')
}));


io.on('connection', function (socket) {
    console.log('a user connected');
    var login_token;

    // configure dc work around
    socket.on('getQR', (fn) => {
        const s = socket;  // voodoo to trick the garbage collector
        // Get QR code
        let group_name = `LoginBot group (${uuid().slice(0, 4)})`
        const login_group_id = dc.createUnverifiedGroupChat(group_name)

        listenOnGroupchange(login_group_id, (newContactId) => {
            console.log("new contact was added to group, saving token into DB")
            const token = uuid()
            insertEntry(token, newContactId).then(_ => {
                console.log("notifying socket about verified token")
                // send token on verification. toString() apparently helps to
                // avoid garbage collection of the token.
                login_token = token.toString()
                s.emit("verified", login_token)
            }, console.error)
        })

        const qr_data = dc.getSecurejoinQrCode(login_group_id)
        qrcode_generator.toDataURL(qr_data, function (err, url) {
            fn(url, qr_data);
        })
    });

    socket.on('poll', function () {
        if (login_token) {
            s.emit("verified", login_token)
        }
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});

app.use('/oauth2', router)

app.get('/styles.css',(_req, res)=>{res.sendFile(path.join(__dirname, '../web/styles.css'))} )

const PORT = process.env.PORT || 3000

http.listen(PORT, function () {
    console.log(`listening on *:${PORT}`);
});

