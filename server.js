'use strict';

// Application Dependencies
const express = require('express');
//CORS = Cross Origin Resource Sharing
//DOTENV (read our enviroment variable)
require('dotenv').config();
const app = express();
const pg = require('pg');
const superagent = require('superagent');

// Application Setup
const cors = require('cors');
app.use(cors());
const DATABASE_URL = process.env.DATABASE_URL;
const client = new pg.Client(DATABASE_URL);
const PORT = process.env.PORT || 3000;

//Routes
app.get('/location', locationHandlerFunc);
app.get('/weather', getWeather);
app.get('/trails', trailsHandler);
app.get('*', notFoundPageHandler);
// app.use(errorHandler);


function locationHandlerFunc(req, res) {

    let cityName = req.query.city;
    //let SQL = `SELECT search_query, formatted_query, latitude, longitude FROM locations WHERE search_query = '${cityName}'`;
    let SQL = `SELECT * FROM city_explorer.locations WHERE search_query = '${cityName}'`;

    client.query(SQL)
        .then((data) => {
            if (data.rowCount === 0) {
                locationHandler(cityName, res);
            } else {
                res.json(data.rows[0]);
                console.log('hello');
            }
        })
        .catch(error => errorHandler(error, req, res))
    // let cityName = req.query.city;
    // let locKey = process.env.LOCATION_KEY;
    // let url = `https://eu1.locationiq.com/v1/search.php?key=${locKey}&q=${cityName}&format=json`;
    // superagent.get(url)
    //     .then(data => {
    //         let locationData = new Location(cityName, data.body);
    //         res.send(locationData);
    //     })
    //     .catch(() => {
    //         errorHandler('Location .. Something went wrong!!', req, res);
    //     });
}

function locationHandler(cityName, req) {
    let url = `https://eu1.locationiq.com/v1/search.php?key=${locKey}&q=${cityName}&format=json`;

    // let cityName = req.query.city;
    let locKey = process.env.LOCATION_KEY;

    superagent.get(url)
        .then(data => {
            let locationData = new Location(cityName, data.body);
            let SQL = `INSERT INTO city_explorer.locations(search_query, geoData) VALUES ($1 $2 $3 $4)`;

            let safeValues = [locationData.search_query, locationData.formatted_query, locationData.latitude, locationData.longitude];

            client.query(SQL, safeValues)
                .then(() => {
                    console.log('your data has been added successfully!!');
                });
            console.log(locationData);
            return locationData;
        })
        .catch(error => errorHandler(error, req, res))
}


function Location(city, geoData) {
    this.search_query = city;
    this.formatted_query = geoData[0].display_name;
    this.latitude = geoData[0].lat;
    this.longitude = geoData[0].lon;
}


function getWeather(req, res) {
    let cityName = req.query.search_query;
    let lat = req.query.latitude;
    let lon = req.query.longitude;
    let days = 5;
    let wthrKye = process.env.WETHER_KEY;
    let weatherDaily = [];
    let weatherUrl = `https://api.weatherbit.io/v2.0/forecast/daily?city=${cityName}&lat=${lat}&lon=${lon}&key=${wthrKye}&days=${days}`;
    superagent.get(weatherUrl)
        .then(data => {
            weatherDaily = data.body.data.map(val => {
                return new Weather(val);
            });
            res.send(weatherDaily);
        }).catch(() => {
            errorHandler('Weather .. Something went wrong!!', req, res);
        });
}
function Weather(weatheData) {
    this.forecast = weatheData.weather.description;;
    this.time = weatheData.datetime;
}
function trailsHandler(req, res) {
    let lat = req.query.latitude;
    let lon = req.query.longitude;
    let triKye = process.env.TRAIL_KEY;
    let triUrl = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&maxDistance=200&key=${triKye}`;
    superagent.get(triUrl)
        .then(data => {
            let availableTrails = data.body.trails.map(val => {
                return new Trail(val);
            });
            res.status(200).send(availableTrails);
        }).catch(() => {
            errorHandler('Trail .. Something went wrong!!', req, res);
        });
}
function Trail(data) {
    this.name = data.name;
    this.location = data.location;
    this.length = data.length;
    this.stars = data.stars;
    this.star_votes = data.starVotes;
    this.summary = data.summary;
    this.trail_url = data.url;
    this.conditions = data.conditionStatus;
    this.condition_date = data.conditionDate.split(' ')[0];
    this.condition_time = data.conditionDate.split(' ')[1];
}
function notFoundPageHandler(req, res) {
    res.status(404).send('Not Found');
}
function errorHandler(error, req, res) {
    res.status(500).send(error);
}

client.connect().then(() => {
    app.listen(PORT, () => {
        console.log(`App listening to port ${PORT}`);
    });
});