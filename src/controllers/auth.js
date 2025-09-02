import Controller from "./default.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import User from "../models/user.js";
// Prevent brute-force attacks (e.g. with express-rate-limit).

const secret = process.env.JWT_SECRET;
const secure = process.env.NODE_ENV === "production";
const maxAge = 8 * 60 * 60 * 1000; // expires in 8hrs

export default class AuthController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
    this.fieldsForJWT = "id,name,username,type,branch_id,status,last_login,password_hash";
  }

  register = async ({ body: { name, username, password } }, res, next) => {
    try {
      const data = { name, username, type: "APPLICANT", password_hash: await bcrypt.hash(password, 10) };
      const user = (await this.db.create("users", [data], "id"))[0];
      await this.db.updateById("users", { created_by: user.id }, user.id);
      res.json({ data: [user] });
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const { username, password } = req.body;

      const user = (await this.db.getByField("users", "username", username, this.fieldsForJWT))[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash))) return next("UNAUTHORIZED");
      delete user.password_hash;
      console.log(user);
      const token = jwt.sign(user, secret, { expiresIn: maxAge });
      res.cookie("accessToken", token, { httpOnly: true, secure, maxAge, sameSite: "strict" });
      res.json({ accessToken: token });
      const sql = `UPDATE users SET last_login = $1 WHERE username = $2`;
      this.db.run(sql, [new Date().toISOString(), username]).catch(() => null);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res) => {
    res.cookie("accessToken", null, { httpOnly: true, secure, maxAge, sameSite: "strict" });
    res.json({ success: true });
  };

  hash = async (req, res) => {
    res.json({ hash: await bcrypt.hash(req.params.password, 10) });
  };
}
