const { body, validationResult } = require("express-validator");

const userValidationRules = () => {
  return [body("username").notEmpty(), body("email").isEmail(), body("password").isLength({ min: 5 })];
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  return res.status(422).json({ errors: errors.array() });
};

module.exports = {
  userValidationRules,
  validate,
};
