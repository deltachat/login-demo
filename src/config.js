// Load config
var config = require('rc')("login-dc", {
    email_address: undefined,
    email_password: undefined,
})

if (!config.email_address || !config.email_password) {
    console.error("Email address or password is missing.")
    process.exit(1)
}

module.exports = config