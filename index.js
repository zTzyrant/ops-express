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

// register customer
app.post('/registeruserascustomer', (req, res) => {
    const {username, password, fullname, genderselect, email, phone} = req.body
    console.log(req.body);
    if(username !== '' && password !== '' && fullname !== '' && genderselect !== '' && email !== '' && phone !== ''){
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

// login customer
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


// req forgot password customer Reset password part 1
app.get('/forgetpassword', (req, res) => {

    db.query(`SELECT * FROM user INNER JOIN consumer ON user.userid = consumer.userid WHERE user.email = '${req.query.email}'`, (err, result) => {
        if (err) throw err
        console.log("ini error" + err);
        if(result.length > 0){
            console.log(result[0].username);
            console.log("Generate Token");
            console.log(req.query.email);
            let encrypted = CryptoJS.AES.encrypt(req.query.email, process.env.LOCKED_API_PASSWORD);
            let linkresetpassword = encrypted.toString()
            console.log("Token: " + linkresetpassword);
            let urlResetPassword = `http://localhost:4200/api/resetpassword?email=${req.query.email}&salt=${linkresetpassword}`
            resetpasswordSender(process.env.EMAIL_OPS_CORE, process.env.EMAIL_OPS_CORE_PSWD, result[0].username, req.query.email, urlResetPassword, res)
        }
        else
            res.send('-1')
    })
})

app.get('/checkToken', (req, res) => {
    let tempSalt = req.query.salt
    let replaced = tempSalt.split(' ').join('+');
    let decrypted = CryptoJS.AES.decrypt(replaced, process.env.LOCKED_API_PASSWORD);
    console.log("New: " + decrypted.toString(CryptoJS.enc.Utf8) + " From: " + req.query.email);
    let checkToken = decrypted.toString(CryptoJS.enc.Utf8) === req.query.email

    if(checkToken){
        res.send('1')
    } else {
        res.send('-1')
    }

})

// Reset password part 2
app.get('/updatePassowrd', (req, res) => {
    const {email, salt, newpassword} = req.query;
    let tempSalt = salt
    let replaced = tempSalt.split(' ').join('+');
    console.log(replaced);
    let tempNewPassword = newpassword
    let newPass = tempNewPassword.split(' ').join('+');

    let decrypted = CryptoJS.AES.decrypt(replaced, process.env.LOCKED_API_PASSWORD);
    let checkToken = decrypted.toString(CryptoJS.enc.Utf8) === email
    if(checkToken){
        console.log(`Starting to update password to: ${email}`);
        db.query(`UPDATE user set password = '${newPass}' WHERE user.email = '${email}'`, (err, result) => {
            if(err) throw err
            console.log(result);
            if(result.affectedRows > 0){
                console.log(`Success Update password to: { ${newPass} } for email: ${email}`);
                res.send('1')
            }else{
                res.send('-2')
            }
        })
    } else {
        res.send('-1')
    }
})

// update cunsomer
app.post('/updateCustomer', (req, res) => {
    const {email, password, fullname, gender} = req.body;
    console.log(req.body);
    console.log(email);
    if(email !== "" && password !== "" && fullname !== "" && gender !== ""){
        db.query(`UPDATE user set fullname = '${fullname}', gender = '${gender}' WHERE user.email = '${email}' AND user.password = '${password}'`, (err, result) => {
            if(err) throw err
                console.log(result);
                if(result.affectedRows > 0){
                    console.log(`Success Update account information for email: ${email}`);
                    res.send('1')
                }else{
                    res.send('-2')
            }
        })
    } else{
        res.send('0')
    }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
