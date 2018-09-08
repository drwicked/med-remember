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

var pitft = require("pitft");

var fb = pitft("/dev/fb1"); // Returns a framebuffer in direct mode.  See the clock.js example for double buffering mode

// Clear the screen buffer

var xMax = fb.size().width;
var yMax = fb.size().height;
fb.color(1, 1, 1);

// for (var n=0; n<1000; n++) {
//     var x = Math.random() * (xMax + 32) - 16;
//     var y = Math.random() * (yMax + 32) - 16;

//     fb.image(x, y, "raspberry-pi-icon.png");
// }

const bitYes = new Sound('./sounds/yes44.wav')
const bitNo = new Sound('./sounds/no44.wav')

const token = process.env.POST_TOKEN || 'medrememberposttoken';

const framebufferText = (text) => {
  fb.clear();
  fb.font("fantasy", 32, true);
  fb.text(xMax, yMax/2, text, false, 0, true);
}

let textString = '#temp° :: #time'
let f = 0.0;


const getWeather = async () => {
  await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=Austin&appid=${process.env.OWM_TOKEN}&units=imperial`).then((response) => {
    console.log('response', response)
    const { weather, main: { temp } } = response.data;
    console.log('weather', weather)
    return { temp };
  }).catch(function (error) {
    console.log(error);
    return error;
  })
}
const weatherData = getWeather();
console.log('weatherData', weatherData)
setInterval(() => {
  fb.clear()
  framebufferText(textString.replace('#temp', f).replace('#time', moment().format('h:mm a') ))
}, 1000);

db.on('load', () => {
  console.log('database loaded')
  say.speak('Hello!')

})
app.use(bodyParser.json())
app.use(express.static('public'))

// app.ws('/echo', function(ws, req) {
//   ws.on('message', function(msg) {
//     ws.send(msg);
//   });
// });

const msg = 'data'

app.get('/status', (req, res) => {
  res.send(msg)
})

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
    framebufferText(`Took meds: ${moment(took).fromNow()}`)
    setTimeout(() => fb.clear(), 20000)
    say.speak(`meds taken ${moment(took).fromNow()}`);
    console.log('I did take meds today', took)
    res.send(`meds taken ${moment(took).fromNow()}`)

  } else {
    bitNo.play()
    framebufferText(`take your meds`)
    setTimeout(() => fb.clear(), 20000)
    say.speak(`you haven't taken your meds today`)
    res.send(`no meds taken yet today`)
  }
})


app.listen(8090, () => console.log('med-remember listening on port 8090!'))
