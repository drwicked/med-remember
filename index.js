require('dotenv').config()
const express = require('express')
const axios = require('axios')
const bodyParser = require('body-parser')
const app = express()
const moment = require('moment')

const token = process.env.POST_TOKEN || 'medrememberposttoken';

const medsTaken = {};

app.use(bodyParser.json())
app.post('/meds/took', (req, res) => {
  if (req.body.token === token) {
    // get day-based key
    const today = moment().format('YYYYMMDD')
    medsTaken[today] = moment().format();
    console.log('meds taken', today);
  } else {
    res.status(401);
    res.send('invalid token')
  }
})

app.get('/meds/diditake', (req, res) => {
  const today = moment().format('YYYYMMDD')
  const took = medsTaken[today];
  if (took) {
    axios.post(`https://maker.ifttt.com/trigger/meds_taken/with/key/${process.env.IFTTT_TOKEN}`).then(response => {
      console.log('I did take meds today', took)
      res.send(`meds taken ${moment(took).fromNow()}`)
    }).catch(error => console.error('error', error))
  } else {
    axios.post(`https://maker.ifttt.com/trigger/no_meds_taken/with/key/${process.env.IFTTT_TOKEN}`).then(response => {
      console.log(`no meds taken yet today`)
      res.send(`no meds taken yet today`)
    }).catch(error => console.error('error', error))
  }
})


app.post('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(8090, () => console.log('Example app listening on port 8090!'))
