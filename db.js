'use strict';

// Created by Allen An at 2020/7/31
let sqlite3 = require('sqlite3').verbose();


let db = new sqlite3.Database('./users.db');
module.exports = db;