# ✈️ FlightNet-App

A full-stack web app to explore airlines, airports, countries, planes and routes across the globe using PostgreSQL, Express, and dynamic HTML/CSS/JS frontend.

---

## 📂 Project Structure

FlightNet-App/

│

├── public/ # Frontend UI

│ ├── index.html # Main user interface of the website.

│ ├── client.js # Client-side logic and event handling.

│ └── styles.css # Styling for layout and responsiveness.

│

├── server.js # Express backend with all API logic.

├── package.json # Node.js project configuration

├── package-lock.json # Auto-generated npm dependency lock

├── node_modules/ # Auto-generated folder containing installed dependencies (not committed to repo)

└── README.md # Project documentation


### Note on `node_modules`

The `node_modules` directory is not included in the repository. It is automatically generated when you run the following command in the project root:

```bash
npm install
```
---
### 📌 Prerequisites

- ✅ Node.js and npm installed
- ✅ PostgreSQL installed locally
- ✅ 5 operational tables (`airlines`, `airports`, `routes`, `planes`, `countries`) must be loaded into a local PostgreSQL database (e.g., assignment3). If you use a different database name, make sure to update it accordingly in the server.js file.

---

### 🛠️ Setup Steps

> 💡 **Important**: After cloning the project, run `npm install` to generate the `node_modules/ ` folder before starting the server using `npm start` .

---

### Steps to Run the Website for Testing

To run the website for testing, follow these steps:

1. **Prerequisites:**
   - Ensure that Node.js and PostgreSQL are installed on your local machine.

2. **Decompress the Zip File:**
   - Decompress the zip file. This will extract all the necessary files for the project.

3. **Install Dependencies:**
   - Open a terminal and navigate to the extracted project directory.
   - Run the following command to install all required Node.js dependencies:

     ```bash
     npm install
     ```

4. **Set Up PostgreSQL Database:**
   - Create a PostgreSQL database on your local machine.
   - Import the provided CSV files into their respective tables.  
     The required tables are:  
     `airlines`, `airports`, `routes`, `planes`, and `countries`.


5. **Configure the Backend:**
   - In the `server.js` file, configure your PostgreSQL connection details.

6. **Run the Backend Server:**
   - In the project directory, run the following command to start the server:

     ```bash
     npm start
     ```

   - This will start the backend on: [http://localhost:8001](http://localhost:8001)

7. **Open the Website:**
   - Open your browser and go to [http://localhost:8001](http://localhost:8001) to test the website.

8. **Testing the Features:**
   - Test each feature by selecting options in the dropdown menus and interacting with the buttons on the webpage.
   - The results will be fetched from the backend API and displayed on the page.

---
### 🌍 Technologies Used

- **Backend:** Node.js, Express.js, PostgreSQL
- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **APIs:** Open-Meteo (Weather), Leaflet.js (Map)
- **Other Tools:** Axios, json-formatter-js

---
### 📖 Notes

- ✅ Web server listens on port 8001
- ✅ All client-side code is placed inside the `/public` folder
- ✅ Server code is implemented in one file: `server.js`
- ✅ The website must be tested via `npm start` and accessible at [http://localhost:8001](http://localhost:8001)
