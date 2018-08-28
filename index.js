const express = require('express')
const axios = require('axios')
const bodyParser = require('body-parser')
const Sound = require('node-aplay')
const app = express()
const moment = require('moment')

const dirty = require('dirty')
const db = dirty('./user.db')

const bitYes = new Sound('./sounds/tron_bit_yes.wav')
const bitNo = new Sound('./sounds/tron_bit_no.wav')

const token = 'GARGANTUANTOKEN';

db.on('load', () => {
  console.log('database loaded')
})
app.use(bodyParser.json())
app.post('/meds/took', (req, res) => {
  if (req.body.token === token) {
    // get day-based key
    const today = moment().format('YYYYMMDD')
    // log in database
    db.set(today, moment().format());
    console.log('meds taken', today);
  } else {
    res.status(401);
    res.send('invalid token')
  }
})

app.get('/meds/diditake', (req, res) => {
  const today = moment().format('YYYYMMDD')
  const took = db.get(today);
  if (took) {
    bitYes.play()
    axios.post('https://maker.ifttt.com/trigger/meds_taken/with/key/dOdmGPvU-ZzrTG5owb8EZz').then(response => {
      console.log('I did take meds today', took)
      res.send(`meds taken ${moment(took).fromNow()}`)
    }).catch(error => console.error('error', error))
  } else {
    bitNo.play()
    axios.post('https://maker.ifttt.com/trigger/no_meds_taken/with/key/dOdmGPvU-ZzrTG5owb8EZz').then(response => {
      console.log(`no meds taken yet today`)
      res.send(`no meds taken yet today`)
    }).catch(error => console.error('error', error))
  }
})


app.post('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(8090, () => console.log('Example app listening on port 8090!'))
