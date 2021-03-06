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
// const DashButton = require('node-dash-button')
const tinycolor = require('tinycolor2')

let weatherData = {};

const shortMoment = moment;
shortMoment.updateLocale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s',
    s:  '%s',
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

const btnObject = {}

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
// const buttonPresses = dirty('./buttons.db')
const frivolousNatlDays = dirty('./natldays.db')
const zeroBtns = dirty('./zbutt.db')
let lastPressed = 0;


let textString = '#temp :: #time'
let f = 0.0;
let medsMsg = ''

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
  const [{ main, icon }] = weather
  if (!fs.existsSync(`./images/${icon}.png`)) {
    console.log(`:: get weather icon ${icon}`)
    wget.download(`http://openweathermap.org/img/w/${icon}.png`, `images/${icon}.png`)
  } else {
    console.log(':: weather icon already saved')
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
  console.log(':: getWeather')
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

const getDays = async (force) => {
  const today = moment().format('YYYYMMDD')
  const todaysDays = frivolousNatlDays.get(today)
  if (todaysDays.length > 0) {
    return todaysDays.map(day => toTitleCase(day))
  } else {
    return await axios.get('http://nationaldaycalendar.com/latest-posts/').then(({ data }) => {
      var todayStr = $('.post', data).first();
      var nationalDays = $('h2.entry-title a', todayStr).text().split(' – ');
      nationalDays.shift();
      console.log(`:: retrieved ${nationalDays.length} frivolous national holidays and stored in db`)
      const caps = nationalDays.map(day => toTitleCase(day))
      frivolousNatlDays.set(today, caps)
      return caps;
    }).catch((err) => console.log('err', err))
  }
}

let weatherString = '';
let days = [];

const saveTempData = () => {
  const { temp } = weatherData
  const today = moment().format('YYYYMMDD');
  if (weatherDb.get(today)) {
    weatherDb.update(today, (val) => {
      val.push(temp)
      console.log('weatherdb updated', val.length)
      return val
    })
  } else {
    weatherDb.set(today, [temp])
  }
}

(async function() {
  weatherString = await getWeather();
  saveTempData()
})()
setInterval(async () => {
  
  // await getDays(true);
  saveTempData()
}, 3600000/4); // quarter hour
setInterval(async () => {
  weatherString = await getWeather()
}, 120000);
setInterval(async () => {
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
  const natlDays = await getDays()
  if (natlDays) {
    natlDays.map(async (day, i) => {
      const dayString = `${day.substring(0, Math.min(maxLength, day.length))}${day.length > maxLength ? '...' : ''}`
      // console.log('dayString', dayString, xMax - 6, (128 + (i*20)))
      fb.color(1, 1, 1)
      fb.text(xMax - 6, (128 + (i*20)), dayString, false, 0, true);
    })
  } else {
    console.log('nope', natlDays);
  }

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
  const zbtn = zeroBtns.get(moment().format('YYYYMMDD'))
  if (zbtn && Object.keys(zbtn).length > 0) {
    const btnOffset = weatherOffsetY + 72
    Object.keys(zbtn).forEach((key, i) => {
      const btnPresses = zbtn[key]
      fb.font("fantasy", 40, true);
      const {r, g, b} = tinycolor(key).toRgb()
      fb.color((r/255), (g/255), (b/255));
      fb.text(22 + (i * 64), btnOffset, btnPresses.length, true, 0, false);
      fb.font("fantasy", 14 , true);
      fb.text(14 + (i * 52), btnOffset + 38, shortMoment(btnPresses.slice(-1).pop()).fromNow(), false, 0, false);
    })
  }
  fb.color(1, 1, 1);
  fb.font("fantasy", 16, true);
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
    fb.font("fantasy", 24);
    fb.text(82, yMax - 80, ago, true, 45);
    fb.image(10, yMax - 96, "./images/pill.png");
  }
  fb.font("fantasy", 44, true);
  const todaySkewed = moment().subtract(3, 'hours').format('YYYYMMDD')
  // fb.text(xMax - 10, yMax - 20, (buttonPresses.get(todaySkewed) || 0), false, 0, true);
  fb.font("fantasy", 14, true);
  // const last = buttonPresses.get('lastPressed') || moment().valueOf()
  fb.text(xMax, yMax, shortMoment(last).fromNow(), false, 0, true);
  // if (parseInt(moment().format('HH')) >= 20) {
  //   fb.image(100, yMax - 96, "vodka.png");
  // }
  const weatherArray = weatherDb.get(moment().format('YYYYMMDD'))
  const baseX = 200
  const baseY = 220
  const minTemp = 70
  const maxTemp = 105
  const barWidth = 10
  const barPadding = 3
  weatherArray.slice(Math.max(weatherArray.length - 16, 1)).forEach((val, i) => {
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

app.get('/espbutton', (req, res) => {
  res.send('button pressed')
})

app.get('/pi/buttons/:pressedButton', (req, res) => {
  const { pressedButton } = req.params;
  console.log(`:: ${pressedButton} button pressed`)
  const today = moment().format('YYYYMMDD')
  if (zeroBtns.get(today)) {
    zeroBtns.update(today, (val) => {
      if (val[pressedButton]) {
        val[pressedButton].push(moment().valueOf())
      } else {
        val[pressedButton] = [moment().valueOf()]
      }
      return val
    })
  } else {
    const newObj = {}
    newObj[pressedButton] = [moment().valueOf()]
    console.log('init buttons', newObj);
    zeroBtns.set(today, newObj)
  }
  res.status(200).send(`button press submitted ${req.params.pressedButton}`)
})

app.post('/meds/took', async (req, res) => {
  if (req.body.token === token) {
    // get day-based key
    const today = moment().format('YYYYMMDD')
    // log full timestamp in database
    console.log(':: meds taken', today);
    db.set(today, moment().format());
    await axios.get('http://192.168.1.32:8081/pixel/rainbow').catch(err => console.log(err))
  } else {
    console.log('invalid token')
    res.status(401);
    res.send('invalid token')
  }
})

app.post('/resetcounter', (req, res) => {
  if (req.body.token === token) {
    // get day-based key
    const today = moment().format('YYYYMMDDa')
    // log full timestamp in database
    console.log('reset counter');
    // buttonPresses.set(today, 0)
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
