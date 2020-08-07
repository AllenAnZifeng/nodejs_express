let express = require('express');
let router = express.Router();
let path = require('path');
let jwt = require('jsonwebtoken');

let db = require('../db');

let ROOT = path.dirname(__dirname);


function processToken(req, res, next) {


    let token = req.cookies.token;
    if (token) {
        jwt.verify(token, 'secretKey', function (err, authData) {
            if (err) {
                console.log(err);
                res.redirect('/users/login/');
            } else {
                req.authData = authData;
            }
        });
    } else {
        console.log('no token');
        res.redirect('/users/login/');
    }
    next();
}


function MessageDB() {


    // function Message(to, from, type, body=null) {
    //     return {
    //         to: to,
    //         from: from,
    //         type: type,
    //         body: body,
    //     }
    // }

    this.createFriendConnection = async (myID, friendID) => {


        await new Promise(resolve => {
            db.run('CREATE TABLE IF NOT EXISTS friends(myID INTEGER NOT NULL,friendID INTEGER NOT NULL)', resolve)
        });

        await new Promise(((resolve, reject) => {
            db.all('SELECT * FROM friends Where myID = ? AND friendID=?', [myID, friendID], (err, row) => {
                if (row && row.length > 0) {
                    reject(new Error('already friends'));
                } else {
                    resolve();
                }
            });
        })).then(
            async () =>{
                await new Promise((resolve => {
                    db.run('INSERT INTO friends (myID, friendID) VALUES (?,?)', [myID, friendID], resolve);
                }));

                await new Promise((resolve => {
                    db.run('INSERT INTO friends (myID, friendID) VALUES (?,?)', [friendID, myID], resolve);
                }));

            }
        ).catch(
            (error) => {
                console.error(error);
            }
        )



    };

    this.deleteMessage = async (ToID, FromID) => {
        await new Promise((resolve => {
            db.run('DELETE FROM messageCenter WHERE ToID=? AND FromID=? AND Type=?', [ToID, FromID, 'request'], resolve);
        }));
    };

    this.sendFriendRequest = async (msg) => {

        let alreadyFriendFlag = false;
        await new Promise((resolve => {
            db.run('CREATE TABLE IF NOT EXISTS messageCenter(ToID INTEGER NOT NULL,FromID INTEGER NOT NULL, Type Text NOT NULL,Body TEXT, Time TEXT)', resolve);
        }));

        await new Promise(((resolve, reject) => {
            db.all('SELECT * FROM friends Where myID = ? AND friendID=?', [msg.to, msg.from], (err, row) => {
                if (row && row.length > 0) {

                    reject(new Error('already friends'));
                } else {
                    resolve();
                }
            });
        })).then(
            async () => {
                await new Promise((resolve => {
                    db.run('INSERT INTO messageCenter (ToID, FromID,Type,Body,Time) VALUES (?,?,?,?,?)', [msg.to, msg.from, msg.type, msg.body, new Date()], resolve);
                }));
            }
        ).catch(
            (error) => {
                console.error(error);
                alreadyFriendFlag = true;
            }
        );

        return alreadyFriendFlag;

    };

    this.sendMessage = async (msg) =>{
        await new Promise((resolve => {
            return db.run('INSERT INTO messageCenter (ToID, FromID,Type,Body,Time) VALUES (?,?,?,?,?)', [msg.to, msg.from, msg.type, msg.body,new Date()], (err,row)=>{
                if (err){
                    console.log(err);
                    resolve(false);
                }
                else{
                    resolve(true);
                }
            });
        }));
    };

    this.getFriendRequest = async (myID) => {

        return await new Promise(((resolve, reject) => {
            db.all('SELECT * FROM messageCenter Where ToID = ? AND Type = ?', [myID,'request'], (err, row) => {
                if (row && row.length>0) {
                    resolve(row);
                } else {
                    reject('no requests');
                }

            });
        })).catch(
            error => console.error(error)
        );
    };

    this.getMessageHistory = async (myID) =>{
        return await new Promise(((resolve, reject) => {
            db.all('SELECT * FROM messageCenter Where ToID = ? OR FromID = ? AND Type = ?', [myID,myID,'message'], (err, row) => {
                if (row && row.length>0) {
                    resolve(row);
                } else {
                    reject('no message');
                }

            });
        })).catch(
            error => console.error(error)
        );


    };



    this.getUsername = async (id) => {

        let sql = 'SELECT name username FROM users Where id = ?';

        return await new Promise(((resolve, reject) => {
            db.get(sql, [id], (err, row) => {

                if (row) {
                    resolve(row.username);
                } else {
                    reject(new Error('error getting username'));
                }
            });
        })).catch(
            error => console.error(error)
        );
    };


    this.getFriendList = async (myID) => {

        let sql = 'SELECT friendID friendID FROM friends Where myID = ?';

        return await new Promise(((resolve, reject) => {
            db.all(sql, [myID], (err, row) => {
                if (err){
                    reject(new Error('no friends'));
                }else{
                    resolve(row);
                }
            });
        })).then(
            async (friends) => {

                for (let i = 0; i < friends.length; i++) {
                    friends[i].name = await this.getUsername(friends[i].friendID);
                }
                // console.log('friends',friends);
                return friends
            }
        ).catch(
            error => console.log(error)
        );
    };
}


router.get('/home/', processToken, function (req, res, next) {
    res.sendFile('views/home.html', {root: ROOT});
});

router.post('/rejectFriendRequest/', processToken, async (req, res) => {

    let db = new MessageDB();
    let error = await db.deleteMessage(req.body.ToID, req.body.FromID);
    if (error) {
        console.log(error, 'problems rejecting friend request');
    }
});

router.post('/acceptFriendRequest/', processToken, async (req, res) => {

    let db = new MessageDB();
    await db.createFriendConnection(req.body.myID, req.body.friendID);
    await db.deleteMessage(req.body.myID, req.body.friendID);

});

router.post('/getFriendList/', processToken, async (req, res) => {

    let db = new MessageDB();
    let friends = await db.getFriendList(req.body.myID);
    if (friends) {
        res.json(friends);
    }else{
        res.json(null);
    }


});


router.post('/sendFriendRequest/', processToken, async (req, res) => {
    let msg = req.body;
    let db = new MessageDB();
    let flag = await db.sendFriendRequest(msg);
    if (flag) {
        res.json({message: 'Already Friends'})
    } else {
        res.json({message: null})
    }
});


router.post('/sendMessage/', processToken, async (req, res) => {
    let msg = req.body;
    let db = new MessageDB();
    let flag = await db.sendMessage(msg);
    if (flag) {
        res.json({message: 'gg'})
    } else {
        res.json({message: 'success'})
    }
});


router.post('/getFriendRequest/', async (req, res) => {

    let db = new MessageDB();
    let myID = req.body.myID;
    let message = await db.getFriendRequest(myID);

    if (message) {
        for (let i = 0; i < message.length; i++) {
            message[i].name = await db.getUsername(message[i].FromID);
        }
        res.json(message);
    } else {
        res.json({error: 'No incoming friend requests'});
    }
});

router.post('/getMessageHistory/', async (req, res) => {

    let db = new MessageDB();
    let myID = req.body.myID;
    let message = await db.getMessageHistory(myID);

    if (message){
        res.json(message);
    }
    else{
        res.json(null);
    }
});


router.post('/cookieInfoAPI/', processToken, function (req, res, next) {
    res.send(req.authData);
});


module.exports = router;
