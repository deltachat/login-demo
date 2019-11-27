
const clients = [{
    clientId: 'jkierjlwerWE',
    clientSecret: 'SGJKrJKIwdJKI4T908834njkfIO',
    redirectUris: ['https://support.delta.chat/']
}]

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

function getAccessToken(accessToken) {
    // imaginary DB queries
    db.queryAccessToken({ access_token: accessToken })
        .then(function (token) {
            return Promise.all([
                token,
                db.queryClient({ id: token.client_id }),
                db.queryUser({ id: token.user_id })
            ]);
        })
        .spread(function (token, client, user) {
            return {
                accessToken: token.access_token,
                accessTokenExpiresAt: token.expires_at,
                scope: token.scope,
                client: client, // with 'id' property
                user: user
            };
        });
}

function getRefreshToken(refreshToken) {
    // imaginary DB queries
    db.queryRefreshToken({ refresh_token: refreshToken })
        .then(function (token) {
            return Promise.all([
                token,
                db.queryClient({ id: token.client_id }),
                db.queryUser({ id: token.user_id })
            ]);
        })
        .spread(function (token, client, user) {
            return {
                refreshToken: token.refresh_token,
                refreshTokenExpiresAt: token.expires_at,
                scope: token.scope,
                client: client, // with 'id' property
                user: user
            };
        });
}

function getAuthorizationCode(authorizationCode) {
    // imaginary DB queries
    db.queryAuthorizationCode({ authorization_code: authorizationCode })
        .then(function (code) {
            return Promise.all([
                code,
                db.queryClient({ id: code.client_id }),
                db.queryUser({ id: code.user_id })
            ]);
        }).spread(function (code, client, user) {
            return {
                code: code.authorization_code,
                expiresAt: code.expires_at,
                redirectUri: code.redirect_uri,
                scope: code.scope,
                client: client, // with 'id' property
                user: user
            };
        });
}

function getClient(clientId, clientSecret) {
    var clients = this.clients.filter(function (client) {
        return client.clientId === clientId && client.clientSecret === clientSecret;
    });

    return clients.length ? clients[0] : false;
}

function getUser(username, password) {
    // imaginary DB query
    return db.queryUser({ username: username, password: password });
}

function getUserFromClient(client) {
    // imaginary DB query
    return db.queryUser({ id: client.user_id });
}
function saveToken(token, client, user) {
    // imaginary DB queries
    let fns = [
        db.saveAccessToken({
            access_token: token.accessToken,
            expires_at: token.accessTokenExpiresAt,
            scope: token.scope,
            client_id: client.id,
            user_id: user.id
        }),
        db.saveRefreshToken({
            refresh_token: token.refreshToken,
            expires_at: token.refreshTokenExpiresAt,
            scope: token.scope,
            client_id: client.id,
            user_id: user.id
        })
    ];
    return Promise.all(fns)
      .spread(function (accessToken, refreshToken) {
        return {
            accessToken: accessToken.access_token,
            accessTokenExpiresAt: accessToken.expires_at,
            refreshToken: refreshToken.refresh_token,
            refreshTokenExpiresAt: refreshToken.expires_at,
            scope: accessToken.scope,
            client: { id: accessToken.client_id },
            user: { id: accessToken.user_id }
        };
    });
}
function saveAuthorizationCode(code, client, user) {
    // imaginary DB queries
    let authCode = {
        authorization_code: code.authorizationCode,
        expires_at: code.expiresAt,
        redirect_uri: code.redirectUri,
        scope: code.scope,
        client_id: client.id,
        user_id: user.id
    };
    return db.saveAuthorizationCode(authCode)
        .then(function (authorizationCode) {
            return {
                authorizationCode: authorizationCode.authorization_code,
                expiresAt: authorizationCode.expires_at,
                redirectUri: authorizationCode.redirect_uri,
                scope: authorizationCode.scope,
                client: { id: authorizationCode.client_id },
                user: { id: authorizationCode.user_id }
            };
        });
}
function revokeToken(token) {
    // imaginary DB queries
    return db.deleteRefreshToken({ refresh_token: token.refreshToken })
        .then(function (refreshToken) {
            return !!refreshToken;
        });
}
function revokeAuthorizationCode(code) {
    // imaginary DB queries
    return db.deleteAuthorizationCode({ authorization_code: code.authorizationCode })
        .then(function (authorizationCode) {
            return !!authorizationCode;
        });
}  

// export