const User = require("../models/User");

async function getAllUsers() {
  return User.find();
}

async function getUserById(userId) {
  return User.findById(userId);
}

async function createUser(userData) {
  const newUser = new User(userData);
  return newUser.save();
}

async function updateUser(userId, updatedData) {
  return User.findByIdAndUpdate(userId, updatedData, { new: true });
}

async function deleteUser(userId) {
  return User.findByIdAndDelete(userId);
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
