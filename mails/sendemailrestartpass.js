var nodemailer = require('nodemailer');
let resetpasswordMail = require('./emailresetpassword');

const resetpasswordSender = (email, pass, username, toemail, newpass, res) =>{
    let source = resetpasswordMail(username, newpass)
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
        subject: `Your password has been reset for username: ${username}`,
        html: source
    };
    console.log(`Trying to sending an reset password to ${toemail}`);
    transporter.sendMail(mailOptions, (err, info) => {
        if (err){
            console.log(err);
            res.send('0')
        } else {
            console.log('Email sent: ' + info.response);
            res.send('1')
        }
    });
}

module.exports = resetpasswordSender