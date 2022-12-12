const express = require('express')
const cors = require('cors')
const app = express()
const port = 3000
const bodyparser = require('body-parser')
const db = require('./connection/connection')
const response = require('./response/response')
const responseRegister = require('./response/responseregist')
const CryptoJS = require('crypto-js')

app.use(cors({
  methods: 'GET,POST,PATCH,DELETE,OPTIONS',
  optionsSuccessStatus: 200,
  origin: 'http://localhost:4200'
}));

app.use(bodyparser.json())

// routes / URL / endpoint

app.get('/', (req, res) => {
    res.send("Why u here?")
})

app.get('/data', (req, res) => {
    if(req.query.userid != null){
        db.query(`SELECT * FROM USER WHERE userid = ${req.query.userid}`, (err, result) => {
            response(200, result, "get all data user", res)
        })
    } else {
        db.query(`SELECT * FROM USER`, (err, result) => {
            // DATA FROM MYSQL STORE IN HERE
            response(200, result, "get all data user", res)
        })
    }
})

app.get('/datausrname', (req, res) => {

  db.query(`SELECT username FROM USER`, (err, result) => {
    // DATA FROM MYSQL STORE IN HERE
    response(200, result, "get all data user", res)
  })

})

app.post('/login', (req, res) => {
    console.log({requestFromOutside: req.body});
    res.send("Login berhasil")
})

app.post('/registeruser', (req, res) => {
    console.log({registerBody: req.body});
    sql = `INSERT INTO user(userid, username, password, fullname, gender, email, phone)
        VALUES ('', '${req.body.username}', ('${(req.body.password)}'), '${req.body.fullname}', '${req.body.gender}', '${req.body.email}', '${req.body.phone}')`
    db.query(sql, (err, result) => {
        if(err){
            response(208, result, err, res)
        } else {
            response(201, result, err, res)
        }
    })
})

app.post('/registeruserascustomer', (req, res) => {
    req.body.password =  CryptoJS.AES.decrypt(req.body.password, 'ops-Project-Night-Fall').toString(CryptoJS.enc.Utf8);
    const {username, password, fullname, gender, email, phone} = req.body
    if(username != null || password != null || fullname != null || gender != null || email != null || phone != null){
        const sql = `INSERT INTO user(userid, username, password, fullname, gender, email, phone)
        VALUES ('', '${username}', '${password}', '${fullname}', '${gender}', '${email}', '${phone}')`
        db.query(sql, (err, fields)=>{
            if (err) throw err
            if (fields.affectedRows) {
                let custID = fields.insertId;
                const sql2 = `INSERT INTO consumer (userid, consid, addressid) value (${custID}, '','')`
                db.query(sql2, (err2, fields2)=>{
                    if(fields2.affectedRows){
                        responseRegister(200, 1, fields2, res)
                    } else{
                        responseRegister(203, 'Unknown Error in 2', err2, fields2)
                    }
                })
            } else {
                responseRegister(203, 'Unknown Error in 1', err, res)
            }
        })
    } else {
        responseRegister(203, 0, null, res)
    }
    
    
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
