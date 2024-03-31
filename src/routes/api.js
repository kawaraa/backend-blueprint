// src/routes/index.js
const router = require("express").Router();
const authRoute = require("./authRoute");
const userRoute = require("./user");
const cartRoute = require("./cartRoute");
const productRoute = require("./productRoute");

// Additional global middleware or routes can be defined here

router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/cart", cartRoute);
router.use("/product", productRoute);

module.exports = router;
