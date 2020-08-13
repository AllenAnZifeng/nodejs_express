let express = require('express');
let router = express.Router();
let path = require('path');

let jwt = require('jsonwebtoken');
let db = require('../db');
let ROOT = path.dirname(__dirname);


let resolveMessage = (error=false,message='') =>{
    return {
        'error':error,
        'message':message
    }
}

let message = (error=false,error_message='no error',
               redirect=false,message='') => {
    return {
        'error': error,
        'error_message': error_message,
        'redirect': redirect,
        'message': message,
    }
}



function UserDataBase() {

    this.insertUser = async (username, password) => {

        await new Promise((resolve => {
            db.run('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE, password TEXT NOT NULL)', resolve);
        }));

        return await new Promise(((resolve,reject) => {
            db.run('INSERT INTO users (name, password) VALUES (?,?)', [username, password], (err,row)=>{
                if (err){
                    reject(new Error(err));
                }else{
                    resolve(resolveMessage(false,'insert user success'));
                }
            });
        })).catch(
            error => {
                console.error(error);
                return {'error':error};
            }
        );
    };


    this.authenticateUser = async (username, password) => {

        let sql = 'SELECT ID id, name username,Password password FROM users Where name = ?';

        return await new Promise(((resolve, reject) => {
            db.get(sql, [username], (err, row) => {

                if (row && row.password === password && row.username === username) {
                    resolve(resolveMessage(false,row.id));
                } else {
                    reject(new Error('wrong username or password'));
                }


            });
        })).catch(
            error => {
                console.log(error);
                return {'error':error};
            }
        );

    };


    this.getUserID = async (username) => {

        let sql = 'SELECT ID id, name username FROM users Where name = ?';

        return await new Promise(((resolve, reject) => {
            db.get(sql, [username], (err, row) => {

                if (row) {
                    resolve(resolveMessage(false,row.id));
                }
                else {
                    reject(new Error('no such user'));
                }

            });
        })).catch(
            error => {
                console.error(error);
                return {'error':error};
            }
        );

    };

}


router.get('/userID/', async (req, res, next) => {
    let db = new UserDataBase();
    let username = req.body.username;

    let msg = await db.getUserID(username);

    if (msg.error) {
        res.json(message(true,'error getting userID'));
    } else {
        res.json(message(false,'',false,msg.message));
    }
});


router.get('/login/', function (req, res, next) {

    res.sendFile('views/login.html', {root: ROOT});
});

router.get('/register/', function (req, res, next) {
    res.sendFile('views/register.html', {root: ROOT});

});


router.post('/login/', async function (req, res, next) {

    let db = new UserDataBase();
    let msg = await db.authenticateUser(req.body.username, req.body.password);

    if (msg.error) {
        res.status(403).json(message(true,'Authentication Error'));
    } else {
        let userID = msg.message;
        jwt.sign({'userID':userID,'username':req.body.username}, 'secretKey', {expiresIn: '1d'}, (err, token) => {
            if (err){
                res.json(message(true,'jwt signing error'));
            }else{
                res.json(message(false,'',true,{token: token}));
            }
        })
    }

});


router.post('/register/', async function (req, res, next) {

    if (req.body.password === req.body.pwd_repeat) {
        let db = new UserDataBase();
        let msg = await db.insertUser(req.body.username, req.body.password);

        if (msg.error) {
            res.json(message(true,'registered username Error'));
        } else {
            res.json(message(false,'',true, 'success'));
        }

    } else {
        res.status(403).json(message(true,'password not the same'));
    }
});


module.exports = router;
