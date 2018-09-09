require('dotenv').config()
const express = require('express')
const axios = require('axios')
const bodyParser = require('body-parser')
const Sound = require('node-aplay')
const app = express()
const moment = require('moment-holiday')
require("moment-duration-format")(moment);
const dirty = require('dirty')
const say = require('say')
const wget = require('wget-improved')
const fs = require('fs')
const $ = require('cheerio')
const DashButton = require('node-dash-button')

const shortMoment = moment;
shortMoment.updateLocale('en', {
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

let button = new DashButton(process.env.DASH_MAC, null, null, 'all');

const db = dirty('./med-remember.db')

var pitft = require("pitft");

var fb = pitft("/dev/fb1"); // Returns a framebuffer in direct mode.  See the clock.js example for double buffering mode

// Clear the screen buffer

var xMax = fb.size().width;
var yMax = fb.size().height;

// for (var n=0; n<1000; n++) {
//     var x = Math.random() * (xMax + 32) - 16;
//     var y = Math.random() * (yMax + 32) - 16;

//     fb.image(x, y, "raspberry-pi-icon.png");
// }

const bitYes = new Sound('./sounds/yes44.wav')
const bitNo = new Sound('./sounds/no44.wav')
const ding = new Sound('./sounds/ding.wav')

const token = process.env.POST_TOKEN || 'medrememberposttoken';


const weatherDb = dirty('./weather.db')
const buttonPresses = dirty('./buttons.db')
let lastPressed = 0;
let subscription = button.on('detected', () => {
  const today = moment().format('YYYYMMDDa')
  ding.play()
  console.log('button pressed', today);
  const now = moment().valueOf()
  if ((now - lastPressed) > 60000) {
    lastPressed = now
    if (buttonPresses.get(today)) {
      buttonPresses.update(today, (val) => {
        return parseInt(val || 0) + 1
      });
    } else {
      buttonPresses.set(today, 1)
    }
  } else {
    console.log('pressed too recently')
  }
});

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
let nextHoliday = {}

const getWeather = async () => {
  const {
    data: {
      weather,
      wind: { speed },
      rain,
      main: { temp, humidity, temp_min, temp_max },
      sys: { sunrise, sunset },
    } 
  } = await axios.get(`http://api.openweathermap.org/data/2.5/weather?zip=78705,us&appid=${process.env.OWM_TOKEN}&units=imperial`).catch(err => console.log(err))
  console.log('weather', weather)
  const [{ main, icon }] = weather
  if (!fs.existsSync(`./images/${icon}.png`)) {
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
    rain,
    icon: `./images/${icon}.png`
  }
  console.log('weatherData', weatherData)
  nextHoliday = moment(moment().nextHoliday(1)).isHoliday();
  nextHolidayIn = moment().nextHoliday(1).fromNow()
  return `${Math.round(temp)}° | ${humidity}%`;
}

const toTitleCase = (phrase) => {
  return phrase
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getDays = async () => {
  return await axios.get('http://nationaldaycalendar.com/latest-posts/').then(({ data }) => {
    var today = $('.post', data).first();
    var nationalDays = $('h2.entry-title a', today).text().split(' – ');
    nationalDays.shift();
    const caps = nationalDays.map(day => toTitleCase(day))
    return caps;
  }).catch((err) => console.log('err', err))
}

let weatherString = '';
let days = [];
(async function() {
  weatherString = await getWeather();
  days = await getDays();
})()

setInterval(async () => {
  const today = moment().format('YYYYMMDD');
  if (weatherDb.get(today)) {
    weatherDb.update(today, (val) => {
      val.push(temp)
      console.log('weatherdb updated', val)
      return val
    })
  } else {
    weatherDb.set(today, [temp])
  }
}, 600000);
setInterval(async () => {
  weatherString = await getWeather()
  days = await getDays();
}, 120000);
setInterval(() => {
  fb.clear()
  fb.color(1, 1, 1);
  const timeString = moment().format('h:mm a');
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
    rain,
  } = weatherData;
  fb.font("fantasy", 32, true);
  fb.text(6, 32, weatherString, false, 0, false);
  fb.font("fantasy", 44, true);
  fb.text(xMax - 6, 35, timeString, false, 0, true);
  fb.font("fantasy", 16, true);
  fb.text(xMax - 6, 96, `${nextHoliday} ${nextHolidayIn}`, false, 0, true);
  fb.font("fantasy", 12, true);
  const maxLength = 32
  days.forEach((day, i) => {
    const dayString = `${day.substring(0, Math.min(maxLength, day.length))}${day.length > maxLength ? '...' : ''}`
    fb.text(xMax - 6, (128 + (i*20)), dayString, false, 0, true);
  })
  fb.font("fantasy", 16, true);
  const sunsetTime = moment(sunset*1000).local().format('h:mm a');
  fb.text(xMax - 6, 64, sunsetTime, false, 0, true);
  let weatherOffsetY = 64
  if (rain) {
    fb.font("fantasy", 12, true);
    fb.text(56, weatherOffsetY, `${Object.keys(rain)[0]} ${Math.floor(Object.values(rain)[0])}%`, false, 0, false);
    fb.font("fantasy", 16, true);
    fb.text(120, weatherOffsetY, weatherType, false, 0, false);
    fb.image(6, 34, icon);
  } else {
    weatherOffsetY = weatherOffsetY - 24
  }
  fb.text(110, weatherOffsetY + 24, `${windSpeed}mph`, false, 0, false);
  fb.text(6, weatherOffsetY + 24, `${Math.round(temp_min)}° / ${Math.round(temp_max)}°`, false, 0, false);
  fb.font("fantasy", 12, true);
  fb.text(8, weatherOffsetY + 36, ' lo        hi', false, 0, false);
  fb.font("fantasy", 10, true);
  const uptimeMin = moment.duration(Math.round(process.uptime() / 60), 'minutes').format('h[h]mm[m]');
  fb.text(0, yMax, uptimeMin, false, 0, false);
  const medsTook = db.get(moment().format('YYYYMMDD'))
  if (medsTook) {
    // show took meds msg

    const ago = shortMoment(medsTook).fromNow();
    fb.font("fantasy", 18);
    fb.text(64, yMax - 96, ago, true, 45);
    fb.image(10, yMax - 96, "./images/pill.png");
  }
  fb.font("fantasy", 44, true);
  fb.text(xMax - 10, yMax - 20, (buttonPresses.get(moment().format('YYYYMMDDa')) || 0), false, 0, true);
  // if (parseInt(moment().format('HH')) >= 20) {
  //   fb.image(100, yMax - 96, "vodka.png");
  // }
  const tempArray = weatherDb.get(moment().format('YYYYMMDD'))
  const baseX = 200
  const baseY = 220
  const minTemp = 70
  const maxTemp = 105
  const barWidth = 10
  const barPadding = 3
  tempArray.slice(Math.max(tempArray.length - 16, 1)).forEach((val, i) => {
    const x = baseX + ((barWidth + barPadding) * i)
    const tempPerc = (val - minTemp)/(maxTemp - minTemp)
    const barHeight = Math.floor(tempPerc * maxTemp)
    const y = baseY + (maxTemp - barHeight)
    fb.font("fantasy", 10);
    fb.color(1, 1, 1)
    fb.text(x - 2, y - 6, Math.floor(val), false, 0, false);
    fb.color(0, 1, 0)
    fb.rect(x, y, barWidth, barHeight, true);
  })
}, 2000);

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
    medsMsg = `Took meds: ${moment(took).fromNow()}`;
    setTimeout(() => fb.clear(), 20000)
    say.speak(`meds taken ${moment(took).fromNow()}`);
    console.log('I did take meds today', took)
    res.send(`meds taken ${moment(took).fromNow()}`)

  } else {
    bitNo.play()
    medsMsg = `take your meds`
    say.speak(`you haven't taken your meds today`)
    res.send(`no meds taken yet today`)
  }
})


app.listen(8090, () => console.log('med-remember listening on port 8090!'))
