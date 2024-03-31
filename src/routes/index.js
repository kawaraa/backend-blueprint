// src/routes/index.js
const router = require("express").Router();
const apiRouter = require("./api");

// Additional global middleware or routes can be defined here

router.use("/api", apiRouter);
router.use("/some-other-route", someOtherRouter);

module.exports = router;
