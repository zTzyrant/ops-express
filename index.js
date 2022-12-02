const express = require('express')
const cors = require('cors')
const app = express()
const port = 3000
const bodyparser = require('body-parser')
const db = require('./connection/connection')
const response = require('./response')
const md5 = require('md5')

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

app.post('/login', (req, res) => {
    console.log({requestFromOutside: req.body});
    res.send("Login berhasil")
})

app.post('/registeruser', (req, res) => {
    console.log({registerBody: req.body});
    sql = `INSERT INTO user(userid, username, password, fullname, gender, email, phone)
        VALUES ('', '${req.body.username}', ('${md5(req.body.password)}'), '${req.body.fullname}', '${req.body.gender}', '${req.body.email}', '${req.body.phone}')`
    db.query(sql, (err, result) => {
        if(err){
            throw err;
        } else {
            res.send("Success register user")
        }
    })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
