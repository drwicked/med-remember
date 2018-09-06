require('dotenv').config()
const express = require('express')
const axios = require('axios')
const bodyParser = require('body-parser')
const Sound = require('node-aplay')
const app = express()
const moment = require('moment')
const dirty = require('dirty')
const say = require('say')

const db = dirty('./med-remember.db')

const bitYes = new Sound('./sounds/yes44.wav')
const bitNo = new Sound('./sounds/no44.wav')

const token = process.env.POST_TOKEN || 'medrememberposttoken';

db.on('load', () => {
  console.log('database loaded')
  say.speak('Hello!')

})
app.use(bodyParser.json())
app.post('/meds/took', (req, res) => {
  if (req.body.token === token) {
    // get day-based key
    const today = moment().format('YYYYMMDD')
    // log full timestamp in database
    console.log(':: meds taken', today);
    db.set(today, moment().format());
  } else {
    console.log('invalid token')
    res.status(401);
    res.send('invalid token')
  }
})

app.get('/meds/diditake', (req, res) => {
  const today = moment().format('YYYYMMDD')
  const took = db.get(today);
  if (took) {
    bitYes.play();
    say.speak(`meds taken ${moment(took).fromNow()}`);
    console.log('I did take meds today', took)
    res.send(`meds taken ${moment(took).fromNow()}`)
  } else {
    bitNo.play()
    say.speak(`you haven't taken your meds today`)
    res.send(`no meds taken yet today`)
  }
})


app.post('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(8090, () => console.log('med-remember listening on port 8090!'))
