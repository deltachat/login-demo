/**
 * Set up the app.
 */
const app = require('express')();
const session = require('express-session');
const bodyParser = require('body-parser');
const qrcode_generator = require('qrcode')
const path = require('path')
const uuid = require('uuid/v4');
const { dc, getNewContactInGroup } = require('./dc')
const { asyncMiddleware, log } = require('./util');

/**
 * Set up the session middleware.
 */
app.use(session({
    secret: uuid(), // Use a new secret on every startup of the app.
    saveUninitialized: true, // Also save the session object if it hasn't any values yet.
    resave: false,
    name: 'delta-login-session',
    path: '/',
    cookie: {
        httpOnly: false, // Allow to use the cookie for JavaScript-requests, too.
        sameSite: true,
    }
}));

/**
 * Tell the app to parse the request body.
 */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/**
 * Send the QR-code to the browser.
 */
app.get('/requestQR', asyncMiddleware(async function (req, res) {
    log("session:", req.session)
    const group_name = `LoginBot group (${uuid().slice(0, 4)})`
    log("new group name:", group_name)
    const group_id = dc.createUnverifiedGroupChat(group_name)
    log("new group_id:", group_id)
    const qr_data = dc.getSecurejoinQrCode(group_id)
    const qr_code_data_url = await qrcode_generator.toDataURL(qr_data)
    req.session.groupId = group_id
    res.json({ qr_code_data_url, qr_data })
}))

/**
 * Tell the browser if the user is known already (aka group-join has happend).
 */
app.get('/checkStatus', asyncMiddleware(async function (req, res) {
    if (!req.session.groupId) {
        return res.sendStatus(401)
    }
    log("Looking for new contact in group", req.session.groupId)
    let newContactId = getNewContactInGroup(req.session.groupId)
    log("newContactId in group:", newContactId)
    if (newContactId) {
        log("Storing contact ID in session")
        req.session.contactId = newContactId
        res.send("OK")
    } else {
        res.send('Not yet...')
    }

}))

/**
 * Middleware that responds with the login page (which will show the QR code)
 * if the user isn't known yet. If the user is known (aka the group-join has
 * happened), the next middleware in the stack is called ("next()").
 */
const ensureAuthenticated = function (req, res, next) {
    log("Checking authentication for request to ", req.baseUrl)
    if (!req.session.contactId) {
        log("Unauthenticated request, sending login page")
        res.sendFile(path.join(__dirname, '../web/login.html'))
    } else {
        log("Authenticated request, calling next()")
        next()
    }
}

// Serve the CSS.
app.get('/styles.css', (_req, res) => { res.sendFile(path.join(__dirname, '../web/styles.css')) })

module.exports = {
  app,
  ensureAuthenticated
}
