const { router } = require("./oauth2");

const config = require('./config')
const { dc, getNewContactInGroup } = require('./dc')
const path = require('path')
const C = require('deltachat-node/constants')
const uuid = require('uuid/v4');
const { asyncMiddleware } = require('./util');

const bodyParser = require('body-parser');

const {
    getChats,
	getAuthCode,
	insertAuthCode,
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
    path: '/',
    cookie: {
        httpOnly: false, // allow to use the cookie for JavaScript-requests, too.
        sameSite: true,
    }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/requestQR', asyncMiddleware(async function (req, res) {
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
	console.log("Storing contact ID in session")
        req.session.contactId = newContactId
	// Store also in locals, for oauth2
        //res.locals.contactId = newContactId
        res.send("OK")
    } else {
        res.send('Not yet...')
    }

}))



const ensureAuthenticated = function (req, res, next) {
    console.log("Checking authentication for request to ", req.path)
    if (!req.session.contactId) {
        console.log("Unauthenticated request, sending login page")
        res.sendFile(path.join(__dirname, '../web/new_user.html'))
    } else {
	console.log("Authenticated request, calling next()")
        next()
    }
}



app.get('/groups', ensureAuthenticated, asyncMiddleware(async function (req, res) {
    console.log("Request to /groups, session contactId:", req.session.contactId)
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
        res.redirect('/groups')
        return
    }

    // Shouldn't happen, but better check twice.
    if (!req.session.contactId) {
        console.log("Error: not contactId in session!")
        return res.redirect('/groups')
    }

    console.log(`Adding contact ${req.session.contactId} to group ${chatId}`);
    dc.addContactToChat(chatId, req.session.contactId)
    res.session.successMessage = `✓ You joined group ${chat.getName()}`
    res.redirect('/groups')
}));


const client = config.client

app.use('/oauth2/authorize', ensureAuthenticated, asyncMiddleware(async function (req, res) {
	console.log("Request to /oauth2/authorize")
    const params = Object.assign({}, req.body, req.query)
    console.log("params:", params)
    console.log("session:", req.session)

    const denied = new Error("Access Denied")

    // check client id
    if (params.client_id !== client.clientId) {
        console.log("Unknown Client - auth")
        throw denied
    }

    if (!config.client.redirectUris.includes(params.redirect_uri)) {
        console.log("Forbidden redirect")
        throw denied
    }

    // todo GENERATE AND SAVE the auth code
    const auth_code = uuid().replace(/-/g,"")
	console.log("inserting auth code")
    await insertAuthCode(auth_code, req.session.contactId)

	console.log("sending client back to callback")
    res.redirect(`https://support.delta.chat/auth/oauth2_basic/callback?state=${params.state}&code=${auth_code}`)

}));

app.use('/oauth2/token', asyncMiddleware(async function (req, res) {
	console.log("Request to /oauth2/token")

    var params = Object.assign({}, req.body, req.query)
	console.log("params:", params)

    if (req.headers.authorization) {
        const auth = Buffer.from(
            req.headers.authorization.replace(/^Basic /, ""),
            'base64'
            ).toString('ASCII').split(':')
        params.client_id = auth[0]
        params.client_secret = auth[1]
    }

    const denied = new Error("Access Denied")

    // check client secret
    if (
        params.client_id !== client.clientId
        || params.client_secret !== client.clientSecret
    ) {
        console.log("Unknown Client")
        throw denied
    }

    // no auth middle ware, just test for authcode and if its valid
    const authCode = params.code && await getAuthCode(params.code)
	console.log("authCode:", authCode)

    if (!authCode) {
        console.log("invalid access code")
        throw denied
    }

    // get userid from authcode
    const userId = authCode.contactId
    const user = dc.getContact(authCode.contactId).toJson()
    // generate token
    const token = uuid()

    res.json({
        access_token: token,
        info: {
            userid: `DeltaLoginUser${userId}`, // for linking with discourse
            username: user.address == user.displayName ? undefined : user.displayName,
            email: user.address,
        }
    })
}));

app.use('/oauth2', function (req, res) {
	res.send('What can I help you with?')
})

app.get('/', asyncMiddleware(async function (req, res) {
    res.send("What can I help you with?")
}));



app.get('/styles.css', (_req, res) => { res.sendFile(path.join(__dirname, '../web/styles.css')) })

const PORT = process.env.PORT || 3000

http.listen(PORT, function () {
    console.log(`listening on *:${PORT}`);
});
