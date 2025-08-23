import jwt from "jsonwebtoken";
const secret = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  try {
    const token = req.get("Authorization")?.replace("Bearer ", "") || req.cookies?.accessToken;
    if (!token) throw "unauthenticated";
    req.user = jwt.verify(token, secret); // decoded Token contains the user info
    const myRoute = req.url == "/my" || req.url.startsWith("/my/");
    if (req.user.type == "APPLICANT" && !myRoute) return res.status(404).json({ message: "not_found" });
    next();
  } catch (error) {
    // console.log("authMiddleware:", error);
    return res.status(401).json({ message: "Invalid authentication token" });
  }
};

export default authMiddleware;
