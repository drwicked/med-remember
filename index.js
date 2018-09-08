require('dotenv').config()
const express = require('express')
const axios = require('axios')
const bodyParser = require('body-parser')
const Sound = require('node-aplay')
const app = express()
const moment = require('moment')
const dirty = require('dirty')
const say = require('say')
const wget = require('wget-improved')
var fs = require('fs')

const shortMoment = moment;
shortMoment.locale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s',
    s:  's',
    ss: '%ss',
    m:  '1m',
    mm: '%dm',
    h:  '1h',
    hh: '%dhrs',
    d:  '1d',
    dd: '%dd',
    M:  '1M',
    MM: '%dM',
    y:  '1Y',
    yy: '%dY'
  }
});


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

let textString = '#temp :: #time'
let f = 0.0;
let medsMsg = ''

const getTimeEmoji = (time) => {
  const hour = parseInt(moment().format('HH'))
  console.log('hour', hour)
  if (hour > 20) return '🍸';
  return '🥃';
}
let weatherData = {}

const getWeather = async () => {
  const {
    data: {
      weather,
      wind: { speed },
      main: { temp, humidity, temp_min, temp_max },
      sys: { sunrise, sunset },
    } 
  } = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=Austin&appid=${process.env.OWM_TOKEN}&units=imperial`).catch(err => console.log(err))
  console.log('weather', weather)
  const [{ main, icon }] = weather
  if (!fs.existsSync(path)) {
    wget.download(`http://openweathermap.org/img/w/${icon}.png`, `images/${icon}.png`).on('end', (output) => {
      console.log('output', output);
    })
  } else {
    console.log('ignore');
  }
  weatherData = {
    weatherType: main,
    windSpeed: speed,
    temp,
    humidity,
    temp_min,
    temp_max,
    sunrise,
    sunset,
    icon: `./images/${icon}.png`
  }
  console.log('weatherData', weatherData)
  return `${Math.round(temp)}° | ${humidity}%`;
}
let weatherString = '';
(async function() {
  weatherString = await getWeather();
})()

console.log('weatherString', weatherString)
setInterval(async () => {
  weatherString = await getWeather()
}, 120000);
setInterval(() => {
  fb.clear()
  const timeString = moment().format('h:mm a');
  // framebufferText(textString.replace('#temp', weatherString).replace('#time', timeString ))
  const {
    weatherType,
    windSpeed,
    temp,
    humidity,
    temp_min,
    temp_max,
    sunrise,
    sunset,
    icon,
  } = weatherData;
  fb.font("fantasy", 32, true);
  fb.text(6, 32, weatherString, false, 0, false);
  fb.text(xMax - 6, 32, timeString, false, 0, true);
  fb.font("fantasy", 16, true);
  const sunsetTime = moment(sunset*1000).local().format('h:mm a');
  fb.text(xMax - 6, 58, sunsetTime, false, 0, true);
  fb.text(36, 64, weatherType, false, 0, false);
  fb.image(6, 34, icon);
  fb.text(110, 88, windSpeed, false, 0, false);
  fb.text(6, 88, `${Math.round(temp_min)}° / ${Math.round(temp_max)}°`, false, 0, false);
  fb.font("fantasy", 12, true);
  fb.text(8, 104, ' lo       hi', false, 0, false);
  const medsTook = db.get(moment().format('YYYYMMDD'))
  if (medsTook) {
    // show took meds msg

    const ago = shortMoment(medsTook).fromNow();
    fb.font("fantasy", 18);
    fb.text(26, yMax - 112, ago, false, 0, false);
    fb.image(10, yMax - 96, "medical.png");
  }
  if (parseInt(moment().format('HH')) >= 20) {
    fb.image(100, yMax - 96, "vodka.png");
  }
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
    // framebufferText()
    medsMsg = `Took meds: ${moment(took).fromNow()}`;
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
