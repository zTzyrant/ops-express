const responseRegister = (statusCode, message, fields, res) => {
    res.status(statusCode).json({
        statusCode: statusCode,
        fields: fields,
        statussql: message
    })
}
module.exports = responseRegister