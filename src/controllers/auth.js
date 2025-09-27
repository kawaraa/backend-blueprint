import Controller from "./default.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;
const secure = process.env.NODE_ENV === "production";
const maxAge = 12 * 60 * 60 * 1000; // expires in 8hrs in milliseconds

export default class AuthController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
    this.selectUserQuery = `SELECT id,name,username,type,status,created_at FROM users WHERE username = ?`;
  }

  register = async ({ body: { name, username, password } }, res, next) => {
    try {
      const data = { name, username, type: "CONSUMER", password_hash: await bcrypt.hash(password, 10) };
      /**
       Todo: 
       1. Get the Consumers group id and assign the user to it
       2. Get the Consumer role id and assign it to the user so he can update his own info e.g. name
       */
      const user = await this.db.create("users", [data], "id");
      await this.db.updateById("users", { created_by: user.id }, user.id);
      res.json({ data: [user] });
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const user = await this.db.getOne(this.selectUserQuery, username);

      if (!user || !(await bcrypt.compare(password, user.password_hash))) return "UNAUTHORIZED";
      delete user.password_hash;

      const token = jwt.sign(user, secret, { expiresIn: maxAge / 1000 });
      res.cookie("accessToken", token, { httpOnly: true, secure, maxAge, sameSite: "strict" });
      res.json({ accessToken: token });
      const sql = `UPDATE users SET last_login = ? WHERE username = ?`;
      this.db.run(sql, [new Date().toISOString(), username]).catch(() => null);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res) => {
    res.cookie("accessToken", null, { httpOnly: true, secure, maxAge: 0, sameSite: "strict" });
    res.json({ success: true });
  };

  hash = async (req, res) => {
    res.json({ hash: await bcrypt.hash(req.params.password, 10) });
  };
}
