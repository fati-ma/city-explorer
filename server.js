'use strict';

const express = require('express');
const server = express();

require('dotenv').config();

const cors = require('cors');
server.use(cors());

const PORT = process.env.PORT || 3000;

server.get('/location', (req, res) => {
    const locationData = require('./data/location.json');
    console.log(locationData);
    const locationObj = new Location('Lynnwood', locationData);
    res.send(locationObj);//return
});

function Location(city, locData) {
    this.search_query = city;
    this.formatted_query = locData[0].display_name;
    this.latitude = locData[0].lat;
    this.longitude = locData[0].lon;
}

let weatherArray = [];
server.get('/weather', (req, res) => {
    const weatherData = require('./data/weather.json');
    weatherData.data.forEach(el1 => {
        let weatherObj = new Weather(el1);
    });
    res.send(weatherArray);
});

function Weather(weatherData) {
    this.forecast = weatherData.weather.description;
    this.time = weatherData.datetime;
    weatherArray.push(this);
}

server.get('*', (req, res) => {
    res.status(404).send('not found');
});

server.use((error, req, res) => {
    res.status(500).send(error);
});

server.listen(PORT, () => {
    console.log(`Listening on PORT: ${PORT}`);
});