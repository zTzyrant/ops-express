const mysql = require('mysql')
const { env } = require('process')
console.log('Running On Prod Mode');

const db = mysql.createConnection({
    host: env.LOCKED_MySQL_host,
    port: env.LOCKED_MySQL_port,
    user: env.LOCKED_MySQL_user, 
    password: env.LOCKED_MySQL_password, 
    database: env.LOCKED_MySQL_database
})

module.exports = db;