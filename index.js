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
const resetpasswordSender = require('./mails/sendemailrestartpass')

const formidable = require('formidable')
const mv = require('mv');
const pdf = require('pdf-page-counter');
const fs = require('fs')

app.use(cors());

app.use(bodyparser.json())
var publicDir = require('path').join(__dirname,'upload'); 
app.use('/upload',express.static(publicDir)); 
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
        let sql, defsql = 'SELECT * FROM user'
        if(username != 'unused')
            sql = `WHERE username = '${username}' AND password = '${password}'`

        else 
            sql = `WHERE email = '${email}' AND password = '${password}'`

        db.query(`${defsql} INNER JOIN consumer ON user.userid = consumer.userid ${sql}`, (err, fields) => {
            if (err) throw err;
            if(fields.length > 0){
                let keyLogin = CryptoJS.HmacSHA256(fields[0].username, process.env.LOCKED_API_CUSTOMER)
                keyLogin = CryptoJS.enc.Base64.stringify(keyLogin)
                responseRegister(200, 1, fields, keyLogin, res)
            } else {
                db.query(`${defsql} INNER JOIN developer ON user.userid = developer.userid ${sql}`, (err, fields) => {
                    if (err) throw err;
                    if(fields.length > 0){
                        let keyLogin = CryptoJS.HmacSHA256(fields[0].username, process.env.LOCKED_API_CUSTOMER)
                        keyLogin = CryptoJS.enc.Base64.stringify(keyLogin)
                        responseRegister(200, 1, fields, keyLogin, res)
                    } else {
                        db.query(`${defsql} INNER JOIN adminprinting ON user.userid = adminprinting.userid ${sql}`, (err, fields) => {
                            if (err) throw err;
                            if(fields.length > 0){
                                let keyLogin = CryptoJS.HmacSHA256(fields[0].username, process.env.LOCKED_API_CUSTOMER)
                                keyLogin = CryptoJS.enc.Base64.stringify(keyLogin)
                                responseRegister(200, 1, fields, keyLogin, res)
                            } else 
                                responseRegister(203, 0, null, null, res)         
                        })
                    }
                })
            }
                
        })
    } else { 
        responseRegister(203, 0, null, null, res)
    }
})

app.get('/sendmail', (req, res) => {
    console.log("Sending Email");
    sendEmailOps(process.env.EMAIL_OPS_CORE, process.env.EMAIL_OPS_CORE_PSWD, "Kryptonxas", res)
})

let date_ob = new Date();

// current date
// adjust 0 before single digit date
let date = ("0" + date_ob.getDate()).slice(-2);
// current month
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
// current year
let year = date_ob.getFullYear();

let datemow = `$${year}-${month}-${date}`
console.log(datemow);


// req forgot password customer Reset password part 1
app.get('/forgetpassword', (req, res) => {

    db.query(`SELECT * FROM user INNER JOIN consumer ON user.userid = consumer.userid WHERE user.email = '${req.query.email}'`, (err, result) => {
        if (err) throw err
        console.log("ini error" + err);
        if(result.length > 0){
            console.log(result[0].username);
            console.log("Generate Token");
            console.log(req.query.email);
            let encrypted = CryptoJS.AES.encrypt(req.query.email, process.env.LOCKED_API_PASSWORD + datemow);
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
    let decrypted = CryptoJS.AES.decrypt(replaced, process.env.LOCKED_API_PASSWORD + datemow);
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

    let decrypted = CryptoJS.AES.decrypt(replaced, process.env.LOCKED_API_PASSWORD + datemow);
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

app.post('/getconsumerdatas', (req, res) => {
    console.log("iam here");
    const {email, password} = req.body;
    let sql = `SELECT * FROM user WHERE email = '${email}' AND password = '${password}'`
    db.query(sql, (err, fields) => {
        if(fields.length > 0){
            console.log(fields);
            let keyLogin = CryptoJS.HmacSHA256(fields[0].username, process.env.LOCKED_API_CUSTOMER)
            keyLogin = CryptoJS.enc.Base64.stringify(keyLogin)
            responseRegister(200, 1, fields, keyLogin, res)
        }
        else
            responseRegister(203, 0, null, null, res)
    })
})

app.post('/uploadorderpdf', (req, res) => {
    var form = new formidable.IncomingForm();
    let msg = ''
    let scode = 0
    form.parse(req, function (err, fields, files) {
        let oldpath = files.anyfilesnames.filepath;
        let filename = files.anyfilesnames.newFilename + Date.now() + '.pdf'
        let newpath = __dirname + "/upload/order/document/" + filename;
        let retPath = "/upload/order/document/" + filename;
        mv(oldpath, newpath, function (err) {
            if (err) { 
                msg = err
                scode = 406
                throw err
            } else {
                msg = 'file uploaded successfully'
                scode = 202
            }

            res.status(200).json({
                resUpload: {
                    statusCode: scode,
                    filePath: retPath,
                    message: msg
                }
            })
        });
    });
});

// check number of pages
app.post('/calcpages', (req, res) => {
    var form = new formidable.IncomingForm();
    let scode = 200
    form.parse(req, function (err, fields, files) {
        let oldpath = files.anyfilesnames.filepath
        let dataBuffer = fs.readFileSync(`${oldpath}`);
 
        pdf(dataBuffer).then(function(data) {
            res.status(200).json({
                resUpload: {
                    statusCode: scode,
                    totalPages: data.numpages,
                }
            })
        });
    })
});


// get all product
app.get('/ops-prod', (req, res) => {
    db.query(`SELECT * FROM product INNER JOIN merchant ON merchant.merchantid = product.merchantid`, (err, result) => {
        console.log(result.length);
        let tempProduct = []
        result.forEach(element => {
            db.query(`SELECT * FROM producttype WHERE producttype.productid = ${element.productid}`, (err, productType) => {
                db.query(`SELECT * FROM printquality WHERE printquality.productid = ${element.productid}`, (err, printQuality) => {
                    db.query(`SELECT * FROM productcolortype WHERE productcolortype.productid = ${element.productid}`, (err, printColors) => {
                        tempProduct.push({
                            productOPS: element,
                            productService: {
                                productTypeOPS: productType,
                                printColorsOPS: printColors,
                                printQualityOPS: printQuality
                            },
                        })
                        if(result[result.length - 1] === element){
                            res.status(200).json(tempProduct)
                        }
                    });
                });
            });
            
        });
    })
})

app.get('/ops-prod/:id?', (req, res) => {
    db.query(`SELECT * FROM product INNER JOIN merchant ON merchant.merchantid = product.merchantid WHERE productid = '${req.params.id}'`, (err, result) => {
        console.log(result.length);
        let tempProduct = []
        result.forEach(element => {
            db.query(`SELECT * FROM producttype WHERE producttype.productid = ${element.productid}`, (err, productType) => {
                db.query(`SELECT * FROM printquality WHERE printquality.productid = ${element.productid}`, (err, printQuality) => {
                    db.query(`SELECT * FROM productcolortype WHERE productcolortype.productid = ${element.productid}`, (err, printColors) => {
                        tempProduct.push({
                            productOPS: element,
                            productService: {
                                productTypeOPS: productType,
                                printColorsOPS: printColors,
                                printQualityOPS: printQuality
                            },
                        })
                        if(result[result.length - 1] === element){
                            res.status(200).json(tempProduct)
                        }
                    });
                });
            });
            
        });
    })

})

// show all merchant
app.get('/show-merchant', (req, res) => {
    query = `SELECT * FROM merchant INNER JOIN address ON merchant.addressid = address.addressid `
    db.query(query, (err, fields) => {
        fields = fields.map(row => {
            row.datecreated = row.datecreated.toISOString().split('T')[0];
            
            return row;
        });
        res.status(200).json(fields)
    })
})

// register merchant
app.post('/registermerchant', (req, res) => {
    const {
        fulladdress, city, postcode, phoneaddress, note, // table address
        username, password, fullname, gender, email, phone, // table user
        postition, cardid, // table adminprinting
        merchantname, datecreated, opentime, closetime, merchantlogo  // table merchant
    } = req.body

    addressSQL = `INSERT INTO address (addressid, fulladdress, city, postcode, phoneAddress, note) VALUES 
        (NULL, '${fulladdress}', '${city}', '${postcode}', '${phoneaddress}', '${note}')`
    
    db.query(addressSQL, (err1, fields1)=>{ // add address
        if(err1) throw err1

        merchantSQL = `INSERT INTO merchant (merchantid, merchantname, datecreated, opentime, closetime, merchantlogo, ownerid, addressid) 
        VALUES (NULL, '${merchantname}', '${datecreated}', '${opentime}', '${closetime}', '${merchantlogo}', '', '${fields1.insertId}') `

        db.query(merchantSQL, (err2, fields2)=>{ // add merchant
            if(err2) throw err2
            
            userSQL = `INSERT INTO user (userid, username, password, fullname, gender, email, phone) 
            VALUES (NULL, '${username}', '${password}', '${fullname}', '${gender}', '${email}', '${phone}') `

            db.query(userSQL, (err3, fields3)=>{ // add user
                if(err3) throw err3

                adminprintingSQL = `INSERT INTO adminprinting (adminprintingid, position, cardid, merchantid, userid) 
                VALUES (NULL, '${postition}', '${cardid}', '${fields2.insertId}', '${fields3.insertId}') `

                db.query(adminprintingSQL, (err4, fields4)=>{ // add adminprinting
                    if(err4) throw err4
                    setAdminIdasOwner = `UPDATE merchant SET ownerid = '${fields4.insertId}' WHERE merchant.merchantid = '${fields2.insertId}'`
                    db.query(setAdminIdasOwner, (err5, fields5) => {
                        if(err5) throw err5
                        res.send('1')
                    })
                })
            })
        })
    })    
})

console.log(publicDir);
app.post('/uploadlogomerchant', (req, res) => {
    var form = new formidable.IncomingForm();
    let msg = ''
    let scode = 0
    form.parse(req, function (err, fields, files) {
    let typefile = files.anyfilesnames.mimetype
    let formatedType = typefile.split("/", 2);

        let oldpath = files.anyfilesnames.filepath;
        let filename = files.anyfilesnames.newFilename + Date.now() + `.${formatedType[1]}`
        let newpath = __dirname + "/upload/merchant/images/logo/" + filename;
        let fullUrl = req.protocol + '://' + req.get('host');
        let retPath = fullUrl + "/upload/merchant/images/logo/" + filename;
        mv(oldpath, newpath, function (err) {
            if (err) { 
                msg = err
                scode = 406
                throw err
            } else {
                msg = 'file uploaded successfully'
                scode = 202
            }

            res.status(200).json({
                resUpload: {
                    statusCode: scode,
                    filePath: retPath,
                    message: msg
                }
            })
        });
    });
});

app.post('/uploadproductmerchant', (req, res) => {
    console.log(req.body);
    res.send(req.body)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
