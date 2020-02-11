// Load config from config-file.
const appName = 'dc-login-bot'

var config = require('rc')(appName, {
    email_address: undefined,
    email_password: undefined,
    client: {
        clientId: undefined,
        clientSecret: undefined,
        redirectUris: undefined
    }
})

const configFile = config.config || `./.${appName}rc`
var configError = false

const checkPresenceInConfig = (key, value) => {
  if (!value) {
    console.error(`Missing configuration: Please add '${key}' to the config file ('${configFile}').`)
    configError = true
  }
}

checkPresenceInConfig('email_address', config.email_password)
checkPresenceInConfig('email_password', config.email_password)
checkPresenceInConfig('client.clientId', config.client.clientId)
checkPresenceInConfig('client.clientId', config.client.clientSecret)
checkPresenceInConfig('client.clientId', config.client.redirectUris)

if (configError === true) {
  process.exit(1)
}

module.exports = config
