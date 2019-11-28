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

module.exports = {
    asyncMiddleware
}