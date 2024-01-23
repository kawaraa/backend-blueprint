const UserService = require("../services/userService");

async function getAllUsers(req, res) {
  const users = await UserService.getAllUsers();
  res.json(users);
}

async function getUserById(req, res) {
  const userId = req.params.id;
  const user = await UserService.getUserById(userId);
  res.json(user);
}

async function createUser(req, res) {
  const userData = req.body;
  const newUser = await UserService.createUser(userData);
  res.json(newUser);
}

async function updateUser(req, res) {
  const userId = req.params.id;
  const updatedData = req.body;
  const updatedUser = await UserService.updateUser(userId, updatedData);
  res.json(updatedUser);
}

async function deleteUser(req, res) {
  const userId = req.params.id;
  await UserService.deleteUser(userId);
  res.json({ message: "User deleted successfully" });
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
