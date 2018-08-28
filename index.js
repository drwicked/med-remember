const express = require('express')
const app = express()
const moment = require('moment')

const dirty = require('dirty');
const db = dirty('./user.db');

db.on('load', () => {
  console.log('db loaded');
  db.forEach((key, val) => {
    console.log('key, val', key, val)
  })
})

app.post('/meds/took', (req, res) => {
  if (req.body.token === 'GARGANTUANTOKEN') {
    db.set(moment().format('YYYYMMDD'), moment().format());
    res.send(`meds took: ${moment().format()}`)
  } else {
    res.status(401);
    res.send('invalid token')
  }
})

app.post('/meds/diditake', (req, res) => {
  if (req.body.token === 'GARGANTUANTOKEN') {
    const today = moment().format('YYYYMMDD')
    console.log('today', today)
    const took = db.get(today);
    console.log('took', took)
    if (took) {
      res.send(`meds taken ${moment(took).fromNow()}`)
    } else {
      res.send(`no meds taken yet today`)
    }
  } else {
    res.status(401);
    res.send('invalid token')
  }
})


app.post('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(8090, () => console.log('Example app listening on port 8090!'))
