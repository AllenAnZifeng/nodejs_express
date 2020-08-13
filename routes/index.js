let express = require('express');
let router = express.Router();
let path = require('path');
let jwt = require('jsonwebtoken');
let db = require('../db');

let ROOT = path.dirname(__dirname);


let message = (error=false,error_message='no error',
               redirect=false,message='') => {
    return {
        'error': error,
        'error_message': error_message,
        'redirect': redirect,
        'message': message,
    }
}

let resolveMessage = (error=false,message='') =>{
    return {
        'error':error,
        'message':message
    }
}

function processToken(req, res, next) {


    let token = req.cookies.token;
    if (token) {
        jwt.verify(token, 'secretKey', function (err, authData) {
            if (err) {
                res.send(message(true,err,true,''));
            } else {
                req.authData = authData;
            }
        });
    } else {
        res.send(message(true,'no token',true,''));
    }
    next();
}


function MessageDB() {


     this.createFriendRequest = async (myID, friendID) => {


        await new Promise(resolve => {
            db.run('CREATE TABLE IF NOT EXISTS friends(myID INTEGER NOT NULL,friendID INTEGER NOT NULL)', resolve)
        });

        return await new Promise(((resolve, reject) => {
            db.all('SELECT * FROM friends Where myID = ? AND friendID=?', [myID, friendID], (err, row) => {
                if (row && row.length > 0) {
                    reject(new Error('already friends'));
                } else {
                    resolve();
                }
            });
        })).then(
            async () => {
                await new Promise((resolve => {
                    db.run('INSERT INTO friends (myID, friendID) VALUES (?,?)', [myID, friendID], resolve);
                }));

                await new Promise(((resolve,reject) => {
                    db.run('INSERT INTO friends (myID, friendID) VALUES (?,?)', [friendID, myID], (err,row)=>{
                        if (err){
                            reject(new Error('error inserting into friends'));
                        }else{
                            resolve(resolveMessage(false));
                        }
                    });
                }));

            }
        ).catch(
            error => {
                console.error(error);
                return {'error':error};
            }
        )


    };

    this.deleteMessage = async (ToID, FromID) => {
        return await new Promise(((resolve,reject) => {
            db.run('DELETE FROM messageCenter WHERE ToID=? AND FromID=? AND Type=?', [ToID, FromID, 'request'], (err,row)=>{
                if (err){
                    reject(new Error('Delete Error!'));
                }
                else{
                    resolveMessage(resolveMessage(false))
                }
            });
        })).catch(
            error => {
                console.error(error);
                return {'error':error};
            }
        );
    };

    this.sendFriendRequest = async (msg) => {


        await new Promise((resolve => {
            db.run('CREATE TABLE IF NOT EXISTS messageCenter(ToID INTEGER NOT NULL,FromID INTEGER NOT NULL, Type Text NOT NULL,Body TEXT, Time TEXT)', resolve);
        }));

        return await new Promise(((resolve, reject) => {
            db.all('SELECT * FROM friends Where myID = ? AND friendID=?', [msg.to, msg.from], (err, row) => {
                if (row && row.length > 0) {

                    reject(new Error('already friends'));
                } else {
                    resolve();
                }
            });
        })).then(
            async () => {
                await new Promise(((resolve,reject) => {
                    db.run('INSERT INTO messageCenter (ToID, FromID,Type,Body,Time) VALUES (?,?,?,?,?)', [msg.to, msg.from, msg.type, msg.body, new Date()], (err,row)=>{
                        if (err){
                            reject(new Error('insert friend error'));
                        }
                        else{
                            resolve(resolveMessage(false))
                        }
                    });
                }));
            }
        ).catch(
            error => {
                console.error(error);
                return {'error':error};
            }
        );
    };

    this.sendMessage = async (msg) => {
        return await new Promise(((resolve,reject) => {
            db.run('INSERT INTO messageCenter (ToID, FromID,Type,Body,Time) VALUES (?,?,?,?,?)', [msg.to, msg.from, msg.type, msg.body, new Date()], (err, row) => {
                if (err) {
                    reject(new Error('insert message error'));
                } else {
                    resolve(resolveMessage(false));
                }
            });
        })).catch(
            error => {
                console.error(error);
                return {'error':error};
            }
        );
    };

    this.getFriendRequest = async (myID) => {

        return await new Promise(((resolve, reject) => {
            db.all('SELECT * FROM messageCenter Where ToID = ? AND Type = ?', [myID, 'request'], (err, row) => {
                if (row && row.length > 0) {
                    resolve(resolveMessage(false,row));
                } else {
                    reject(new Error('no requests'));
                }
            });
        })).catch(
            error => {
                console.error(error);
                return {'error':error};
            }
        );
    };

    this.getMessageHistory = async (myID) => {
        return await new Promise(((resolve, reject) => {
            db.all('SELECT * FROM messageCenter Where ToID = ? OR FromID = ? AND Type = ?', [myID, myID, 'message'], (err, row) => {
                if (row && row.length > 0) {
                    resolve(resolveMessage(false,row));
                } else {
                    reject(new Error('no message'))
                }

            });
        })).catch(
            error => {
                console.error(error);
                return {'error':error};
            }
        );


    };


    this.getUsername = async (id) => {
        return await new Promise(((resolve, reject) => {
            db.get('SELECT name username FROM users Where id = ?', [id], (err, row) => {
                if (row) {
                    resolve(resolveMessage(false,row.username));
                } else {
                    reject(new Error('error getting username'));
                }
            });
        })).catch(
            error => {
                console.error(error);
                return {'error':error};
            }
        );
    };


    this.getFriendList = async (myID) => {
        return await new Promise(((resolve, reject) => {
            db.all('SELECT friendID friendID FROM friends Where myID = ?', [myID], (err, row) => {
                if (err) {
                    reject(new Error('no friends'));
                } else {
                    resolve(row);
                }
            });
        })).then(
            async (friends) => {
                for (let i = 0; i < friends.length; i++) {
                    friends[i].name = await this.getUsername(friends[i].friendID);
                }
                return resolveMessage(false,friends);
            }
        ).catch(
            error => {
                console.error(error);
                return {'error':error};
            }
        );
    };
}


router.get('/home/', processToken, function (req, res, next) {
    res.sendFile('views/home.html', {root: ROOT});
});


router.get('/friend/', processToken, async (req, res) => {

    let db = new MessageDB();
    let msg = await db.getFriendList(req.body.myID);
    if (msg.error){
        res.send(message(true,'get friend error'))
    }else{
        res.send(message(false,'no error',false,msg.message));
    }
});


router.get('/friendRequest/', processToken, async (req, res) => {

    let db = new MessageDB();
    let msg = await db.getFriendRequest( req.body.myID);
    if (msg.error){
        res.send(message(true,'No incoming friend requests'))
    }else{
        for (let i = 0; i < msg.message.length; i++) {
            msg.message[i].name = await db.getUsername(msg.message[i].FromID);
        }
        res.send(message(false,'no error',false,msg.message));
    }
});

router.post('/friendRequest/', processToken, async (req, res) => {

    let db = new MessageDB();
    let msg = await db.sendFriendRequest(req.body);
    if (msg.error){
        res.send(message(true,'Already Friends'))
    }else{
        res.send(message(false));
    }
});

router.delete('/friendRequest/', processToken, async (req, res) => {

    let db = new MessageDB();
    let msg = await db.deleteMessage(req.body.ToID, req.body.FromID);
    if (msg.error){
        res.send(message(true,'delete friend request error'))
    }else{
        res.send(message(false));
    }

});

router.post('/friendRequest/accept/', processToken, async (req, res) => {

    let db = new MessageDB();
    let msg = await db.createFriendRequest(req.body.myID, req.body.friendID);
    if (msg.error){
        res.send(message(true,'create friend request error'))
    }else{
        msg = await db.deleteMessage(req.body.myID, req.body.friendID);
        if (msg.error){
            res.send(message(true,'delete friend request error'))
        }else{
            res.send(message(false));
        }
    }

});

router.post('/message/', processToken, async (req, res) => {

    let db = new MessageDB();
    let msg = await db.sendMessage(req.body);
    if (msg.error){
        res.send(message(true,'error sending messages'))
    }else{
        res.send(message(false));
    }
});


router.get('/message/', processToken, async (req, res) => {

    let db = new MessageDB();
    let myID = req.body.myID;
    let msg = await db.getMessageHistory(myID);
    if (msg.error){
        res.send(message(true,'error getting message history'))
    }else{
        res.send(message(false,'no error',false,msg.message));
    }

});


router.get('/cookieInfo/', processToken, function (req, res, next) {
    res.send(message(false,'no error',false,req.authData));
});


module.exports = router;
