const express = require('express');

/**
 * 
 * @param {express.RequestHandler} fn 
 */
const asyncMiddleware = fn =>
    (req, res, next) => {
        Promise.resolve(fn(req, res, next))
            .catch(next);
    };

const timestamp = function () {
	var now = new Date();
	return "[".concat(now.toLocaleString("en-US"), "]");
    };

module.exports = {
    asyncMiddleware,
    timestamp
}
