
const express = require('express')
const app = express()
const port = 3000
const bodyparser = require('body-parser')
const db = require('./connection/connection')
const response = require('./response')

app.use(bodyparser.json())

// routes / URL / endpoint 

app.get('/', (req, res) => {
    db.query("SELECT * FROM USER", (err, result) => {
        // DATA FROM MYSQL STORE IN HERE
        response(200, result, "get all data user", res)
    })
})

app.get('/data', (req, res) => {
    console.log({getDataName: req.query});
    req.send("Data berhasil di ambil")
})

app.post('/login', (req, res) => {
    console.log({requestFromOutside: req.body});
    res.send("Login berhasil")
})
  

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
