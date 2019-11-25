var sqlite3 = require('sqlite3').verbose();
const path = require('path')

/** @type {import('sqlite3').Database} */
var db;

function init_db(filename) {
    db = new sqlite3.Database(filename);
    db.serialize(function () {
        db.run("CREATE TABLE IF NOT EXISTS logins (sessionToken TEXT PRIMARY KEY, contactId INTEGER);");
        db.run("CREATE TABLE IF NOT EXISTS groups (chatId INTEGER PRIMARY KEY);");
    })
}


/**
 *
 * @param {number} chatId
 */
async function deleteChat(chatId) {
    return await new Promise((res, rej) => {
        db.run("DELETE FROM groups WHERE chatId = $chatId;", {
            $chatId: chatId
        }, (err) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        });
    });
}

/**
 *
 * @param {number} chatId
 */
async function saveChat(chatId) {
    return await new Promise((res, rej) => {
        db.run("INSERT INTO groups (chatId) VALUES ($chatId);", {
            $chatId: chatId
        }, (err) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        });
    });
}

/**
 *
 */
async function getChats() {
    return await new Promise((res, rej) => {
        db.all(`SELECT chatId FROM groups`, {}, (err, result) => {
            if (err) {
                rej(err);
            } else {
                const chatIds = result.map(obj => obj.chatId)
                res(chatIds);
            }
        });
    });
}

/**
 * 
 * @param {string} sessionToken
 */
async function getEntry(sessionToken) {
    return await new Promise((res, rej) => {
        db.get(`SELECT * FROM logins WHERE sessionToken = $sessionToken `,{
            $sessionToken: sessionToken
        }, (err, result) => {
            if (err) {
                rej(err);
            } else {
                res(result);
            }
        });
    });
}

/**
 * 
 * @param {string} sessionToken 
 * @param {number} contactId 
 */
async function insertEntry(sessionToken, contactId) {
    return await new Promise((res, rej) => {
        db.run("INSERT INTO logins (sessionToken, contactId) VALUES ($sessionToken, $contactId)", {
            $sessionToken: sessionToken,
            $contactId: contactId,
        }, (err) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        });
    });
}

/**
 * 
 * @param {string} sessionToken 
 */
async function deleteEntry(sessionToken) {
    return await new Promise((res, rej) => {
        db.run("DELETE FROM logins WHERE sessionToken = $sessionToken", {
            $sessionToken: sessionToken
        }, (err) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        });
    });
}

function close_db() {
    db.close();
}

process.on('exit', () => {
    db.close();
})

init_db(path.join(__dirname, '../data/database.sqlite'))

module.exports = {
    getEntry,
    insertEntry,
    deleteEntry,
    getChats,
    saveChat,
    deleteChat
}
