'use strict';

// Application Dependencies
const express = require('express');
//CORS = Cross Origin Resource Sharing
const cors = require('cors');
//DOTENV (read our enviroment variable)
require('dotenv').config();
const pg = require('pg');

// Application Setup
const superagent = require('superagent');
const app = express();
app.use(cors());
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT || 3000;
const client = new pg.Client(DATABASE_URL);

//Routes
app.get('/location', locationHandlerFunc);
app.get('/weather', getWeather);
app.get('/trails', trailsHandler);
app.get('/movies', movieHandler);
app.get('/yelp', yelpHandler);
app.get('*', notFoundPageHandler);

function locationHandlerFunc(req, res) {
    let city = req.query.city;
    let locKey = process.env.LOCATION_KEY;
    let SQLselect = `SELECT search_query,formatted_query,latitude,longitude FROM locations  WHERE search_query=$1;`;
    let saveValue = [city];
   
    client.query(SQLselect,saveValue)
        .then((data) => {
            if (data.rowCount) {
                res.send(data.rows[0]);
            }
            else {
                superagent.get(`http://eu1.locationiq.com/v1/search.php?key=${locKey}&q=${city}&format=json`)
                    .then((data) => {
                        
                        let locationData = new Location(city, data.body);
                        res.send(locationData);
                        
                        let SQLinsert = 'INSERT INTO locations (search_query,formatted_query,latitude,longitude) VALUES($1,$2,$3,$4);'

                        let safeValues = [locationData.search_query, locationData.formatted_query, locationData.latitude, locationData.longitude];

                        client.query(SQLinsert, safeValues)
                            .then(data => {
                                // console.log('Done');
                            }).catch(() => {
                                errorHandler('Location... went wrong', req, res);
                            });

                    }).catch(() => {
                        errorHandler('Location... went wrong', req, res);
                    });
            }
        });
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
    // let triUrl = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&maxDistance=200&key=${triKye}`;

    superagent.get(`https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&maxDistance=200&key=${triKye}`)
        .then(data => {
            let availableTrails = data.body.trails;
            let vals = availableTrails.map(val => {
                return new Trail(val);
            });
            res.json(vals);
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

function Movie(movieObj) {
    this.title = movieObj.title;
    this.overview = movieObj.overview;
    this.average_votes = movieObj.vote_average;
    this.total_votes = movieObj.vote_count;
    this.image_url = `https://image.tmdb.org/t/p/w500${movieObj.poster_path}`;
    this.popularity = movieObj.popularity;
    this.released_on = movieObj.release_date;
}

function movieHandler(req, res) {
    const MOVIE_API_KEY = process.env.MOVIE_API_KEY;
    const city = req.query.search_query;
    const movieUrl = `https://api.themoviedb.org/4/search/movie?api_key=${MOVIE_API_KEY}&query=${city}`;

    superagent.get(movieUrl)
        .then(data => {
            let dataMovie = data.body.results;
            console.log(dataMovie);
            let arr = dataMovie.map(val => {
                // console.log(arr);
                return new Movie(val);
            });
            res.json(arr);
        }).catch(() => {
            errorHandler('Movie .. Something went wrong!!', req, res);
        })
}

function Yelp(yelbObj) {
    this.name = yelbObj.name;
    this.image_url = yelbObj.image_url;
    this.price = yelbObj.price;
    this.rating = yelbObj.rating;
    this.url = yelbObj.url;
}

function yelpHandler(req, res) {
    const YELP_API_KEY = process.env.YELP_API_KEY;
    const city = req.query.search_query;
    const page = req.query.page;
    const numPerPage = 5;
    const start = ((page - 1) * numPerPage + 1);
    const yelpUrl = `https://api.yelp.com/v3/businesses/search?term=restaurants&location=${city}&limit=5&offset=${start}`;

    superagent.get(yelpUrl)
        .set('Authorization', `Bearer ${YELP_API_KEY}`)
        .then(data => {
            let yelpData = data.body.businesses;
            let arr = yelpData.map(val => {
                // console.log(val);
                return new Yelp(val);
            });
            res.json(arr);
        }).catch(() => {
            errorHandler('Yelp .. Something went wrong!!', req, res);

        })
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


// function locationHandlerFunc(req, res) {

//     let cityName = req.query.city;

//     checkLocation(cityName)
//         .then(data => {
//             if (data.rowCount) {
//                 res.json(data[0]); //I have to check this line again on console
//                 // res.json(data.rows[0]); 
//             }
//             else {
//                 let locKey = process.env.LOCATION_KEY;
//                 let url = `https://eu1.locationiq.com/v1/search.php?key=${locKey}&q=${cityName}&format=json`;

//                 return superagent.get(url)
//                     .then(data => {

//                         let locationData = new Location(cityName, data.body);
//                         return (locationData);
//                     })
//                     .catch(() => {
//                         errorHandler('Location .. Something went wrong!! inside get loc data', req, res);
//                     })
//                     .then(locResult => {
//                         let SQLinsert = `INSERT INTO city_explorer.locations VALUES ($1,$2,$3,$4)`;
//                         let safaValues = [locResult.search_query, locResult.formatted_query, locResult.latitude, locResult.longitude];
//                         client.query(SQLinsert, safaValues)
//                             .then(() => {
//                                 res.json(locResult);
//                             }).catch(() => { errorHandler('Something went wrong', req, res) });
//                     })
//                     .catch(() => { errorHandler('Location .. Something went wrong!!', req, res) });
//             }


//         })

//Hala 
// client.query(SQL)
//     .then((data) => {
//         if (data.rowCount === 0) {
//             checkLocation(cityName, res);
//         } else {
// res.json(data.rows[0]);
//             console.log('it works');
//         }
//     })
//     .catch(error => errorHandler(error, req, res))
//Fatima
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
// }

// function checkLocation(cityName) {
//     // let SQL = `SELECT * FROM locations WHERE search_query = ${cityName}`;
//     //let SQL = `SELECT search_query, formatted_query, latitude, longitude FROM locations WHERE search_query = '${cityName}'`;
//     let SQL = `SELECT * FROM city_explorer.locations WHERE search_query = '${cityName}'`;
//     return client.query(SQL)
//         .then(result => {
//             return result.rows;
//         });