import jwt from "jsonwebtoken";
import User from "../../models/User.js";
import Company from "../../models/Company.js";
import Admin from "../../models/admin.js";

const optionalAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let account = await User.findById(decoded.id).select("-password");
    if (!account) {
      account = await Company.findById(decoded.id).select("-password");
    }
    if (!account) {
      account = await Admin.findById(decoded.id).select("-password");
    }

    if (account) {
      req.user = account;
    }
  } catch (err) {
    // Ignore invalid tokens for optional auth
  }
  next();
};

export default optionalAuthMiddleware;
