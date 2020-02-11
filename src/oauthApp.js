const session = require('express-session');
const uuid = require('uuid/v4');
const { app, ensureAuthenticated } = require('./basicApp')
const { asyncMiddleware, log } = require('./util');
const dc = require('./dc')
const {
    getAuthCode,
    insertAuthCode,
} = require('./database')
const config = require('./config')

const client = config.client

app.use('/oauth2/authorize', ensureAuthenticated, asyncMiddleware(async function (req, res) {
    log("Request to /oauth2/authorize")
    const params = Object.assign({}, req.body, req.query)
    log("params:", params)
    log("session:", req.session)

    const denied = new Error("Access Denied")

    // check client id
    if (params.client_id !== client.clientId) {
        log("Unknown Client - auth")
        throw denied
    }

    if (!config.client.redirectUris.includes(params.redirect_uri)) {
        log("Forbidden redirect")
        throw denied
    }

    // todo GENERATE AND SAVE the auth code
    const auth_code = uuid().replace(/-/g,"")
    log("inserting auth code")
    await insertAuthCode(auth_code, req.session.contactId)

    log("sending client back to callback")
    res.redirect(`${params.redirect_uri}?state=${params.state}&code=${auth_code}`)

}));

app.use('/oauth2/token', asyncMiddleware(async function (req, res) {
	log("Request to /oauth2/token")

    var params = Object.assign({}, req.body, req.query)
    log("params:", params)

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
        log("Unknown Client")
        throw denied
    }

    // no auth middle ware, just test for authcode and if its valid
    const authCode = params.code && await getAuthCode(params.code)
    log("authCode:", authCode)

    if (!authCode) {
        log("invalid access code")
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

module.exports = {
  app
}
