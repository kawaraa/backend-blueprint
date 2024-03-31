const express = require("express");
const router = express.Router();

const AuthController = require("../controllers/AuthController");

router.get("/auth", AuthController.geToken);
router.post("/auth", AuthController.createToken);
router.put("/auth/:id", AuthController.updateToken);
router.delete("/auth/:id", AuthController.deleteExpireToken);

module.exports = router;
