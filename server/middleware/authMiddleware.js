const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ message: "Access Denied" });
  }

  try {
    const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.user = verified; // This should now contain { id: "user_id", otherPayload }
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    res.status(403).json({ message: "Invalid Token" });
  }
};

module.exports = authMiddleware;

