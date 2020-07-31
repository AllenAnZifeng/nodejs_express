let express = require('express');
let router = express.Router();
let path = require('path');
let sqlite3 = require('sqlite3').verbose();
let jwt = require('jsonwebtoken');

let ROOT = path.dirname(__dirname);

function DataBase() {

    let makeError = (msg) => {
        return (err) => {
            if (err) {
                console.error(err.message);
            } else {
                console.log(msg);
            }
        }
    };


    this.connectError = makeError('Connected to the database.');

    this.closeConnectionError = makeError('Close the database connection.');

}


function UserDataBase() {
    DataBase.call(this);

    this.insertUser = async (username, password) => {
        this.db = new sqlite3.Database('./users.db', this.connectError);

        await new Promise((resolve => {
            this.db.run('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE, password TEXT NOT NULL)', resolve);
        }));

        let error = await new Promise((resolve => {
            this.db.run('INSERT INTO users (name, password) VALUES (?,?)', [username, password], resolve);
        }));

        this.close();

        return error;


    };


    this.authenticateUser = async (username, password) => {
        this.db = new sqlite3.Database('./users.db', this.connectError);
        let sql = 'SELECT ID id, name username,Password password FROM users Where name = ?';

        let promise = await new Promise(((resolve, reject) => {
            this.db.get(sql, [username], (err, row) => {

                if (row && row.password === password && row.username === username) {
                    resolve(row.id);

                } else {
                    reject('wrong username or password');
                }


            });
        })).catch(
            error => console.error(error)
        );

        this.close();
        return promise;

    };


    this.getUserID = async (username) => {
        this.db = new sqlite3.Database('./users.db', this.connectError);
        let sql = 'SELECT ID id, name username FROM users Where name = ?';

        let promise = await new Promise(((resolve, reject) => {
            this.db.get(sql, [username], (err, row) => {

                if (row) {
                    resolve(row.id);
                } else {
                    reject('no such user');
                }

            });
        })).catch(
            error => console.error(error)
        );

        this.close();


        return promise;

    };

    this.close = () => {
        this.db.close(this.closeConnectionError);
    };

}


router.post('/getUserID/', async (req, res, next) => {
    let db = new UserDataBase();
    let username = req.body.username;
    console.log(username);
    let value = await db.getUserID(username);

    if (value) {
        res.json({userID: value});
    } else {
        res.json({userID: null});
    }


});


router.get('/login/', function (req, res, next) {

    res.sendFile('views/login.html', {root: ROOT});
});

router.get('/register/', function (req, res, next) {
    res.sendFile('views/register.html', {root: ROOT});

});


router.post('/loginAPI', async function (req, res, next) {

    console.log(req.body);
    let db = new UserDataBase();
    let userID = await db.authenticateUser(req.body.username, req.body.password);

    if (userID) {
        let user = {username: req.body.username,id:userID};
        jwt.sign({user}, 'secretKey', {expiresIn: '1d'}, (err, token) => {
            res.json({token: token})
        })
    } else {
        res.sendStatus(403);
    }

});


router.post('/registerAPI/', async function (req, res, next) {

    console.log(req.body);
    if (req.body.password === req.body.pwd_repeat) {
        let db = new UserDataBase();
        let err = await db.insertUser(req.body.username, req.body.password);

        if (err) {
            console.error(err);
            res.status(403).json({error: 'registered username'});
        } else {
            console.log('redirecting');
            res.status(200).json({redirect: true});
        }
    } else {
        res.status(403).json({error: 'password not the same'})
    }
});


module.exports = router;
