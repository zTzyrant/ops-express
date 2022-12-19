
var nodemailer = require('nodemailer');
let templateMail = require('./mails/templatemail');


const sendEmailOps = (email, pass, username, res) =>{
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
        to: 'angularkiddie@gmail.com',
        subject: 'Welcome To OPS Corexv',
        html: source
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) return res.send(`Error: ${err}`);
        console.log('Email sent: ' + info.response);
        res.send(`Email sent: ${info.response}`)
    });
}

module.exports = sendEmailOps