// src/routes/index.js
const express = require("express");
const apiRouter = require("./api");

const router = express.Router();

// Additional global middleware or routes can be defined here

router.use("/api", apiRouter);

module.exports = router;
