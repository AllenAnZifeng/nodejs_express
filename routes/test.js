'use strict';

// Created by Allen An at 2020/7/24

var express = require('express')
var router = express.Router()

var myLogger = function (req, res, next) {
    console.log('LOGGED')
    next()
}

var requestTime = function (req, res, next) {
    req.requestTime = Date.now()
    next()
}

router.use(myLogger)
router.use(requestTime)



router.get('/', function (req, res) {
    var responseText = 'Hello World!<br>'
    responseText += '<small>Requested at: ' + req.requestTime + '</small>'
    res.send(responseText)
})


module.exports = router;


