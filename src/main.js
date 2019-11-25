const config = require('./config')
const { dc, listenOnGroupchange } = require('./dc')
const path = require('path')
const C = require('deltachat-node/constants')
const uuid = require('uuid/v4');

const {
    insertEntry,
    getEntry,
    deleteEntry,
    getChat,
    getChats,
} = require('./database')


var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var ejs = require('ejs')
var qrcode_generator = require('qrcode')

const cookieParser = require("cookie-parser");
app.use(cookieParser());

const asyncMiddleware = fn =>
    (req, res, next) => {
        Promise.resolve(fn(req, res, next))
            .catch(next);
    };

app.get('/', asyncMiddleware(async function (req, res) {
    console.log(req.cookies.token)
    const entry = req.cookies.token && await getEntry(req.cookies.token)
    if (entry) {
        console.log("_>", entry)
        chatIds = await getChats() || []
        const content = await ejs.renderFile(
                path.join(__dirname, '../web/loggedin.ejs').toString(),
                {
                  address: dc.getContact(entry.contactId).toJson().address,
                  chats: chatIds.map(chatId => [chatId, dc.getChat(chatId).getName()]),
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
 
    if(entry){
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

    // configure dc work around
    socket.on('getQR', function (fn) {
        // Get QR code
        const login_group_id = dc.createUnverifiedGroupChat("login bot group")

        listenOnGroupchange(login_group_id, () => {
            console.log("hi")
            setTimeout(_=> {
                // find out which user is new in this chat
                const contacts = dc.getChatContacts(login_group_id)
                const newContactId = contacts
                    .filter(cid => cid !== C.DC_CONTACT_ID_SELF)[0]
                console.log({login_group_id, contacts, newContactId})
                const token = uuid()
                if(newContactId == null){
                    console.error("new Contact Id is null")
                    return;
                }
                insertEntry(token, newContactId).then(_ => {
                    console.log("emit verified");
                    // send token on verification
                    socket.emit("verified", token)
                })
            }, 1000)
        })
        const qr_data = dc.getSecurejoinQrCode(login_group_id)

        qrcode_generator.toDataURL(qr_data, function (err, url) {
          fn(url);
        })
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 3000

http.listen(PORT, function () {
    console.log(`listening on *:${PORT}`);
});



