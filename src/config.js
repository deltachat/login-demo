// Load config
var config = require('rc')("login-dc", {
    email_address: undefined,
    email_password: undefined,
    client: {
        clientId: undefined,
        clientSecret: undefined,
        redirectUris: undefined
    }
})

if (!config.email_address || !config.email_password) {
    console.error("Missing configuration: Email address or password is missing.")
    process.exit(1)
}

if (
    !config.client 
    || !config.client.clientId
    || !config.client.clientSecret
    || !config.client.redirectUris
    ) {
    console.error("Missing configuration: please add clientId, clientSecret, and/or redirectUris to ~/.login-dcrc")
    process.exit(1)
}

module.exports = config
