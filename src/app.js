const express = require("express");
const bodyParser = require("body-parser");
const routes = require("./routes");
const { connectToDatabase } = require("./config/databaseConfig");

const app = express();

// Middleware
app.use(bodyParser.json());

// Connect to the database
connectToDatabase();

// Routes
app.use(routes);

module.exports = app;
