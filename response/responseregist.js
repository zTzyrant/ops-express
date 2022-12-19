const responseRegister = (statusCode, message, fields, keyLogin, res) => {
    res.status(statusCode).json({
        statusCode: statusCode,
        fields: fields,
        statussql: message,
        keySession: keyLogin
    })
}
module.exports = responseRegister