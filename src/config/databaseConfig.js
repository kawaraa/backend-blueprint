const mongoose = require("mongoose");

function connectToDatabase() {
  mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection;

  db.on("error", console.error.bind(console, "MongoDB connection error:"));
  db.once("open", () => {
    console.log("Connected to the database");
  });
}

module.exports = {
  connectToDatabase,
};
