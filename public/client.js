const API_BASE = "http://localhost:8001";

// A user selects a country to view all airlines and the airports in the country selected. 
async function populateCountries() {
    const res = await fetch(`${API_BASE}/countries`);
    const countries = await res.json();
  
    const select = document.getElementById("countrySelect");
    select.innerHTML = `<option value="">-- Choose a country --</option>`;
    countries.forEach(country => {
      const option = document.createElement("option");
      option.value = country.code;
      option.text = `${country.name} (${country.code})`;
      select.appendChild(option);
    });
  }  

// Show airlines and airports for selected country
async function loadAirlinesAndAirports() {
    const code = document.getElementById("countrySelect").value;
    if (!code) {
      alert("Please select a country.");
      return;
    }
  
    const airlinesList = document.getElementById("airlinesList");
    const airportsList = document.getElementById("airportsList");
    airlinesList.innerHTML = "";
    airportsList.innerHTML = "";
  
    try {
      const [airlinesRes, airportsRes] = await Promise.all([
        fetch(`${API_BASE}/airlines?country_code=${code}`),
        fetch(`${API_BASE}/airports?country_code=${code}`)
      ]);
  
      const airlines = await airlinesRes.json();
      const airports = await airportsRes.json();
  
      if (airlines.length > 0) {
        airlines.forEach(airline => {
          const li = document.createElement("li");
          li.textContent = `${airline.name} (${airline.iata || airline.icao || "N/A"})`;
          airlinesList.appendChild(li);
        });
      } else {
        airlinesList.innerHTML = "<li>No airlines found.</li>";
      }
  
      if (airports.length > 0) {
        airports.forEach(airport => {
          const li = document.createElement("li");
          li.textContent = `${airport.name} (${airport.iata || airport.icao || "N/A"})`;
          airportsList.appendChild(li);
        });
      } else {
        airportsList.innerHTML = "<li>No airports found.</li>";
      }
  
    } catch (err) {
      console.error(err);
      alert("Failed to fetch airlines or airports.");
    }
  }

//  A user selects an airline to view the airports and/or routes the airline selected flies. 
// Populate all airlines dropdown
async function populateAirlines() {
    const select = document.getElementById("airlineSelect");
    select.innerHTML = `<option value="">-- Choose an airline --</option>`; // Clear existing options

    try {
        const res = await fetch(`${API_BASE}/airlines/all`);
        const airlines = await res.json();

        airlines.forEach(airline => {
            const option = document.createElement("option");
            option.value = airline.iata || airline.icao || "";
            option.textContent = `${airline.name} (${airline.iata || airline.icao || "N/A"})`;
            select.appendChild(option);
        });
    } catch (err) {
        console.error("Error loading airlines:", err);
        alert("Could not load airlines.");
    }
}

// Show routes for the selected airline
async function viewAirlineRoutes() {
    const airlineCode = document.getElementById("airlineSelect").value;
    const routeOutput = document.getElementById("routeResults");
    routeOutput.innerHTML = "";

    if (!airlineCode) {
        alert("Please select an airline.");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/airlines/routes?airline=${airlineCode}`);
        const data = await res.json();

        if (!data.routes || data.routes.length === 0) {
            routeOutput.innerHTML = "<li>No routes found.</li>";
            return;
        }

        data.routes.forEach(route => {
            const li = document.createElement("li");
            li.textContent = `From ${route.departure} → To ${route.arrival}`;
            routeOutput.appendChild(li);
        });
    } catch (err) {
        console.error("Error fetching routes:", err);
        routeOutput.innerHTML = "<li>Error fetching route data.</li>";
    }
}

// A user selects an airport to view the details about the airport (e.g., name, airport codes, current weather, etc.). 
window.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("/airports/routesorigin");
        const data = await response.json();

        const datalist = document.getElementById("airport-codes");

        data.airports.forEach(airport => {
            const option = document.createElement("option");
        
            // Show both codes together if available
            let codeLabel = "";
            if (airport.iata && airport.icao) {
                codeLabel = `[IATA: ${airport.iata}, ICAO: ${airport.icao}]`;
            } else if (airport.iata) {
                codeLabel = `[IATA: ${airport.iata}]`;
            } else if (airport.icao) {
                codeLabel = `[ICAO: ${airport.icao}]`;
            }
        
            // Use either IATA or ICAO as the input value
            option.value = airport.iata || airport.icao;
        
            // Full label for dropdown display
            option.label = `${airport.name} (${airport.city}, ${airport.country}) ${codeLabel}`;
        
            datalist.appendChild(option);
        });
        
    } catch (error) {
        console.error("Failed to load airport list:", error);
    }
});

document.getElementById("search-btn").addEventListener("click", async () => {
    const icaoOrIata = document.getElementById("icao-input").value.trim();

    if (!icaoOrIata) {
        alert("Please enter a valid ICAO or IATA code.");
        return;
    }

    try {
        // Call the server API to get the airport details and weather
        const response = await fetch(`/airports/search?icao=${icaoOrIata}&iata=${icaoOrIata}`);
        
        if (response.ok) {
            const data = await response.json();
            displayAirportDetails(data);
        } else {
            const errorData = await response.json();
            displayError(errorData.error);
        }
    } catch (error) {
        displayError("An error occurred while fetching data.");
    }
});

function displayAirportDetails(data) {
    // Display airport details and weather information
    document.getElementById("airport-details").style.display = "block";
    document.getElementById("airport-name").textContent = data.name || "N/A";
    document.getElementById("airport-city").textContent = data.city || "N/A";
    document.getElementById("airport-country").textContent = data.country || "N/A";
    document.getElementById("airport-icao").textContent = data.icao || "N/A";
    document.getElementById("airport-iata").textContent = data.iata || "N/A";
    document.getElementById("airport-latitude").textContent = data.latitude || "N/A";
    document.getElementById("airport-longitude").textContent = data.longitude || "N/A";
    document.getElementById("max-temp").textContent = data.high || "N/A";
    document.getElementById("min-temp").textContent = data.low || "N/A";
    
    // Hide error message if displayed
    document.getElementById("error-message").style.display = "none";
}

function displayError(errorMessage) {
    // Display error message
    document.getElementById("error-message").style.display = "block";
    document.getElementById("error-text").textContent = errorMessage;

    // Hide airport details if error occurs
    document.getElementById("airport-details").style.display = "none";
}

// A user selects an airport to view the routes originating from the airport selected. 
document.addEventListener("DOMContentLoaded", async () => {
    const departureSelect = document.getElementById("departure-airport");
    const errorText = document.getElementById("error-text");

    try {
        const res = await fetch("/airports/routesorigin");
        const data = await res.json();

        // Clear existing options and add default
        departureSelect.innerHTML = '<option value="">-- Select an airport --</option>';

        data.airports.forEach(airport => {
            const iata = airport.iata || "N/A";
            const icao = airport.icao || "N/A";
            const codeDisplay = `${iata}/${icao}`;
        
            const option = document.createElement("option");
            option.value = iata || icao; // prioritize IATA as value
            option.textContent = `${airport.name} (${codeDisplay}) - ${airport.city}, ${airport.country}`;
            departureSelect.appendChild(option);
        });
        
    } catch (error) {
        errorText.textContent = "Failed to load airports.";
        document.getElementById("error-message").style.display = "block";
    }
});

document.getElementById("search-routes-btn").addEventListener("click", async () => {
    const selectedDeparture = document.getElementById("departure-airport").value;
    const routesSection = document.getElementById("routes-details");
    const arrivalsList = document.getElementById("arrival-airports-list");
    const errorBox = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");

    // Reset previous results
    routesSection.style.display = "none";
    arrivalsList.innerHTML = "";
    errorBox.style.display = "none";

    if (!selectedDeparture) {
        errorText.textContent = "Please select a departure airport.";
        errorBox.style.display = "block";
        return;
    }

    try {
        const res = await fetch(`/routes/arrivaldetails?departure=${selectedDeparture}`);
        const data = await res.json();

        if (!data.arrivals || data.arrivals.length === 0) {
            errorText.textContent = "No routes found from the selected airport.";
            errorBox.style.display = "block";
            return;
        }

        data.arrivals.forEach(route => {
            const li = document.createElement("li");
            li.textContent = `Arrival: ${route.arrival}, Airline: ${route.airline}, Plane(s): ${route.planes}`;
            arrivalsList.appendChild(li);
        });
        

        routesSection.style.display = "block";
    } catch (error) {
        errorText.textContent = "Failed to fetch arrival routes.";
        errorBox.style.display = "block";
    }
});

// A user selects an airport to view the routes arriving at the airport selected.
document.addEventListener("DOMContentLoaded", async () => {
    const arrivalSelect = document.getElementById("arrival-airport");
    const errorText = document.getElementById("error-text");

    try {
        const res = await fetch("/airports/routesorigin");
        const data = await res.json();

        arrivalSelect.innerHTML = '<option value="">-- Select an airport --</option>';

        data.airports.forEach(airport => {
            const iata = airport.iata || "N/A";
            const icao = airport.icao || "N/A";
            const codeDisplay = `${iata}/${icao}`;

            // Prioritize IATA for selection value
            const option = document.createElement("option");
            option.value = iata || icao;  // IATA is preferred as the value
            option.textContent = `${airport.name} (${codeDisplay}) - ${airport.city}, ${airport.country}`;
            arrivalSelect.appendChild(option);
        });
    } catch (error) {
        errorText.textContent = "Failed to load airports.";
        document.getElementById("error-message").style.display = "block";
    }
});

document.getElementById("search-arrivals-btn").addEventListener("click", async () => {
    const selectedArrival = document.getElementById("arrival-airport").value;
    const routesSection = document.getElementById("routes-details");
    const departuresList = document.getElementById("departure-airports-list");
    const errorBox = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");

    // Reset previous results and hide error message
    routesSection.style.display = "none";
    departuresList.innerHTML = "";
    errorBox.style.display = "none";

    if (!selectedArrival) {
        errorText.textContent = "Please select an arrival airport.";
        errorBox.style.display = "block";
        return;
    }

    try {
        // Fetch routes where the selected airport is the arrival airport
        const res = await fetch(`/routes/arrivalto?arrival=${selectedArrival}`);
        const data = await res.json();

        if (!data.departures || data.departures.length === 0) {
            errorText.textContent = "No departures found for the selected arrival airport.";
            errorBox.style.display = "block";
            return;
        }

        // Populate the list with departure airports for the selected arrival airport
        data.departures.forEach(route => {
            const li = document.createElement("li");
            li.textContent = `Departure: ${route.departure}, Airline: ${route.airline}, Plane(s): ${route.planes}`;
            departuresList.appendChild(li);
        });

        routesSection.style.display = "block";
    } catch (error) {
        errorText.textContent = "Failed to fetch departure routes for the selected arrival airport.";
        errorBox.style.display = "block";
    }
});

// A user selects an airport to view all airlines flying to/from the airports selected. 
document.addEventListener("DOMContentLoaded", async () => {
    const airportSelect = document.getElementById("airport-select");
    const airlineList = document.getElementById("airline-list");
    const fetchAirlinesBtn = document.getElementById("fetch-airlines-btn");
  
    // Populate airport dropdown
    try {
      const res = await fetch("/airports/routesorigin");
      const data = await res.json();
  
      data.airports.forEach(airport => {
        const option = document.createElement("option");
        option.value = airport.iata;
        option.textContent = `${airport.name} (${airport.iata}) - ${airport.city}, ${airport.country}`;
        airportSelect.appendChild(option);
      });
    } catch (err) {
      console.error("Error loading airports:", err);
    }
  
    // Handle button click
    fetchAirlinesBtn.addEventListener("click", async () => {
      const selectedIATA = airportSelect.value;
      airlineList.innerHTML = ""; // Clear previous results
  
      if (!selectedIATA) {
        airlineList.innerHTML = "<li>Please select an airport first.</li>";
        return;
      }
  
      try {
        const res = await fetch(`/airports/airlinesbyairport?iata=${selectedIATA}`);
        const data = await res.json();
  
        if (data.airlines.length === 0) {
          airlineList.innerHTML = "<li>No airlines found for this airport.</li>";
          return;
        }
  
        data.airlines.forEach(airline => {
          const li = document.createElement("li");
          li.textContent = `${airline.name} (${airline.iata}) - ${airline.country}`;
          airlineList.appendChild(li);
        });
      }catch (error) {
        errorText.textContent = "Failed to load airlines. Please try again.";
        errorBox.style.display = "block";
    }
    });
  });

// A user selects a pair of the airports to view all airlines flying between the airports selected. 
document.addEventListener("DOMContentLoaded", async () => {
  const airport1 = document.getElementById("airport1Routes");
  const airport2 = document.getElementById("airport2Routes");
  const getRoutesBtn = document.getElementById("getRoutesBtn");
  const resultDiv = document.getElementById("routesResult");

  const response = await fetch("/airports/routesorigin");
  const data = await response.json();
  const airports = data.airports;

  airports.forEach(airport => {
      const option1 = document.createElement("option");
      option1.value = airport.iata;
      option1.textContent = `${airport.name} (${airport.iata})`;
      airport1.appendChild(option1);
  });

  airport1.addEventListener("change", () => {
      airport2.disabled = false;
      getRoutesBtn.disabled = true;
      airport2.innerHTML = '<option value="">-- Choose an airport --</option>';

      const selectedIATA = airport1.value;

      airports
          .filter(airport => airport.iata !== selectedIATA)
          .forEach(airport => {
              const option2 = document.createElement("option");
              option2.value = airport.iata;
              option2.textContent = `${airport.name} (${airport.iata})`;
              airport2.appendChild(option2);
          });
  });

  airport2.addEventListener("change", () => {
      getRoutesBtn.disabled = !(airport1.value && airport2.value);
  });

  getRoutesBtn.addEventListener("click", async () => {
      const dep = airport1.value;
      const arr = airport2.value;

      resultDiv.innerHTML = "Loading...";

      try {
          const res = await fetch(`/routes/distance?departure=${dep}&arrival=${arr}`);
          const data = await res.json();

          if (res.ok) {
              const airlinesList = data.airlines_and_aircrafts.map(a =>
                  `<li><strong>Airline IATA: ${a.airline}</strong> - Aircrafts/Planes: ${a.planes.join(", ")}</li>`
              ).join("");

              resultDiv.innerHTML = `
                  <h4>Airlines Operating This Route:</h4>
                  <ul>${airlinesList}</ul>
              `;
          } else {
              resultDiv.innerHTML = `<p style="color: red;">${data.error}</p>`;
          }
      } catch (err) {
          resultDiv.innerHTML = `<p style="color: red;">Error fetching route data.</p>`;
      }
  });
});

// A user selects a pair of the airports to view the distance between the airports selected. 
document.addEventListener('DOMContentLoaded', async () => {
    // Fetch airports data from the server and populate dropdowns
    const airportsResponse = await fetch('/airports/routesorigin');
    const airportsData = await airportsResponse.json();

    const airportFromSelect = document.getElementById('airportFrom');
    const airportToSelect = document.getElementById('airportTo');

    // Store airports list for reuse
    const airportList = airportsData.airports;

    // Helper to populate both dropdowns initially
    const populateDropdown = () => {
        airportFromSelect.innerHTML = '<option value="">Select an airport</option>';
        airportToSelect.innerHTML = '<option value="">Select an airport</option>';

        airportList.forEach(airport => {
            const optionFrom = document.createElement('option');
            optionFrom.value = airport.iata;
            optionFrom.textContent = `${airport.name} (${airport.iata})`;
            airportFromSelect.appendChild(optionFrom);

            const optionTo = document.createElement('option');
            optionTo.value = airport.iata;
            optionTo.textContent = `${airport.name} (${airport.iata})`;
            airportToSelect.appendChild(optionTo);
        });
    };

    // Call the function to populate both dropdowns
    populateDropdown();

    // When the user selects an airport in the first dropdown
    airportFromSelect.addEventListener('change', () => {
        const selectedFrom = airportFromSelect.value;

        // Loop through the second dropdown options
        for (let option of airportToSelect.options) {
            if (option.value === selectedFrom) {
                option.disabled = true;
                option.style.opacity = '0.5';
                option.style.pointerEvents = 'none'; // Prevents clicking on it
            } else {
                option.disabled = false;
                option.style.opacity = '1';
                option.style.pointerEvents = 'auto';
            }
        }
    });

    // Handle the "Get Distance" button click
    document.getElementById('getDistanceButton').addEventListener('click', async () => {
        const from = airportFromSelect.value;
        const to = airportToSelect.value;

        if (!from || !to) {
            alert('Please select both airports.');
            return;
        }

        // Make a request to the server to get the distance between selected airports
        const response = await fetch(`/distance?from=${from}&to=${to}`);
        const distanceData = await response.json();

        if (response.ok) {
            const distanceText = `${distanceData.from.code} (${distanceData.from.type}) to ${distanceData.to.code} (${distanceData.to.type}): ${distanceData.distance_km}`;
            document.getElementById('distanceText').textContent = distanceText;
            document.getElementById('distanceResult').style.display = 'block';
        } else {
            alert('Error: ' + distanceData.error);
        }
    });
});

// Find nearest airport to current location (via browser geolocation)
async function findNearestAirport() {
    const resultDiv = document.getElementById("result");
    resultDiv.textContent = "Getting your location...";

    if (!navigator.geolocation) {
        resultDiv.textContent = "Geolocation is not supported by your browser.";
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        try {
            const response = await fetch("/airports/routesorigin");
            const data = await response.json();

            const airports = data.airports.filter(a =>
                a.iata && a.iata.length === 3 && !a.name.toLowerCase().includes("heliport")
            );

            // Calculate distance for each airport
            const airportsWithDistance = airports.map(airport => ({
                ...airport,
                distance: getQuickDistance(userLat, userLon, airport.latitude, airport.longitude)
            }));

            // Sort by distance
            const sortedAirports = airportsWithDistance.sort((a, b) => a.distance - b.distance);

            // Pick top 5
            const top5 = sortedAirports.slice(0, 5);

            if (top5.length === 0) {
                resultDiv.textContent = "No airports found nearby.";
                return;
            }

            // Display results
            resultDiv.innerHTML = "<h3>🛫 Top 5 Nearest Airports:</h3><ul>";
            top5.forEach((airport, i) => {
                resultDiv.innerHTML += `
                    <li>
                        <strong>${i + 1}. ${airport.name}</strong><br>
                        ${airport.city}, ${airport.country}<br>
                        IATA: ${airport.iata} | ICAO: ${airport.icao}<br>
                        Distance: ${airport.distance.toFixed(2)} units<br><br>
                    </li>
                `;
            });
            resultDiv.innerHTML += "</ul>";

        } catch (error) {
            console.error("Error fetching airports:", error);
            resultDiv.textContent = "Failed to retrieve airport data.";
        }
    }, () => {
        resultDiv.textContent = "Unable to access your location.";
    });
}

function getQuickDistance(lat1, lon1, lat2, lon2) {
    // Approximate Euclidean distance for nearby comparisons
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
}

// When a user selects an aircraft/plane type, show only routes that use that plane type.
// Populate plane dropdown
async function populateDistinctPlanes() {
    try {
        const response = await fetch('/distinctplanes');
        const planes = await response.json();
        const select = document.getElementById('plane-select');

        planes.forEach(plane => {
            const option = document.createElement('option');
            option.value = plane.code;
            option.textContent = `${plane.name} (${plane.code})`;
            select.appendChild(option);
        });        
    } catch (error) {
        console.error("Error loading distinct planes:", error);
    }
}

// Fetch routes using selected aircraft/plane type
async function filterRoutesByPlane() {
    const selectedCode = document.getElementById("plane-select").value;
    const output = document.getElementById("filtered-routes");
    output.innerHTML = "";

    if (!selectedCode) {
        output.innerHTML = "<p>Please select an aircraft type.</p>";
        return;
    }

    try {
        const response = await fetch(`/routes-by-plane/${encodeURIComponent(selectedCode)}`);
        if (!response.ok) {
            output.innerHTML = `<p>No routes found for plane type: ${selectedCode}</p>`;
            return;
        }

        const routes = await response.json();

        if (routes.length === 0) {
            output.innerHTML = "<p>No matching routes found.</p>";
            return;
        }

       // Show selected aircraft type at the top
const selectedPlaneOption = document.getElementById("plane-select").selectedOptions[0];
const planeHeader = document.createElement("h4");
planeHeader.textContent = `✈️ Routes using: ${selectedPlaneOption.text}`;
output.appendChild(planeHeader);

// Create table to display routes
const table = document.createElement("table");
table.style.borderCollapse = "collapse";
table.style.width = "80%"; // Set the table width to 80% of the container
table.style.margin = "20px auto"; // Center the table horizontally with margin
table.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)"; // Add a subtle shadow for depth
table.style.borderRadius = "8px"; // Rounded corners
table.style.overflow = "hidden"; // Prevent overflow if table content is too large
table.innerHTML = `
  <tr style="background-color: #f2f2f2;">
    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Airline</th>
    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Departure</th>
    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Arrival</th>
  </tr>
`;

routes.forEach(route => {
    const row = document.createElement("tr");
    row.style.backgroundColor = "#fff"; // White background for rows
    row.innerHTML = `
      <td style="padding: 12px; border: 1px solid #ddd;">${route.airline}</td>
      <td style="padding: 12px; border: 1px solid #ddd;">${route.departure}</td>
      <td style="padding: 12px; border: 1px solid #ddd;">${route.arrival}</td>
    `;
    table.appendChild(row);
});

output.appendChild(table);
    } catch (error) {
        console.error("Error fetching routes by plane:", error);
        output.innerHTML = "<p>Error loading routes.</p>";
    }
}

// Load countries, airlines, and planes on page load
window.onload = () => {
    populateCountries();  // Populate country dropdown
    populateAirlines();   // Populate airline dropdown
    populateDistinctPlanes();
};

// --------- Leaflet Map Setup ----------
let map = L.map('map').setView([20, 0], 2); // World view

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let airportMarkers = [];

document.getElementById("countrySelect").addEventListener("change", async () => {
  const code = document.getElementById("countrySelect").value;
  if (!code) return;

  // Remove previous markers
  airportMarkers.forEach(marker => map.removeLayer(marker));
  airportMarkers = [];

  try {
    const res = await fetch(`${API_BASE}/airports?country_code=${code}`);
    const airports = await res.json();

    airports.forEach(airport => {
      if (airport.latitude && airport.longitude) {
        const marker = L.marker([airport.latitude, airport.longitude])
          .addTo(map)
          .bindPopup(`<b>${airport.name}</b><br>${airport.city}, ${airport.country}<br>IATA: ${airport.iata || "N/A"}<br>ICAO: ${airport.icao || "N/A"}`);
        airportMarkers.push(marker);
      }
    });

    if (airports.length > 0) {
      const first = airports[0];
      map.setView([first.latitude, first.longitude], 5);
    }
  } catch (err) {
    console.error("Map loading failed:", err);
  }
});
