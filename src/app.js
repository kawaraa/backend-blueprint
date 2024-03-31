const express = require("express");
const bodyParser = require("body-parser");
const routes = require("./routes");
const { connectToDatabase } = require("./config/databaseConfig");
const ProductNotifier = require("./models/ProductNotifier");
const ShoppingCartObserver = require("./models/ShoppingCartObserver");

const app = express();

// Middleware
app.use(bodyParser.json());

// Connect to the database
connectToDatabase();

// Routes
app.use(routes);

// Register observers with the subject
const productNotifier = new ProductNotifier();
const shoppingCartObserver = new ShoppingCartObserver();

productNotifier.addObserver(shoppingCartObserver);

// Notify observers with some data
subject.notify("Hello observers!");

module.exports = app;
