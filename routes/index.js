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

        await new Promise((resolve => {
            db.run('INSERT INTO friends (myID, friendID) VALUES (?,?)', [myID, friendID], resolve);
        }));

        await new Promise((resolve => {
            db.run('INSERT INTO friends (myID, friendID) VALUES (?,?)', [friendID, myID], resolve);
        }));


    };

    this.deleteMessage = async (ToID, FromID) => {
        await new Promise((resolve => {
            db.run('DELETE FROM messageCenter WHERE ToID=? AND FromID=? AND Type=?', [ToID, FromID, 'request'], resolve);
        }));
    };

    this.uploadMessage = async (msg) => {

        let alreadyFriendFlag = false;
        await new Promise((resolve => {
            db.run('CREATE TABLE IF NOT EXISTS messageCenter(ToID INTEGER NOT NULL,FromID INTEGER NOT NULL, Type Text NOT NULL,Body TEXT)', resolve);
        }));

        await new Promise(((resolve, reject) => {
            db.all('SELECT * FROM friends Where myID = ? AND friendID=?', [msg.to, msg.from], (err, row) => {
                if (row.length > 0) {

                    reject(new Error('already friends'));
                } else {
                    resolve();
                }
            });
        })).then(
            async () => {
                await new Promise((resolve => {
                    db.run('INSERT INTO messageCenter (ToID, FromID,Type,Body) VALUES (?,?,?,?)', [msg.to, msg.from, msg.type, msg.body], resolve);
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

    this.downloadMessage = async (myID) => {


        return await new Promise(((resolve, reject) => {
            db.all('SELECT * FROM messageCenter Where ToID = ?', [myID], (err, row) => {
                if (row) {
                    resolve(row);
                } else {
                    reject('no requests');
                }

            });
        })).catch(
            error => console.error(error)
        );
    }

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
                if (row.length > 0) {
                    resolve(row);
                } else {
                    reject(new Error('no friends'));
                }
            });
        })).then(
            async (friends) => {

                for (let i = 0; i < friends.length; i++) {
                    friends[i].name = await this.getUsername(friends[i].friendID);
                }
                console.log(friends);
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
    }


});


router.post('/sendFriendRequest/', processToken, async (req, res) => {
    let msg = req.body;
    let db = new MessageDB();
    let flag = await db.uploadMessage(msg);
    if (flag) {
        res.json({message: 'Already Friends'})
    } else {
        res.json({message: null})
    }
});


router.post('/getRequest/', async (req, res) => {

    let db = new MessageDB();
    let myID = req.body.myID;
    let message = await db.downloadMessage(myID);

    if (message) {
        for (let i = 0; i < message.length; i++) {
            message[i].name = await db.getUsername(message[i].FromID);
        }
        res.json(message);
    } else {
        res.json({error: 'No incoming friend requests'});
    }

});


router.post('/cookieInfoAPI/', processToken, function (req, res, next) {
    res.send(req.authData);
});


module.exports = router;
