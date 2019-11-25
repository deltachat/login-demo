const config = require('./config')
const { dc, listenOnGroupchange } = require('./dc')
const path = require('path')
const C = require('deltachat-node/constants')
const uuid = require('uuid/v4');

const {
    insertEntry
} = require('./database')


var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var ejs = require('ejs')

app.get('/', function (req, res) {
    // req.cookies
    // if logged in
    // res.sendFile(
    //     ejs.renderFile(
    //         path.join(__dirname, '../web/new_user.html'),
    // {address: dc.getContact(newContactId).toJson().address}
    //     )
    // );
    // else
    res.sendFile(path.join(__dirname, '../web/new_user.html'));
});

io.on('connection', function (socket) {
    console.log('a user connected');

    // configure dc work around
    socket.on('getQR', function (fn) {
        // Get QR code
        const login_group_id = dc.createUnverifiedGroupChat("login bot group")
        
        listenOnGroupchange(login_group_id, () => {
            console.log("hi")
            // find out which user is new in this chat
            const newContactId = dc.getChatContacts(login_group_id)
                .filter(cid => cid !== C.DC_CONTACT_ID_SELF)[0]
            console.log(login_group_id, newContactId)
            
            const token = uuid()
            insertEntry(token, newContactId).then(_ => {
                // send token on verification
                socket.emit("verified", token)
            })
        })
        const qr_data = dc.getSecurejoinQrCode(login_group_id)
        fn(qr_data);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 3000

http.listen(PORT, function () {
    console.log(`listening on *:${PORT}`);
});



