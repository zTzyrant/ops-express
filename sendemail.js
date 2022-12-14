require('dotenv').config()
var nodemailer = require('nodemailer');
const templateMail = require('./mails/templatemail');
console.log("iam here");

console.log(templateMail());
let source = templateMail()
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: `${process.env.EMAIL_OPS_CORE}`,
        pass: `${process.env.EMAIL_OPS_CORE_PSWD}`
    }
});

var mailOptions = {
    from:  `${process.env.EMAIL_OPS_CORE}`,
    to: 'angularkiddie@gmail.com',
    subject: 'Welcome To OPS Core',
    html: source
};
console.log("iam here");

transporter.sendMail(mailOptions, (err, info) => {
    console.log("iam here");
    if (err) throw err;
    console.log('Email sent: ' + info.response);
});