'use strict';

// Created by Allen An at 2020/7/25

var express = require('express');
var app = express();

let test = require('./test');

var Logger = function (req, res, next) {
    console.log('MAIN')
    next()
}

app.use(Logger);


app.use('/test',test);
app.listen(3000);
