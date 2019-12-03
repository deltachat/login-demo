var sqlite3 = require('sqlite3').verbose();
const path = require('path')

/** @type {import('sqlite3').Database} */
var db;

function init_db(filename) {
    db = new sqlite3.Database(filename);
    db.serialize(function () {
        db.run("CREATE TABLE IF NOT EXISTS oauth2_authcodes (authcode TEXT PRIMARY KEY,contactId INTEGER);");
        db.run("CREATE TABLE IF NOT EXISTS published_groups (chatId INTEGER PRIMARY KEY);");
    })
}


/**
 *
 * @param {number} chatId
 */
async function deleteChat(chatId) {
    return await new Promise((res, rej) => {
        db.run("DELETE FROM published_groups WHERE chatId = $chatId;", {
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
        db.run("INSERT INTO published_groups (chatId) VALUES ($chatId);", {
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
        db.all(`SELECT chatId FROM published_groups`, {}, (err, result) => {
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
 * @param {string} authcode
 * @returns {{authcode:string, contactId:number}}
 */
async function getAuthCode(authcode) {
    return await new Promise((res, rej) => {
        db.get(`SELECT * FROM oauth2_authcodes WHERE authcode = $authcode `, {
            $authcode: authcode
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
 * @param {string} authcode 
 * @param {number} contactId 
 */
async function insertAuthCode(authcode, contactId) {
    return await new Promise((res, rej) => {
        db.run("INSERT INTO oauth2_authcodes (authcode, contactId) VALUES ($authcode, $contactId)", {
            $authcode: authcode,
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

function close_db() {
    db.close();
}

process.on('exit', () => {
    db.close();
})

init_db(path.join(__dirname, '../data/database.sqlite'))

module.exports = {
    getAuthCode,
    insertAuthCode,
    getChats,
    saveChat,
    deleteChat
}
