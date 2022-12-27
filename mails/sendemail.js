
var nodemailer = require('nodemailer');
let templateMail = require('./templatemail');


const sendEmailOps = (email, pass, username, toemail) =>{
    let source = templateMail(username)
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: `${email}`,
            pass: `${pass}`
        }
    });

    var mailOptions = {
        from:  `${email}`,
        to: toemail,
        subject: 'Welcome To OPS Core',
        html: source
    };
    console.log("Trying to sending an email");
    transporter.sendMail(mailOptions, (err, info) => {
        if (err){
            console.log(err);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports = sendEmailOps