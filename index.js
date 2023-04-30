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
const midtransClient = require('midtrans-client');

const formidable = require('formidable')
const mv = require('mv');
const pdf = require('pdf-page-counter');
const fs = require('fs')

const moment = require('moment')

// JWT
const jwt = require('jsonwebtoken');
const { env } = require('process')

app.use(cors({
    origin: "*",
    credentials: true
}));



app.use(bodyparser.json())
var publicDir = require('path').join(__dirname,'upload'); 
app.use('/upload',express.static(publicDir)); 
// routes / URL / endpoint

// Create Core API instance
let coreApi = new midtransClient.CoreApi({
    isProduction : false,
    serverKey : 'SB-Mid-server-YYKCkzbzFPs6OVWaOK6l5u-c',
    clientKey : 'SB-Mid-client-NNpoSwDqFwSM9IBG'
});

let snap = new midtransClient.Snap({
    isProduction : false,
    serverKey : 'SB-Mid-server-YYKCkzbzFPs6OVWaOK6l5u-c',
    clientKey : 'SB-Mid-client-NNpoSwDqFwSM9IBG'
});

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
                responseRegister(203, 0, null, null, res)
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

let datenow = `${year}-${month}-${date}`
console.log(datenow);


// req forgot password customer Reset password part 1
app.get('/forgetpassword', (req, res) => {

    db.query(`SELECT * FROM user WHERE user.email = '${req.query.email}'`, (err, result) => {
        if (err) throw err
        console.log("ini error" + err);
        if(result.length > 0){
            console.log(result[0].username);
            console.log("Generate Token");
            console.log(req.query.email);
            let encrypted = CryptoJS.AES.encrypt(req.query.email, process.env.LOCKED_API_PASSWORD + datenow);
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
    let decrypted = CryptoJS.AES.decrypt(replaced, process.env.LOCKED_API_PASSWORD + datenow);
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

    let decrypted = CryptoJS.AES.decrypt(replaced, process.env.LOCKED_API_PASSWORD + datenow);
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
        let fullUrl = req.protocol + '://' + req.get('host');
        let retPath = fullUrl + "/upload/order/document/" + filename;
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
        let tempProduct = []
        result.forEach(element => {
            db.query(`SELECT * FROM producttype WHERE producttype.productid = ${element.productid}`, (err, productType) => {
                db.query(`SELECT * FROM printquality WHERE printquality.productid = ${element.productid}`, (err, printQuality) => {
                    db.query(`SELECT * FROM productcolortype WHERE productcolortype.productid = ${element.productid}`, (err, printColors) => {
                        if(productType.length !== 0 && printQuality.length !== 0 && printColors.length !== 0){
                            tempProduct.push({
                                productOPS: element,
                                productService: {
                                    productTypeOPS: productType,
                                    printColorsOPS: printColors,
                                    printQualityOPS: printQuality
                                },
                            })
                        }
                        
                        if(result[result.length - 1] === element){
                            res.status(200).json(tempProduct)
                        }
                    });
                });
            });
            
        });
    })
})

// get all product by location
app.get('/ops-prod/city/:from', (req, res) => {
    const city = req.params.from
    console.log(req.params);
    let adSql = `SELECT * FROM product INNER JOIN merchant ON merchant.merchantid = product.merchantid INNER JOIN address 
        ON merchant.addressid = address.addressid
    `
    if(city !== '-1'){
        adSql = `SELECT * FROM product INNER JOIN merchant ON merchant.merchantid = product.merchantid INNER JOIN address 
        ON merchant.addressid = address.addressid WHERE address.city = '${city}'
    `
    }

    db.query(adSql, (err, result) => {
        let tempProduct = []
        result.forEach(element => {
            db.query(`SELECT * FROM producttype WHERE producttype.productid = ${element.productid}`, (err, productType) => {
                db.query(`SELECT * FROM printquality WHERE printquality.productid = ${element.productid}`, (err, printQuality) => {
                    db.query(`SELECT * FROM productcolortype WHERE productcolortype.productid = ${element.productid}`, (err, printColors) => {
                        if(productType.length !== 0 && printQuality.length !== 0 && printColors.length !== 0){
                            tempProduct.push({
                                productOPS: element,
                                productService: {
                                    productTypeOPS: productType,
                                    printColorsOPS: printColors,
                                    printQualityOPS: printQuality
                                },
                            })
                        }
                        
                        if(result[result.length - 1] === element){
                            res.status(200).json(tempProduct)
                        }
                    });
                });
            });
            
        });
    })
})

// get all product by category
app.get('/ops-prod/category/:from', (req, res) => {
    const category = req.params.from
    console.log(req.params);
    let adSql = `SELECT * FROM product INNER JOIN merchant ON merchant.merchantid = product.merchantid INNER JOIN address 
        ON merchant.addressid = address.addressid
    `
    let catSql = ''

    if(category !== '-1'){
        catSql = `AND producttype.category = '${category}'`
    }
    db.query(adSql, (err, result) => {
        let tempProduct = []
        result.forEach(element => {
            db.query(`SELECT * FROM producttype WHERE producttype.productid = ${element.productid} ${catSql}`, (err, productType) => {
                db.query(`SELECT * FROM printquality WHERE printquality.productid = ${element.productid}`, (err, printQuality) => {
                    db.query(`SELECT * FROM productcolortype WHERE productcolortype.productid = ${element.productid}`, (err, printColors) => {
                        if(productType.length !== 0 && printQuality.length !== 0 && printColors.length !== 0){
                            tempProduct.push({
                                productOPS: element,
                                productService: {
                                    productTypeOPS: productType,
                                    printColorsOPS: printColors,
                                    printQualityOPS: printQuality
                                },
                            })
                        
                        }
                        
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
            // row.datecreated = row.datecreated.toISOString().split('T')[0];
            row.datecreated = moment(row.datecreated).utc(8).format('YYYY-MM-DD')
            return row;
        });
        query1 = `SELECT COUNT(DISTINCT adminprintingid) AS 'total' FROM merchant 
            LEFT JOIN adminprinting ON adminprinting.merchantid = merchant.merchantid 
            GROUP BY merchant.merchantid
        `
        db.query(query1, (err1, fields1) => {
            fields.forEach((xDat, indx) => {
                fields[indx] = {merchdatas: xDat, admin: fields1[indx]}
            })
         res.status(200).json(fields)
        })
    })
})

// register merchant
app.post('/registermerchant', (req, res) => {
    const {
        fulladdress, city, postcode, phoneaddress, note, // table address
        username, password, fullname, gender, email, phone, // table user
        position, cardid, // table adminprinting
        merchantuname, merchantname, opentime, closetime, merchantlogo  // table merchant
    } = req.body

    if(fulladdress && city && postcode && phoneaddress && 
        username && password && fullname && gender && email && phone && 
        position && cardid && 
        merchantuname && merchantname && opentime && closetime && merchantlogo 
    ){
        addressSQL = `INSERT INTO address (addressid, fulladdress, city, postcode, phoneAddress, note) VALUES 
        (NULL, '${fulladdress}', '${city}', '${postcode}', '${phoneaddress}', '${note}')`
        db.query(addressSQL, (err1, fields1)=>{ // add address
            if(err1) throw err1
            merchantSQL = `INSERT INTO merchant (merchantid, merchantuname, merchantname, datecreated, opentime, closetime, merchantlogo, ownerid, addressid) 
            VALUES (NULL, '${merchantuname}', '${merchantname}', '${datenow}', '${opentime}', '${closetime}', '${merchantlogo}', '-1', '${fields1.insertId}') `
            db.query(merchantSQL, (err2, fields2)=>{ // add merchant
                if(err2) throw err2
                userSQL = `INSERT INTO user (userid, username, password, fullname, gender, email, phone) 
                VALUES (NULL, '${username}', '${password}', '${fullname}', '${gender}', '${email}', '${phone}') `
                db.query(userSQL, (err3, fields3)=>{ // add user
                    if(err3) throw err3
                    adminprintingSQL = `INSERT INTO adminprinting (adminprintingid, position, cardid, merchantid, userid) 
                    VALUES (NULL, '${position}', '${cardid}', '${fields2.insertId}', '${fields3.insertId}') `
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
    } else{
        res.send("-1")
    }

    
})

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


// developer add admin printing
app.get('/get-merchantadmin/:merchantid?', (req, res) => {
    let query = `SELECT * FROM merchant INNER JOIN adminprinting ON merchant.merchantid = 
        adminprinting.merchantid INNER JOIN user ON adminprinting.userid = 
        user.userid WHERE merchant.merchantid = '${req.params.merchantid}'`

    db.query(query, (err, fields) => {
        fields = fields.map(row => {
            row.datecreated = moment(row.datecreated).utc(8).format('YYYY-MM-DD')
            return row;
        });
        res.status(200).json(fields)
    })
})

app.post('/uploadproductmerchant', (req, res) => {
    console.log(req.body);
    res.send(req.body)
})

app.post('/decode-jwt-from-angular', (req, res) => {
    res.send(req.body.params)
})

// Developer Login with this code
app.post('/secure/net/login', (req, res) => {
    const {username, password} = req.body
    console.log(req.body);
    if(username && password){
        let query = `SELECT * FROM user INNER JOIN developer ON user.userid = developer.userid WHERE username = '${username}' AND password = '${password}'`
        db.query(query, (err, fields) => {
            console.log(fields);
            if(fields.length > 0){
                var token = jwt.sign({fields}, process.env.LOCKED_SECREAT_JWT);
                res.send({statusLogin: '1', authLogin: token})
            } else {
                res.send({statusLogin: '-2'})
            }
        })

    } else {
        res.send({statusLogin: '-1'})
    }
})

// check dev login auth if its true
app.post('/secure/net/check/dev/auth', (req, res) => {
    let AUTH = req.body.authdev
    try {
        var decoded = jwt.verify(AUTH, process.env.LOCKED_SECREAT_JWT);
        console.log(decoded.fields);
        let query = `SELECT user.userid, username, fullname, gender, email, phone, devid, position
            FROM user INNER JOIN developer ON user.userid = developer.userid WHERE username = '${decoded.fields[0].username}' AND password = '${decoded.fields[0].password}'`
        db.query(query, (err, fields) => {
            if(fields){
                res.send({statQuo: '1', datax: fields})
            } else {
                res.send({statQuo: '-2'})
            }
        })
    } catch(err) {
        console.log(err);
        console.log('Error Session Developer From Outside');
        res.send('-1')
    } 
})

//  Get Merchant Details by id
app.get('/show-merchant/details/:merchantid?', (req, res) => {
    let query = `SELECT * FROM merchant INNER JOIN address ON merchant.addressid = address.addressid WHERE merchantid = ${req.params.merchantid}`
    try {
        db.query(query, (err, fields) => {
            fields = fields.map(row => {
                row.datecreated = moment(row.datecreated).utc(8).format('YYYY-MM-DD')
                return row;
            });
            console.log(fields);
            res.send({statusCode: '1', data: fields})
        })
    } catch (error) {
        res.send({statusCode: '-1'})
    }
})


// delete merhcant from developer
app.post('/unchanges/developer/delete/merchant', (req, res) => {
    const {merchantid, addressid} = req.body
    let query1 = `DELETE ` + `user` +` FROM user INNER JOIN adminprinting ON user.userid = adminprinting.userid WHERE adminprinting.merchantid = ${merchantid}`
    let query2 = `DELETE address FROM address INNER JOIN merchant ON address.addressid = merchant.addressid WHERE merchant.addressid = ${addressid}`
   
    db.query(query1, (err) => {
        if (err) {console.log(err); res.send('-1')}
        db.query(query2, (err2) => {
            if(err2){console.log(err2); res.send('-2')}
            res.send('1')
        })
    })
    
})


// update merchant codes
app.put('/changes/developer/update/merchant', (req, res) => {
    const {
        // Merchant Info
        merchantid, edmerchuname, edmerchname, edmerchdate,
        edmerchopen, edmerchclose, edmerchantlogo,
        // Merchant Address
        addressid, edmerchaddress, edmerchcity, edmerchpostcode, 
        edmerchtcp, edmerchtinfo
    } = req.body

    sqlMerchant = `UPDATE merchant SET merchantuname = '${edmerchuname}',
        merchantname = '${edmerchname}', datecreated = '${edmerchdate}',
        opentime = '${edmerchopen}', closetime = '${edmerchclose}',
        merchantlogo = '${edmerchantlogo}'
        WHERE merchant.merchantid = ${merchantid}
    `
    sqlAddress = `UPDATE address SET fulladdress = '${edmerchaddress}', city = 
        '${edmerchcity}', postcode = '${edmerchpostcode}', phoneAddress = '${edmerchtcp}', 
        note = '${edmerchtinfo}' WHERE address.addressid = ${addressid}
    `

    if(edmerchantlogo === "" || edmerchantlogo === null){
        sqlMerchant = `UPDATE merchant SET merchantuname = '${edmerchuname}',
            merchantname = '${edmerchname}', datecreated = '${edmerchdate}', 
            opentime = '${edmerchopen}', closetime = '${edmerchclose}'
            WHERE merchant.merchantid = ${merchantid}
        `    
    }
    
    let msg = [], statusCode = '1'
    db.query(sqlMerchant, (err, fields) => {
        console.log(fields);
        if(err){
            msg.push(err)
            statusCode = '-1'
        }
        db.query(sqlAddress, (err1, fields1) => {
            console.log({st: 'AR', fields1});
            if(err1){
                msg.push(err1)
                statusCode = '-2'
            }
            res.send({msg, statusCode})
            
        })
    
    })
})

// Dev Admin Printing API
// Register New admin
app.post('/changes/developer/post/merchant/admin', (req, res) => {
    const {
        merchantid,
        username, password, fullname, gender, email, phone, // table user
        position, cardid, // table adminprinting
    } = req.body

    if(username && password && fullname && gender && email && phone && position && cardid && merchantid) {
        userSQL = `INSERT INTO user (userid, username, password, fullname, gender, email, phone) 
        VALUES (NULL, '${username}', '${password}', '${fullname}', '${gender}', '${email}', '${phone}') `
        db.query(userSQL, (err, fields)=>{ // add user
            if(err){console.log(err)}
            console.log(fields)
            adminprintingSQL = `INSERT INTO adminprinting (adminprintingid, position, cardid, merchantid, userid) 
            VALUES (NULL, '${position}', '${cardid}', '${merchantid}', '${fields.insertId}') `
            db.query(adminprintingSQL, (err1, fields1) => {
                if(err1){console.log(err1)}
                res.send('1')
            })
        })
    } else {
        res.send('-2')
    }
})

// dev delete admin merchant
app.post('/unchanges/developer/delete/merchant/admin', (req, res) => {
    const {userid} = req.body
    let query1 = `DELETE ` + `user` +` FROM user  WHERE userid = ${userid}`
    db.query(query1, (err) => {
        if (err) {console.log(err); res.send('-2')}
        res.send('1')
    })
})

// dev edit admin merchant
app.put('/changes/developer/update/merchant/admin', (req, res) => {
    const {
        merchantid, userid,
        username, fullname, gender, email, phone, // table user
        position, cardid, // table adminprinting
    } = req.body

    console.log(req.body);
    if(username && userid && fullname && gender && email && phone && position && cardid && merchantid) {
        userSQL = `
            UPDATE `+`user`+` SET username = '${username}', 
                fullname = '${fullname}', gender = '${gender}', 
                email = '${email}', phone = '${phone}' WHERE userid = '${userid}'
        `
        adminprintingSQL = `
            UPDATE adminprinting SET position = '${position}', 
                cardid = '${cardid}' WHERE adminprinting.userid = '${userid}'
        `
        try {
            db.query(userSQL, (err, fields) => {
                if(err){console.log(err)}
                db.query(adminprintingSQL, (err1, fields1) => {
                    if(err1){console.log(err1)}
                    res.send('1')
                })
            })
        } catch (error) {
            res.send('-3')
        }
    } else {
        res.send('-2')
    }
})

app.get('/product/category', (req, res) => {
    sql = 'SELECT DISTINCT category FROM producttype'
    db.query(sql, (err, fields) => {
        if(err)throw err
        res.send(fields)
    })
})

app.get('/product/location', (req, res) => {
    sql = 'SELECT DISTINCT city FROM merchant INNER JOIN address ON merchant.addressid = address.addressid INNER JOIN product ON merchant.merchantid = product.merchantid'
    db.query(sql, (err, fields) => {
        if(err)throw err
        res.send(fields)
    })
})

// Dev Get Merchant Product Total
app.get('/show/merchant/product/total', (req, res) => {
    query = `SELECT * FROM merchant INNER JOIN address ON merchant.addressid = address.addressid `
    db.query(query, (err, fields) => {
        fields = fields.map(row => {
            // row.datecreated = row.datecreated.toISOString().split('T')[0];
            row.datecreated = moment(row.datecreated).utc(8).format('YYYY-MM-DD')
            return row;
        });
        query1 = `SELECT COUNT(DISTINCT productid) AS 'total' FROM merchant 
            LEFT JOIN product ON product.merchantid = merchant.merchantid 
            GROUP BY merchant.merchantid
        `
        db.query(query1, (err1, fields1) => {
            fields.forEach((xDat, indx) => {
                fields[indx] = {merchdatas: xDat, prod: fields1[indx]}
            })
         res.status(200).json(fields)
        })
    })
})

app.get('/show/merchant/product/detail/:idmerch', (req, res) => {
    db.query(`SELECT * FROM product INNER JOIN merchant ON merchant.merchantid = product.merchantid WHERE merchant.merchantid = '${req.params.idmerch}'`, (err, result) => {
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

app.get('/show/merchant/product/details/:idprod', (req, res) => {
    let tempProduct = []
    db.query(`SELECT * FROM producttype WHERE producttype.productid = ${req.params.idprod}`, (err, productType) => {
        db.query(`SELECT * FROM printquality WHERE printquality.productid = ${req.params.idprod}`, (err, printQuality) => {
            db.query(`SELECT * FROM productcolortype WHERE productcolortype.productid = ${req.params.idprod}`, (err, printColors) => {
                tempProduct.push({
                    productService: {
                        productTypeOPS: productType,
                        printColorsOPS: printColors,
                        printQualityOPS: printQuality
                    },
                })
                res.status(200).json(tempProduct)
            });
        });
    });          
})

// developer insert new product
app.post('/changes/developer/post/merchant/product', (req, res) => {
    console.log(req.body)
    const {merchantid, producttitle, productdescription, category} = req.body
    if(merchantid && producttitle && productdescription && category){
        query = `INSERT INTO product (productid, producttitle, productdescription, category, merchantid) VALUES 
        (NULL, '${producttitle}', '${productdescription}', '${category}', '${merchantid}')`
        db.query(query, (err, fields) => {
            if(err) throw err
            if(fields.affectedRows > 0){
                res.send('1')
            }
        })
    } else {
        res.send('-2')
    }
})

// developer upload image for product type
app.post('/changes/developer/post/merchant/product/image', (req, res) => {
    var form = new formidable.IncomingForm();
    let msg = ''
    let scode = 0
    form.parse(req, function (err, fields, files) {
    let typefile = files.anyfilesnames.mimetype
    let formatedType = typefile.split("/", 2);

        let oldpath = files.anyfilesnames.filepath;
        let filename = files.anyfilesnames.newFilename + Date.now() + `.${formatedType[1]}`
        let newpath = __dirname + "/upload/merchant/images/product/" + filename;
        let fullUrl = req.protocol + '://' + req.get('host');
        let retPath = fullUrl + "/upload/merchant/images/product/" + filename;
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

// developer insert new product type
app.post('/changes/developer/post/merchant/product/types', (req, res) => {
    console.log(req.body);
    const {productid, category, producttitle, quantity, paperprice, imageProduct} = req.body
    if(productid && category && producttitle && quantity && paperprice && imageProduct){
        sql = `INSERT INTO producttype (productypeid, productid, category, papertype, quantity, paperprice, imageurl) VALUES 
            (NULL, '${productid}', '${category}', '${producttitle}', '${quantity}', '${paperprice}', '${imageProduct}')`     
        try {
            db.query(sql, (err, fields) => {
                if(err) throw err
                if(fields.affectedRows > 0){
                    res.send('1')
                }
            })
        } catch (error) {
            res.send('-1')
        }
    } else {
        res.send('-2')
    }
    
})

// developer insert new product color
app.post('/changes/developer/post/merchant/product/color', (req, res) => {
    const {colortype, colorfee, productid} = req.body
    if(colortype && colorfee && productid){
        sql = `INSERT INTO productcolortype (colortypeid, colortype, colorfee, productid) 
            VALUES (NULL, '${colortype}', '${colorfee}', '${productid}')`
        try {
            db.query(sql, (err, fields) => {
                if(err) throw err
                if(fields.affectedRows > 0){
                    res.send('1')
                }
            })
        } catch (error) {
            res.send('-1')
        }
    } else {
        res.send('-2')
    }
})

// developer insert new product quality
app.post('/changes/developer/post/merchant/product/quality', (req, res) => {
    const {printquality, printqualityfee, productid} = req.body
    if(printquality && printqualityfee && productid){
        sql = `INSERT INTO printquality (printqualityid, printquality, printqualityfee, productid) 
            VALUES (NULL, '${printquality}', '${printqualityfee}', '${productid}')`
        try {
            db.query(sql, (err, fields) => {
                if(err) throw err
                if(fields.affectedRows > 0){
                    res.send('1')
                }
            })
        } catch (error) {
            res.send('-1')
        }
    } else {
        res.send('-2')
    }
})

// Developer Delete Product
app.delete('/unchanges/developer/post/merchant/product/:id', (req, res) => {
    const productId = req.params.id
    if(productId){
        sql = `DELETE FROM product WHERE product.productid = '${productId}'`
        try {
            db.query(sql, (err, fields) => {
                if(err) throw err
                if(fields.affectedRows > 0){
                    res.send('1')
                }
            })
        } catch (error) {
            res.send('-1')
        }
    } else {
        res.send('-2')
    }
})

// Developer Delete Product Type
app.delete('/unchanges/developer/post/merchant/product/type/:id', (req, res) => {
    const productypeid = req.params.id
    if(productypeid){
        sql = `DELETE FROM producttype WHERE producttype.productypeid = '${productypeid}'`
        try {
            db.query(sql, (err, fields) => {
                if(err) throw err
                if(fields.affectedRows > 0){
                    res.send('1')
                }
            })
        } catch (error) {
            res.send('-1')
        }
    } else {
        res.send('-2')
    }
})

// Developer Delete Print Color
app.delete('/unchanges/developer/post/merchant/product/print/color/:id', (req, res) => {
    const colortypeid = req.params.id
    if(colortypeid){
        sql = `DELETE FROM productcolortype WHERE productcolortype.colortypeid = '${colortypeid}'`
        try {
            db.query(sql, (err, fields) => {
                if(err) throw err
                if(fields.affectedRows > 0){
                    res.send('1')
                }
            })
        } catch (error) {
            res.send('-1')
        }
    } else {
        res.send('-2')
    }
})

// Developer Delete Print Quality
app.delete('/unchanges/developer/post/merchant/product/print/quality/:id', (req, res) => {
    const printqualityid = req.params.id
    if(printqualityid){
        sql = `DELETE FROM printquality WHERE printquality.printqualityid = '${printqualityid}'`
        try {
            db.query(sql, (err, fields) => {
                if(err) throw err
                if(fields.affectedRows > 0){
                    res.send('1')
                }
            })
        } catch (error) {
            res.send('-1')
        }
    } else {
        res.send('-2')
    }
})

// Developer Update Product
app.post('/changes/developer/update/merchant/product', (req, res) => {
    const {productid, producttitle, productdescription, category} = req.body
    
    if(productid && producttitle && productdescription && category){
        sql = `UPDATE product SET producttitle = '${producttitle}', 
            productdescription = '${productdescription}', 
            category = '${category}' WHERE product.productid = '${productid}'
        `
        try {
            db.query(sql, (err, fields) => {
                if(err) throw err
                if(fields.affectedRows > 0){
                    res.send('1')
                }
            })
        } catch (error) {
            res.send('-1')
        }
    } else {
        res.send('-2')
    }
})

// Developer Update Product Type
app.post('/changes/developer/update/merchant/product/type', (req, res) => {
    console.log(req.body);
    const { productypeid, producttitle, category, imageurl, quantity, paperprice} = req.body
    let sql = ''
    if(productypeid && producttitle && category && quantity && paperprice){
        if(imageurl){
            sql = `UPDATE producttype SET category = '${category}', 
                papertype = '${producttitle}', quantity = '${quantity}', 
                paperprice = '${paperprice}', imageurl = '${imageurl}' 
                WHERE producttype.productypeid = ${productypeid}
            `
            try {
                db.query(sql, (err, fields) => {
                    if(err) throw err
                    if(fields.affectedRows > 0){
                        res.send('1')
                    }
                })
            } catch (error) {
                res.send('-1')
            }
        } else {
            sql = `UPDATE producttype SET category = '${category}', 
                papertype = '${producttitle}', quantity = '${quantity}', 
                paperprice = '${paperprice}' WHERE producttype.productypeid = ${productypeid}
            `
            try {
                db.query(sql, (err, fields) => {
                    if(err) throw err
                    if(fields.affectedRows > 0){
                        res.send('1')
                    }
                })
            } catch (error) {
                res.send('-1')
            }
        }
    } else {
        res.send('-2')
    }
})

// Developer Update Print Color
app.post('/changes/developer/update/merchant/product/print/color', (req, res) => {
    console.log(req.body);
    const {colortypeid, colortype, colorfee} = req.body
    if(colortypeid && colortype && colorfee){
        sql = `UPDATE productcolortype SET colortype = '${colortype}', 
            colorfee = '${colorfee}' WHERE productcolortype.colortypeid = '${colortypeid}'
        `
        try {
            db.query(sql, (err, fields) => {
                if(err) throw err
                if(fields.affectedRows > 0){
                    res.send('1')
                }
            })
        } catch (error) {
            res.send('-1')
        }
    } else {
        res.send('-3')
    }
})

// Developer Update Print Quality
app.post('/changes/developer/update/merchant/product/print/quality', (req, res) => {
    const {printqualityid, printquality, printqualityfee} = req.body
    console.log(req.body);
    if(printqualityid && printquality && printqualityfee){
        sql = `UPDATE printquality SET printquality = '${printquality}', 
            printqualityfee = '${printqualityfee}' WHERE printquality.printqualityid = ${printqualityid}
        `
        try {
            db.query(sql, (err, fields) => {
                if(err){
                    res.send('-4')
                }
                if(fields.affectedRows > 0){
                    res.send('1')
                }
            })
        } catch (error) {
            res.send('-1')
        }
    } else {
        res.send('-3')
    }
})

// Admin Printing / Merchant Login Here
app.post('/secure/merchant/login', (req, res) => {
    const {username, password} = req.body
    console.log(req.body);
    if(username && password){
        let query = `SELECT * FROM user INNER JOIN adminprinting ON user.userid = adminprinting.userid WHERE username = '${username}' AND password = '${password}'`
        db.query(query, (err, fields) => {
            if(fields.length > 0){
                var token = jwt.sign({fields}, process.env.LOCKED_SECREAT_JWT);
                res.send({statusLogin: '1', authLogin: token})
            } else {
                res.send({statusLogin: '-2'})
            }
        })

    } else {
        res.send({statusLogin: '-1'})
    }
})

// Admin Printing / Merchant check login auth
app.post('/secure/merchant/check/auth', (req, res) => {
    let AUTH = req.body.authmerch
    console.log(AUTH);

    try {
        var decoded = jwt.verify(AUTH, process.env.LOCKED_SECREAT_JWT);
        console.log(decoded)
        console.log(decoded.fields);
        let query = `SELECT user.userid, username, fullname, gender, email, phone, adminprintingid, adminprintingid, position, merchantid
            FROM user INNER JOIN adminprinting ON user.userid = adminprinting.userid WHERE username = '${decoded.fields[0].username}' AND password = '${decoded.fields[0].password}'`
        db.query(query, (err, fields) => {
            if(fields){
                res.send({statQuo: '1', datax: fields})
            } else {
                res.send({statQuo: '-2'})
            }
        })
    } catch(err) {
        console.log(err);
        console.log('Error Session Developer From Outside');
        res.send('-1')
    } 
})

app.post('/save/order/to/cart', (req, res) => {
    const {
        copies, pages, totalquantity, totalcost, color, quality, 
        papertype, inputedfile, orderNote, productid, consumerid
    } = req.body
    try {
        let query = `
            INSERT INTO orderdata (orderid, numofcopies, pages, totalquantity, 
                totalcost, colortype, printingquality, productype, fileprintingurl, ordernote, 
                orderStatus, transactionid, productid, consumerid) 
            VALUES 
            (NULL, '${copies}', '${pages}', '${totalquantity}', 
            '${totalcost}', '${color}', '${quality}', '${papertype}', '${inputedfile}', 
            '${orderNote}', 'Pending', '-1', '${productid}', '${consumerid}') 
        `
        db.query(query, (err, fields) => {
            console.log(fields);
            if(fields){
                res.send('1')
            } else {
                res.send('-1')
            }
        })
    } catch(err) {
        console.log(err);
        res.send('-2')
    } 
})

app.post('/delete/order/from/cart', (req, res) => {
    const { orderid } = req.body
    let query = `DELETE FROM orderdata WHERE orderid = '${orderid}}'`
    try{
        db.query(query, (err, fields) => {
            res.send('1')
        })
    } catch (err) {
        console.log(err);
        res.send('-2')
    }
})

app.get('/customer/view/cart/:id', (req, res) => {
    const id = req.params.id
    try{
        let query = `
        SELECT * FROM orderdata INNER JOIN product ON product.productid = orderdata.productid INNER JOIN producttype ON orderdata.productid = producttype.productid INNER JOIN productcolortype ON orderdata.productid = productcolortype.productid INNER JOIN printquality ON orderdata.productid = printquality.productid INNER JOIN merchant ON product.merchantid = merchant.merchantid WHERE orderdata.productype = producttype.papertype AND orderdata.colortype = productcolortype.colortype AND orderdata.orderStatus = 'Pending' AND orderdata.printingquality = printquality.printquality AND orderdata.consumerid = '${id}'
        `
        db.query(query, (err, fields) => {
            if(fields){
                fields = fields.map(row => {
                    // row.datecreated = row.datecreated.toISOString().split('T')[0];
                    row.datecreated = moment(row.datecreated).utc(8).format('YYYY-MM-DD')
                    return row;
                });
                res.send({status: '1', fields})
            } else {
                res.send({status: '-1'})
            }
        })
    } catch (err) {
        console.log(err);
        res.send('-2')
    }
})

app.get('/testsql', (req, res) => {
    let query = `
    SELECT * FROM orderdata INNER JOIN product ON product.productid = orderdata.productid INNER JOIN producttype ON orderdata.productid = producttype.productid INNER JOIN productcolortype ON orderdata.productid = productcolortype.productid INNER JOIN printquality ON orderdata.productid = printquality.productid INNER JOIN merchant ON product.merchantid = merchant.merchantid WHERE orderdata.productype = producttype.papertype AND orderdata.colortype = productcolortype.colortype AND orderdata.orderStatus = 'Pending' AND orderdata.printingquality = printquality.printquality
    `
    db.query(query, (err, fields) => {
        fields = fields.map(row => {
            // row.datecreated = row.datecreated.toISOString().split('T')[0];
            row.datecreated = moment(row.datecreated).utc(8).format('YYYY-MM-DD')
            return row;
        });
        res.send(fields)
    })
})

// SANBOX PAYMENT
// =============UNDER CONSTRUCTION-------------- //
// app.post('/secure/consumer/payment', (req, res) => {

//     snap.createTransaction(req.body)
//     .then((transaction)=>{
//         // transaction token
//         let transactionToken = transaction.token;
//         console.log('transactionToken:',transactionToken);

//         // transaction redirect url
//         let transactionRedirectUrl = transaction.redirect_url;
//         console.log('transactionRedirectUrl:',transactionRedirectUrl);
//         res.json({
//             status: true,
//             msg: 'Success',
//             data: transactionRedirectUrl
//         })
//     })
//     .catch((e)=>{
//         console.log('Error occured:',e.message);
//         res.json({
//             status: false,
//             msg: e.message
//         })
//     });

//     // coreApi.charge(req.body).then((chargeResponse)=>{
//     //     let orderData = {
//     //         id: chargeResponse.order_id,
//     //         response_midtrans: JSON.stringify(chargeResponse)
//     //     }
//     //     res.json({
//     //         status: true,
//     //         msg: 'Success',
//     //         data: chargeResponse
//     //     })
//     // }).catch((e)=>{
//     //     console.log('Error occured:',e.message);
//     //     res.json({
//     //         status: false,
//     //         msg: e.message
//     //     })
//     // });
// })
// SANBOX PAYMENT
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})





