"use strict";

const { Client } = require("pg"); // node postgresql library module
const express = require("express");
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static('public'));
const PORT = 8001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const clientConfig = {
    user: "postgres",                // default PostgreSQL user, change if needed
    password: "12345",     // your local PostgreSQL password
    host: "localhost",                // local PostgreSQL instance
    port: 5432,                      // default PostgreSQL port
    database: "assignment3",        //To specify the correct database
    ssl: false,                       // disable SSL for local PostgreSQL
};

const client = new Client(clientConfig);

client.connect()
    .then(() => {
        console.log("Connected to PostgreSQL");
    })
    .catch((err) => {
        console.error("Connection error", err.stack);
    });

// Function to execute queries with a new client instance
async function queryDatabase(query, params = []) {
    const client = new Client(clientConfig);
    await client.connect();
    try {
        const result = await client.query(query, params);
        return result.rows;
    } catch (error) {
        throw error;
    } finally {
        await client.end();
    }
}

// ------ Airlines Endpoints ------

// Get airlines by country code
app.get("/airlines", async (req, res) => {
    const { country_code } = req.query;
    if (!country_code) return res.status(400).json({ error: "Country code is required" });

    try {
        const query = `
            SELECT airlines.* 
            FROM airlines
            JOIN countries ON airlines.country = countries.name
            WHERE countries.code = $1
        `;
        const result = await queryDatabase(query, [country_code]);

        if (result.length === 0) {
            return res.status(404).json({ error: "No airlines found for the specified country code" });
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});


// Get airline by ICAO or IATA code
app.get("/airlines/search", async (req, res) => {
    const { icao, iata } = req.query;
    if (!icao && !iata) {
        return res.status(400).json({ error: "ICAO or IATA code is required" });
    }

    try {
        let queryString = "SELECT * FROM airlines WHERE ";
        const queryParams = [];
        const conditions = [];

        if (icao) {
            queryParams.push(icao.toUpperCase()); // Normalize case
            conditions.push(`LOWER(icao) = LOWER($${queryParams.length})`);
        }

        if (iata) {
            queryParams.push(iata.toUpperCase());
            conditions.push(`LOWER(iata) = LOWER($${queryParams.length})`);
        }

        queryString += conditions.join(" OR ");

        const result = await queryDatabase(queryString, queryParams);
        if (result.length === 0) {
            return res.status(404).json({ error: "No airline found with the specified ICAO or IATA code" });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Add a new airline
app.post("/airlines", async (req, res) => {
    const { name, iata, icao, callsign, country } = req.body;
    if (!name || !country || !callsign || (!iata && !icao)) {
        return res.status(400).json({ error: "Name, callsign, country, and either IATA or ICAO code are required" });
    }

    try {
        // Check if the IATA or ICAO code already exists
        const existingAirline = await queryDatabase(
            "SELECT * FROM airlines WHERE iata = $1 OR icao = $2",
            [iata || null, icao || null]
        );

        if (existingAirline.length > 0) {
            return res.status(400).json({ error: "The IATA or ICAO code already exists" });
        }

        // Insert the new airline
        await queryDatabase(
            "INSERT INTO airlines (name, iata, icao, callsign, country) VALUES ($1, $2, $3, $4, $5)",
            [name, iata || null, icao || null, callsign || null, country]
        );

        res.status(201).json({ message: "Airline added successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Delete an airline by ICAO or IATA code
app.delete("/airlines", async (req, res) => {
    const { icao, iata } = req.query;
    if (!icao && !iata) return res.status(400).json({ error: "ICAO or IATA code is required" });

    try {
        // Ensure that at least one of the ICAO or IATA code is provided for deletion
        const result = await queryDatabase(
            "DELETE FROM airlines WHERE (icao = $1 OR iata = $2) RETURNING *",
            [icao || null, iata || null]
        );

        // If no record is deleted, return an error message
        if (result.length === 0) {
            return res.status(404).json({ error: "Airline not found" });
        }

        // Successfully deleted airline
        res.json({ message: "Airline deleted successfully", deletedAirline: result[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ------ Airports Endpoints ------

// Get airports by country code
app.get("/airports", async (req, res) => {
    const { country_code } = req.query;
    if (!country_code) return res.status(400).json({ error: "Country code is required" });

    try {
        const query = `
            SELECT airports.* 
            FROM airports
            JOIN countries ON airports.country = countries.name
            WHERE countries.code = $1
        `;
        const result = await queryDatabase(query, [country_code]);

        if (result.length === 0) {
            return res.status(404).json({ error: "No airports found for the specified country code" });
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});


const axios = require("axios"); // To call the Open-Meteo API to retrieve the highest and lowest temperatures for an airport based on its latitude and longitude.

// Get airport by ICAO or IATA code and also display the highest & lowest temperature (in celsius) of the airport today.
app.get("/airports/search", async (req, res) => {
    const { icao, iata } = req.query;
    if (!icao && !iata) {
        return res.status(400).json({ error: "ICAO or IATA code is required" });
    }

    try {
        let queryString = "SELECT * FROM airports WHERE ";
        const queryParams = [];

        if (icao) {
            queryParams.push(icao);
            queryString += `icao = $${queryParams.length}`;
        }

        if (iata) {
            queryParams.push(iata);
            queryString += (queryParams.length > 1 ? " OR " : "") + `iata = $${queryParams.length}`;
        }

        const result = await queryDatabase(queryString, queryParams);

        if (result.length === 0) {
            return res.status(404).json({ error: "No airport found with the specified ICAO or IATA code" });
        }

        const airport = result[0];
        const { latitude, longitude } = airport;

        // Fetch weather data from Open-Meteo API and Open-meteo API returns all temperatures in Celsius.
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;

        const weatherResponse = await axios.get(weatherUrl);
        const weatherData = weatherResponse.data;

        if (!weatherData || !weatherData.daily) {
            return res.status(500).json({ error: "Failed to fetch weather data" });
        }

        // Extract temperature values
        const high = weatherData.daily.temperature_2m_max[0];
        const low = weatherData.daily.temperature_2m_min[0];

        res.json({ ...airport, high, low });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Add a new airport
app.post("/airports", async (req, res) => {
    const { name, city, country, iata, icao, latitude, longitude } = req.body;

    // Ensure name and country are provided, and either ICAO or IATA may be omitted
    if (!name || !country || !city || latitude == null || longitude == null || (!iata && !icao)) return res.status(400).json({ error: "Name, city, country, latitude, longitude, and either IATA or ICAO are required" });

    // Ensure latitude and longitude are valid numbers
    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Latitude and longitude must be valid numbers" });
    }

    try {
        // Check if the IATA or ICAO code already exists
        const existingAirport = await queryDatabase(
            "SELECT * FROM airports WHERE iata = $1 OR icao = $2",
            [iata || null, icao || null]
        );

        // Corrected: Check for existing airport based on IATA or ICAO code
        if (existingAirport.length > 0) {
            return res.status(400).json({ error: "The IATA or ICAO code already exists" });
        }

        // Insert the new airport if no conflicts are found
        await queryDatabase(
            "INSERT INTO airports (name, city, country, iata, icao, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [name, city || null, country, iata || null, icao || null, latitude || null, longitude || null]
        );

        res.status(201).json({ message: "Airport added successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Delete an airport by ICAO and/or IATA code
app.delete("/airports", async (req, res) => {
    const { icao, iata } = req.query;

    // Ensure that either ICAO or IATA code is provided
    if (!icao && !iata) {
        return res.status(400).json({ error: "ICAO or IATA code is required" });
    }

    try {
        // Build the query dynamically depending on whether ICAO or IATA is provided
        const queryParams = [];
        let selectQuery = "SELECT * FROM airports WHERE ";
        let deleteQuery = "DELETE FROM airports WHERE ";

        if (icao) {
            queryParams.push(icao);
            selectQuery += `icao = $${queryParams.length}`;
            deleteQuery += `icao = $${queryParams.length}`;
        }

        if (iata) {
            queryParams.push(iata);
            selectQuery += (queryParams.length > 1 ? " OR " : "") + `iata = $${queryParams.length}`;
            deleteQuery += (queryParams.length > 1 ? " OR " : "") + `iata = $${queryParams.length}`;
        }

        // Retrieve the airport details before deletion
        const airportToDelete = await queryDatabase(selectQuery, queryParams);

        if (airportToDelete.length === 0) {
            return res.status(404).json({ error: "Airport not found" });
        }

        // Execute the delete query
        await queryDatabase(deleteQuery, queryParams);

        // Successfully deleted the airport and return deleted details
        res.json({ message: "Airport deleted successfully", deletedAirport: airportToDelete });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Haversine formula to calculate distance between two points (in km)
// The Haversine formula calculates the great-circle distance (shortest distance over the Earth’s surface).
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6378; // Earth radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // returns distance in km
}

// ------ Routes Endpoints ------

// Search distance between two airports and airline/aircraft based on departure and arrival
app.get("/routes/distance", async (req, res) => {
    const { departure, arrival } = req.query;

    // Validate input
    if (!departure || !arrival) {
        return res.status(400).json({ error: "Departure and arrival airport codes are required" });
    }

    try {
        // Fetch airports from the database based on IATA codes
        const airports = await queryDatabase(
            "SELECT iata, latitude, longitude FROM airports WHERE iata = $1 OR iata = $2",
            [departure, arrival]
        );

        // Ensure both airports exist
        if (airports.length !== 2) {
            return res.status(404).json({ error: "One or both airports not found" });
        }

        // Extract departure and arrival airport details
        const departureAirport = airports.find(airport => airport.iata === departure);
        const arrivalAirport = airports.find(airport => airport.iata === arrival);

        // Ensure latitude and longitude are valid
        if (!departureAirport.latitude || !departureAirport.longitude || !arrivalAirport.latitude || !arrivalAirport.longitude) {
            return res.status(500).json({ error: "Invalid airport location data" });
        }

        // Calculate distance using the Haversine formula
        const distance = haversine(
            parseFloat(departureAirport.latitude),
            parseFloat(departureAirport.longitude),
            parseFloat(arrivalAirport.latitude),
            parseFloat(arrivalAirport.longitude)
        );

        // Fetch airline and aircraft information for the given route
        const routes = await queryDatabase(
            "SELECT airline, planes FROM routes WHERE departure = $1 AND arrival = $2",
            [departure, arrival]
        );

        // Check if there are any routes for the given departure and arrival
        if (routes.length === 0) {
            return res.status(404).json({ error: "No routes found for the given airports" });
        }

        // Format the response with distance and airline/aircraft details
        const result = {
            distance: `${distance.toFixed(2)} kms`,
            airlines_and_aircrafts: routes.map(route => ({
                airline: route.airline,
                planes: route.planes ? route.planes.split(" ") : []
            }))
        };

        // Send the response
        res.json(result);
    } catch (error) {
        console.error("Error fetching route details:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Search list of arrival airports for a specified departure airport
app.get("/routes/arrival", async (req, res) => {
    const { departure } = req.query;
    if (!departure) {
        return res.status(400).json({ error: "Departure airport code is required" });
    }

    try {
        const result = await queryDatabase(
            "SELECT DISTINCT arrival FROM routes WHERE departure = $1",
            [departure]
        );

        if (result.length === 0) {
            return res.status(404).json({ error: "No arrival airports found for the specified departure airport" });
        }

        // Send a structured response
        res.json({
            departure,
            arrivals: result.map(row => row.arrival)
        });
    } catch (error) {
        console.error("Database error:", error); // Log error for debugging
        res.status(500).json({ error: "Internal server error" });
    }
});


// Search list of routes by airline and aircraft type
app.get("/routes/search", async (req, res) => {
    const { airline, aircraft } = req.query; // For example airline=2B&aircraft=CR2

    // Validate input: Airline should be 2-character IATA code, Aircraft should be 3-character code
    if (!airline || !aircraft || airline.length !== 2 || aircraft.length !== 3) {
        return res.status(400).json({ error: "Invalid airline or aircraft code. Airline must be 2 characters and aircraft must be 3 characters." });
    }

    try {
        // Use a more robust query to match aircraft type in the planes list
        const result = await queryDatabase(
            "SELECT departure, arrival FROM routes WHERE airline = $1 AND planes LIKE $2",
            [airline, `%${aircraft}%`] // Ensures we search for routes where 'planes' contains the aircraft type
        );

        if (result.length === 0) {
            return res.status(404).json({ error: "No routes found for the specified airline and aircraft type" });
        }

        // Send a structured response with departure and arrival airports
        res.json({
            airline,
            aircraft,
            routes: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Add a new route
app.post("/routes", async (req, res) => {
    const { airline, departure, arrival, planes } = req.body;

    // Basic input validation
    if (!airline || !departure || !arrival || !planes) {
        return res.status(400).json({ error: "Airline, departure, arrival, and planes are required" });
    }

    // Validate the length of IATA codes
    if (airline.length !== 2) {
        return res.status(400).json({ error: "Invalid airline code format. It must be a 2-character IATA code" });
    }
    if (departure.length !== 3 || arrival.length !== 3) {
        return res.status(400).json({ error: "Invalid airport code format. Departure and arrival must be 3-character IATA codes" });
    }

    try {
        // Check if the airline exists
        const airlineExists = await queryDatabase("SELECT * FROM airlines WHERE iata = $1", [airline]);
        if (!airlineExists.length) {
            return res.status(400).json({ error: "Invalid airline code. Airline not found" });
        }

        // Check if the departure and arrival airports exist
        const departureExists = await queryDatabase("SELECT * FROM airports WHERE UPPER(iata) = UPPER($1)", [departure]);
        const arrivalExists = await queryDatabase("SELECT * FROM airports WHERE UPPER(iata) = UPPER($1)", [arrival]);

        // Log the query results for debugging
        console.log("Departure airport exists:", departureExists);
        console.log("Arrival airport exists:", arrivalExists);

        if (!departureExists.length || !arrivalExists.length) {
            return res.status(400).json({ error: "Invalid airport code(s). Departure or arrival airport not found" });
        }

        // Split the planes string into an array of aircraft codes
        const planesList = planes.split(" ");

        // Validate that each aircraft code is 3 characters long and exists in the planes table
        const invalidPlanes = planesList.filter(plane => plane.length !== 3);
        if (invalidPlanes.length > 0) {
            return res.status(400).json({ error: `Invalid aircraft code(s): ${invalidPlanes.join(", ")}` });
        }

        // Check if all aircraft codes exist in the planes table
        const existingPlanes = await queryDatabase("SELECT * FROM planes WHERE code = ANY($1::text[])", [planesList]);

        if (existingPlanes.length !== planesList.length) {
            return res.status(400).json({ error: "One or more aircraft codes do not exist in the planes table" });
        }

        // Insert the new route into the routes table
        await queryDatabase(
            "INSERT INTO routes (airline, departure, arrival, planes) VALUES ($1, $2, $3, $4)",
            [airline, departure, arrival, planes]
        );

        res.status(201).json({ message: "Route added successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Delete a route
app.delete("/routes/toDelete", async (req, res) => {
    const { airline, departure, arrival } = req.body;

    // Validate required fields
    if (!airline || !departure || !arrival) {
        return res.status(400).json({ error: "Airline, departure, and arrival are required" });
    }

    // Validate that IATA codes are in the correct format
    if (airline.length !== 2) {
        return res.status(400).json({ error: "Invalid airline code format. It must be a 2-character IATA code" });
    }
    if (departure.length !== 3 || arrival.length !== 3) {
        return res.status(400).json({ error: "Invalid airport code format. Departure and arrival must be 3-character IATA codes" });
    }

    try {
        // Check if the route exists before attempting to delete
        const routeExists = await queryDatabase(
            "SELECT * FROM routes WHERE airline = $1 AND departure = $2 AND arrival = $3",
            [airline, departure, arrival]
        );

        // If no such route exists, return an error
        if (routeExists.length === 0) {
            return res.status(404).json({ error: "Route not found" });
        }

        // Execute DELETE query to remove the route
        const result = await queryDatabase(
            "DELETE FROM routes WHERE airline = $1 AND departure = $2 AND arrival = $3",
            [airline, departure, arrival]
        );

        // If no rows were affected, it means the route didn't exist
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Route not found" });
        }

        res.json({ message: "Route deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Update a route
app.put("/routes/toUpdate", async (req, res) => {
    const { airline, departure, arrival, newPlanes } = req.body;

    // Validate required fields
    if (!airline || !departure || !arrival || !newPlanes) {
        return res.status(400).json({ error: "Airline, departure, arrival, and new planes are required" });
    }

    try {
        // Check if the route exists
        const result = await queryDatabase(
            "SELECT * FROM routes WHERE airline = $1 AND departure = $2 AND arrival = $3",
            [airline, departure, arrival]
        );

        if (!result.length) {
            return res.status(404).json({ error: "Route not found" });
        }

        // Split current planes and new planes
        const currentPlanes = result[0].planes.split(" ");
        const newPlanesList = newPlanes.split(" ");

        // Check if any new aircraft codes are invalid (ensure code length is 3 before querying)
        const invalidPlanes = newPlanesList.filter(plane => plane.length !== 3);
        if (invalidPlanes.length > 0) {
            return res.status(400).json({ error: `Invalid aircraft code(s): ${invalidPlanes.join(", ")}` });
        }

        const validPlanes = await queryDatabase(
            "SELECT code FROM planes WHERE code = ANY($1::text[])",
            [newPlanesList]
        );

        if (validPlanes.length !== newPlanesList.length) {
            return res.status(400).json({ error: "One or more invalid aircraft codes" });
        }

        // Filter out already existing planes from the new planes list
        const planesToAdd = newPlanesList.filter(plane => !currentPlanes.includes(plane));

        // If there are no new planes to add, return a message indicating no update is needed
        if (planesToAdd.length === 0) {
            return res.json({ message: "No new aircraft types to add" });
        }

        // Concatenate the new planes with the existing ones and store them consistently
        const updatedPlanes = currentPlanes.concat(planesToAdd).join(" ");

        // Update the route with the new list of aircraft
        await queryDatabase(
            "UPDATE routes SET planes = $1 WHERE airline = $2 AND departure = $3 AND arrival = $4",
            [updatedPlanes, airline, departure, arrival]
        );

        res.json({ message: "Route updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/countries", async (req, res) => {
    try {
        const result = await queryDatabase("SELECT name, code FROM countries ORDER BY name ASC");
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch countries", details: error.message });
    }
});

// Endpoint to get all aircraft types from the planes table
app.get("/planes", async (req, res) => {
    try {
      const result = await queryDatabase("SELECT * FROM planes");
  
      if (result.length === 0) {
        return res.status(404).json({ error: "No aircraft types found" });
      }
  
      res.json(result); // Send aircraft types
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  });

// Get all airlines (regardless of country)
app.get("/airlines/all", async (req, res) => {
    try {
      const result = await queryDatabase("SELECT * FROM airlines ORDER BY name ASC");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch airlines", details: error.message });
    }
  });  

// Get routes for a specific airline
app.get("/airlines/routes", async (req, res) => {
    const { airline } = req.query;

    if (!airline || airline.length !== 2) {
        return res.status(400).json({ error: "Invalid or missing airline code. Must be 2 characters." });
    }

    try {
        // Fetch all routes for the selected airline
        const result = await queryDatabase(
            "SELECT departure, arrival FROM routes WHERE airline = $1",
            [airline]
        );

        if (result.length === 0) {
            return res.status(404).json({ error: "No routes found for the selected airline." });
        }

        res.json({ airline, routes: result });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

app.get("/airports/routesorigin", async (req, res) => {
    try {
        const result = await queryDatabase(`
            SELECT name, city, country, iata, icao, latitude, longitude 
            FROM airports
        `);
        
        if (result.length === 0) {
            return res.status(404).json({ error: "No airports found" });
        }

        res.json({
            airports: result.map(row => ({
                name: row.name,
                city: row.city,
                country: row.country,
                iata: row.iata,
                icao: row.icao,
                latitude: row.latitude,
                longitude: row.longitude
            }))
        });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get list of routes where the selected airport is the ARRIVAL airport
app.get("/routes/arrivalto", async (req, res) => {
    const { arrival } = req.query;
    if (!arrival) {
        return res.status(400).json({ error: "Arrival airport code is required" });
    }

    try {
        const result = await queryDatabase(
            "SELECT departure, airline, planes FROM routes WHERE arrival = $1",
            [arrival]
        );

        if (result.length === 0) {
            return res.status(404).json({ error: "No departures found for the specified arrival airport" });
        }

        res.json({
            arrival,
            departures: result  // directly return the full result array
        });        
    } catch (error) {
        console.error("Database error:", error); //Log error for debugging
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/airports/airlinesbyairport", async (req, res) => {
    const airportCode = req.query.iata?.toUpperCase();
    console.log("Received airport code:", airportCode); // ✅ Debug log

    if (!airportCode) {
        console.log("Missing airport code");
        return res.status(400).json({ error: "Missing airport code" });
    }

    try {
        const query = `
            SELECT DISTINCT al.name, al.iata, al.country
            FROM routes r
            JOIN airlines al ON r.airline = al.iata
            WHERE r.departure = $1 OR r.arrival = $2
        `;
        const result = await queryDatabase(query, [airportCode, airportCode]);

        console.log("Query result:", result); // ✅ Debug log

        if (result.length === 0) {
            return res.status(404).json({ error: "No airlines found for the selected airport." });
        }

        res.json({ airlines: result });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get('/distance', async (req, res) => {
    const { from, to } = req.query;

    if (!from || !to) {
        return res.status(400).json({ error: 'Missing airport codes' });
    }

    try {
        const query = `
            SELECT iata, icao, latitude, longitude 
            FROM airports 
            WHERE iata = $1 OR icao = $1 OR iata = $2 OR icao = $2
        `;

        const result = await queryDatabase(query, [from.toUpperCase(), to.toUpperCase()]);

        if (result.length !== 2) {
            return res.status(404).json({ error: 'One or both airports not found' });
        }

        const matchCode = (code, airport) =>
            airport.iata === code.toUpperCase() || airport.icao === code.toUpperCase();

        const airport1 = matchCode(from, result[0]) ? result[0] : result[1];
        const airport2 = matchCode(to, result[0]) ? result[0] : result[1];

        const getCodeInfo = (inputCode, airport) => {
            const upperCode = inputCode.toUpperCase();
            if (airport.iata === upperCode) {
                return { code: airport.iata, type: "IATA" };
            } else if (airport.icao === upperCode) {
                return { code: airport.icao, type: "ICAO" };
            } else {
                return { code: upperCode, type: "Unknown" };
            }
        };
        const distance = haversine(airport1.latitude, airport1.longitude, airport2.latitude, airport2.longitude);

        res.json({
            from: getCodeInfo(from, airport1),
            to: getCodeInfo(to, airport2),
            distance_km: `${distance.toFixed(2)} kms`,
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database query failed', details: err.message });
    }
});

app.get("/distinctplanes", async (req, res) => {
    try {
      const result = await queryDatabase("SELECT name, code FROM planes WHERE code IS NOT NULL AND code != '' ORDER BY name");
  
      if (result.length === 0) {
        return res.status(404).json({ error: "No aircraft types found" });
      }
  
      res.json(result); // Send only the codes
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  });

// To fetch routes using a specific aircraft type
app.get("/routes-by-plane/:code", async (req, res) => {
    const { code } = req.params;
  
    try {
      const query = `
        SELECT airline, departure, arrival
        FROM routes
        WHERE planes LIKE '%' || $1 || '%'
      `;
      const result = await queryDatabase(query, [code]);
  
      if (result.length === 0) {
        return res.status(404).json({ error: "No routes found for this aircraft type" });
      }
  
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  });
 
// Search list of arrival airports, airlines and planes for a specified departure airport
app.get("/routes/arrivaldetails", async (req, res) => {
    const { departure } = req.query;
    if (!departure) {
        return res.status(400).json({ error: "Departure airport code is required" });
    }

    try {
        const result = await queryDatabase(
            "SELECT arrival, airline, planes FROM routes WHERE departure = $1",
            [departure]
        );

        if (result.length === 0) {
            return res.status(404).json({ error: "No arrival airports found for the specified departure airport" });
        }

        // Send a structured response
        res.json({
            departure,
            arrivals: result.map(row => ({
                arrival: row.arrival,
                airline: row.airline,
                planes: row.planes
            }))
        });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});