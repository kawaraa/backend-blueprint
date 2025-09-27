import jwt from "jsonwebtoken";
const secret = process.env.JWT_SECRET;

export default function getAuthMiddleware(onlyParseToken) {
  return onlyParseToken ? parseTokenMiddleware : [parseTokenMiddleware, checkUser];
}

export const checkUser = (req, res, next) => {
  try {
    if (!req.user) throw "unauthenticated";
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid authentication token" });
  }
};

export const parseTokenMiddleware = (req, res, next) => {
  try {
    const token = req.get("Authorization")?.replace("Bearer ", "") || req.cookies?.accessToken;
    if (token) req.user = jwt.verify(token, secret); // decoded Token contains the user info
  } catch (error) {
    // console.log("authMiddleware:", error);
  }
  next();
};
