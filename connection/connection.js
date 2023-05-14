const mysql = require('mysql')
console.log('Runnin On Dev Mode');

const db = mysql.createConnection({
    host: "localhost", 
    user: "root", 
    password: "", 
    database: "opscoredb"
})

module.exports = db;