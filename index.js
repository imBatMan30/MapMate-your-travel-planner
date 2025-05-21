const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql2');
const axios = require('axios');
const { findOptimalOrder } = require('./routeOptimizer');
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'kuldeep',
    password: 'kuldeep30',
    database: 'userDB'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (results.length > 0) {
            const name = results[0].name;
            res.redirect(`/mapmate.html?name=${encodeURIComponent(name)}`);
        } else {
            res.send('<h3 style="color:red;">Invalid email or password</h3><a href="/index.html">Try again</a>');
        }
    });
});

app.post('/Signup', (req, res) => {
    const { name, email, password } = req.body;
    const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    db.query(sql, [name, email, password], (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
            return res.status(500).send('Error saving data');
        }
        console.log('Data inserted:', result);
        res.redirect('/index.html?message=Signup successful, please login');
    });
});

app.post('/generate', (req, res) => {
    const { source, days, budget, medium } = req.body;
    console.log("Form Data Received:");
    console.log("source:", source);
    console.log("days:", days);
    console.log("budget:", budget);
    console.log("medium:", medium);
    if (!source || source.trim() === '') {
        console.log("Invalid source: Source city is required");
        // redirect back to mapmate.html with an error message
        return res.redirect('/mapmate.html?error=' + encodeURIComponent('Please enter a source city'));
    }

    // proceed with valid source
    res.redirect(`/orgmap.html?source=${encodeURIComponent(source.trim())}`);
});

async function getCoordinates(cityName, apiKey) {
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(cityName)}`;
    try {
        const response = await axios.get(url);
        const features = response.data.features;
        if (features.length > 0) {
            const [lon, lat] = features[0].geometry.coordinates;
            return { lat, lon };
        } else {
            throw new Error(`Location not found for: ${cityName}`);
        }
    } catch (err) {
        throw new Error(`Geocoding failed for: ${cityName} → ${err.message}`);
    }
}

app.post('/create-map', async (req, res) => {
    console.log("POST request received at /create-map");
    console.log("Request Body:", req.body);
    const { source, destinations } = req.body;

    if (!source || !Array.isArray(destinations)) {
        console.error("Invalid input: source or destinations missing");
        return res.status(400).json({ error: "Source and destinations are required" });
    }

    let allDestinations = [];
    const normalizedSource = source.trim().toLowerCase();
    const normalizedDestinations = destinations.map(dest => dest.trim().toLowerCase());

    if (normalizedSource && !normalizedDestinations.includes(normalizedSource)) {
        allDestinations = [normalizedSource, ...normalizedDestinations];
    } else {
        allDestinations = [...normalizedDestinations];
    }

    if (allDestinations.length < 2) {
        console.error("Invalid input: At least 2 destinations required, received:", allDestinations);
        return res.status(400).json({ error: "At least 2 destinations required" });
    }

    const API_KEY = '5b3ce3597851110001cf6248011f1b605c514f17b891d2027f391535';

    try {
        const coordinateList = [];
        for (const city of allDestinations) {
            console.log(`Getting coordinates for: ${city}`);
            const coords = await getCoordinates(city, API_KEY);
            console.log(`Coordinates for ${city}:`, coords);
            coordinateList.push([coords.lon, coords.lat]);
        }

        console.log("Final Coordinates List:", coordinateList);

        const body = {
            locations: coordinateList,
            metrics: ["distance", "duration"],
            units: "km",
            resolve_locations: false
        };

        const headers = {
            Authorization: API_KEY,
            'Content-Type': 'application/json'
        };

        const matrixURL = 'https://api.openrouteservice.org/v2/matrix/driving-car';
        const matrixResponse = await axios.post(matrixURL, body, { headers });
        console.log("Received response from OpenRouteService:", matrixResponse.data);

        if (!matrixResponse.data.distances || !matrixResponse.data.durations) {
            console.error("Invalid matrix response:", matrixResponse.data);
            throw new Error("Invalid distance or duration matrix from OpenRouteService");
        }

        const { order, totalDistance, totalDuration } = findOptimalOrder(
            allDestinations,
            matrixResponse.data.distances,
            matrixResponse.data.durations
        );

        // Compute leg distances and durations
        const legs = [];
        for (let i = 0; i < order.length - 1; i++) {
            const fromIndex = allDestinations.indexOf(order[i]);
            const toIndex = allDestinations.indexOf(order[i + 1]);
            const distanceKm = matrixResponse.data.distances[fromIndex][toIndex];
            const durationSec = matrixResponse.data.durations[fromIndex][toIndex];
            legs.push({
                from: order[i],
                to: order[i + 1],
                distance: distanceKm,
                duration: durationSec
            });
        }

        console.log('\n=== Optimized Travel Route ===');
        console.log(`Route: ${order.join(' -> ')}`);
        console.log('Legs:');
        for (let i = 0; i < order.length - 1; i++) {
            const fromIndex = allDestinations.indexOf(order[i]);
            const toIndex = allDestinations.indexOf(order[i + 1]);
            const distanceKm = matrixResponse.data.distances[fromIndex][toIndex].toFixed(1);
            const durationSec = matrixResponse.data.durations[fromIndex][toIndex];
            const hours = Math.floor(durationSec / 3600);
            const minutes = Math.floor((durationSec % 3600) / 60);
            console.log(`  ${order[i]} -> ${order[i + 1]}: ${distanceKm} km, ${hours} hours ${minutes} min`);
        }
        console.log(`Total Distance: ${totalDistance.toFixed(1)} km`);
        const totalHours = Math.floor(totalDuration / 3600);
        const totalMinutes = Math.floor((totalDuration % 3600) / 60);
        console.log(`Total Duration: ${totalHours} hours ${totalMinutes} min`);
        console.log('============================\n');

        res.json({
            origin: allDestinations[0],
            destinations: order.slice(1),
            distances: matrixResponse.data.distances[0],
            durations: matrixResponse.data.durations[0],
            optimalOrder: order,
            totalDistance: totalDistance.toFixed(1),
            totalDuration: totalDuration,
            distanceMatrix: matrixResponse.data.distances,
            durationMatrix: matrixResponse.data.durations,
            legs: legs // Add the legs array
        });

    } catch (err) {
        console.error('Error in /create-map:', err.message, err.stack);
        res.status(500).json({ error: err.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});