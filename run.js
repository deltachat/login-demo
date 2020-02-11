const { app } = require('./src/oauthApp')
const { log } = require('./src/util')
const server = require('http').createServer(app);

// Allow the app to run on a different port than 3000.
const port = process.env.PORT || 3000
// Start the web app.
server.listen(port, function () {
    log(`listening on *:${port}`);
});
