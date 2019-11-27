const bodyParser = require('body-parser');
const { Router } = require('express');
const { asyncMiddleware } = require('./util');
const { getEntry, getAuthCode, insertAuthCode } = require('./database');
const path = require('path');
const uuid = require('uuid/v4');
const config = require('./config')

const { dc } = require('./dc');

const router = Router();

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

const authGuard = asyncMiddleware(async function (req, res, next) {
    const entry = req.cookies.token && await getEntry(req.cookies.token)

    if (entry) {
        res.locals.contactId = entry.contactId;
        next();
    } else {
        res.sendFile(path.join(__dirname, '../web/new_user.html'));
    }
});

router.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({
        error: "A wild error appeared",
        error_description: err.message
    })
})

router.get('/', authGuard, function (req, res) {
    res.send('oauth2 backend ist here, but you need to specify further what you want from me.');
});

const client = config.client

router.all('/authorize', authGuard, asyncMiddleware(async function (req, res) {
    const params = Object.assign({}, req.body, req.query)
    console.log(params)

    const denied = new Error("Access Denied")

    // check client id
    if (
        params.client_id !== client.clientId
    ) {
        console.log("Unknown Client - auth")
        throw denied
    }

    if (!config.client.redirectUris.includes(params.redirect_uri)) {
        console.log("Forbidden redirect")
        throw denied
    }

    // todo GENERATE AND SAVE the auth code
    const auth_code = uuid().replace(/-/g,"")
    await insertAuthCode(auth_code, res.locals.contactId)

    res.redirect(`https://support.delta.chat/auth/oauth2_basic/callback?state=${params.state}&code=${auth_code}`)

}));

router.use('/token', asyncMiddleware(async function (req, res) {

    var params = Object.assign({}, req.body, req.query)

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




exports.router = router;