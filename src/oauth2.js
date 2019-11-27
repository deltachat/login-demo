var bodyParser = require('body-parser');
var { Router } = require('express');
var OAuthServer = require('express-oauth-server');
var { asyncMiddleware } = require('./util');

const clients = [{ clientId: 'jkierjlwerWE', clientSecret: 'SGJKrJKIwdJKI4T908834njkfIO', redirectUris: ['https://support.delta.chat/'] }]

//DB-----------------------------
const Sequelize = require('sequelize');
//https://sequelize.org/v5/manual

const path = require('path')
const sequelize = new Sequelize(`sqlite:${path.resolve(path.join(__dirname, '../data/oauth2db.sqlite'))}`)
const Model = Sequelize.Model;

class AuthorizationCode extends Model { }
AuthorizationCode.init({
    authorization_code: {
        type: Sequelize.STRING,
        allowNull: false
    },
    expires_at: Sequelize.DATE,
    redirect_uri: Sequelize.STRING,
    scope: Sequelize.STRING,
    client_id: Sequelize.INTEGER,
    user_id: Sequelize.INTEGER
}, {
    sequelize,
    modelName: 'authorizationcode'
    // options
})

class AccessToken extends Model { }
AccessToken.init({
    access_token: Sequelize.STRING,
    expires_at: Sequelize.DATE,
    scope: Sequelize.STRING,
    client_id: Sequelize.INTEGER,
    user_id: Sequelize.INTEGER
}, {
    sequelize,
    modelName: 'authorizationcode'
    // options
})



var tokens = [];




//end_DB-----------------------------

var router = Router();
router.oauth = new OAuthServer({
    model: {
        getClient: function (clientId, clientSecret) {
            var clients = this.clients.filter(function (client) {
                return client.clientId === clientId && client.clientSecret === clientSecret;
            });

            return clients.length ? clients[0] : false;
        },
        saveAuthorizationCode: function (code, client, user) {
            // imaginary DB queries
            let authCode = {
                authorization_code: code.authorizationCode,
                expires_at: code.expiresAt,
                redirect_uri: code.redirectUri,
                scope: code.scope,
                client_id: client.id,
                user_id: user.id
            };
            //TODO

            return {
                authorizationCode: authorizationCode.authorization_code,
                expiresAt: authorizationCode.expires_at,
                redirectUri: authorizationCode.redirect_uri,
                scope: authorizationCode.scope,
                client: { id: authorizationCode.client_id },
                user: { id: authorizationCode.user_id }
            };

        },
        authCode: function (accessToken) {


        }
    },
});

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));


router.get('/', function (req, res) {
    res.send('oauth2 backend ist here, but you need to specify further what you want from me.');
});

router.use('/authorize', router.oauth.authorize(), function (req, res) {
    res.send('Secret area - authorize');
});

router.use('/authenticate', router.oauth.authenticate()
    // , function (req, res) {
    //     res.send('Secret area - authenticate');
    // }
);

router.use('/token', router.oauth.token());


exports.router = router;