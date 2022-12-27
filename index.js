require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
const port = 3000
const bodyparser = require('body-parser')
const db = require('./connection/connection')
const response = require('./response/response')
const responseRegister = require('./response/responseregist')
const CryptoJS = require('crypto-js')
const sendEmailOps = require('./mails/sendemail')
const generator = require('generate-password');
const resetpasswordSender = require('./mails/sendemailrestartpass')
const bcrypt = require('bcrypt')
const salt = bcrypt.genSaltSync(10);

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

  db.query(`SELECT username, email, phone FROM USER`, (err, result) => {
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
    const {username, password, fullname, genderselect, email, phone} = req.body
    console.log(req.body);
    if(username !== '' && password !== '' && fullname !== '' && genderselect !== '' && email !== '' && phone !== ''){
        console.log("iamfukinghere");
        const sql = `INSERT INTO user(userid, username, password, fullname, gender, email, phone)
        VALUES ('', '${username}', '${password}', '${fullname}', '${genderselect}', '${email}', '${phone}')`
        db.query(sql, (err, fields)=>{
            if (!err) {
                let custID = fields.insertId;
                const sql2 = `INSERT INTO consumer (userid, consid, addressid) value (${custID}, '','')`
                db.query(sql2, (err2, fields2)=>{
                    if(fields2.affectedRows){
                        sendEmailOps(process.env.EMAIL_OPS_CORE, process.env.EMAIL_OPS_CORE_PSWD, username, email)
                        responseRegister(200, 1, fields, null, res)
                    } else{
                        responseRegister(203, -2, err2, null, fields2)
                    }
                })
            } else {
                responseRegister(203, -1, err.sqlMessage, null, res)
            }
        })
    } else {
        responseRegister(203, 0, null, null, res)
    }
})

app.post('/logincustomer', (req, res) => {
    const {email, username, password} = req.body;
    if(email && username && password){
        let sql
        if(username != 'unused')
            sql = `SELECT * FROM user WHERE username = '${username}' AND password = '${password}'`

        else 
            sql = `SELECT * FROM user WHERE email = '${email}' AND password = '${password}'`
        db.query(sql, (err, fields) => {
            if(fields.length > 0){
                let keyLogin = CryptoJS.HmacSHA256(fields[0].username, process.env.LOCKED_API_CUSTOMER)
                keyLogin = CryptoJS.enc.Base64.stringify(keyLogin)
                responseRegister(200, 1, fields, keyLogin, res)
            }
            else
                responseRegister(203, 0, null, null, res)
        })
    } else { 
        responseRegister(203, 0, null, null, res)
    }
})

app.get('/sendmail', (req, res) => {
    console.log("Sending Email");
    sendEmailOps(process.env.EMAIL_OPS_CORE, process.env.EMAIL_OPS_CORE_PSWD, "Kryptonxas", res)
})

app.get('/forgetpassword', (req, res) => {
    db.query(`SELECT * FROM USER WHERE email = '${req.query.email}'`, (err, result) => {
        if (err) throw err
        if(result.length > 0){
            console.log(result[0].username);
            console.log(salt);
            let linkresetpassword = bcrypt.hashSync(result[0].username, salt);
            console.log(linkresetpassword);
            let urlResetPassword = `http://localhost:4200/api/resetpassword?email=${req.query.email}&salt=${linkresetpassword}`
            resetpasswordSender(process.env.EMAIL_OPS_CORE, process.env.EMAIL_OPS_CORE_PSWD, result[0].username, req.query.email, urlResetPassword, res)
        }
        else
            res.send("This email is not registerd in OPS Core !")
    })
})

app.get('/resetpassword', (req, res) => {
    req.query.email
    let a = req.query.salt
    console.log(bcrypt.compareSync("angularkiddie@gmail.com", a));
    let ax = bcrypt.compareSync("username", a)
    res.send(`'${ax}'`)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
