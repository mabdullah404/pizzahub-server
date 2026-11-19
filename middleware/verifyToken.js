import jwt from 'jsonwebtoken';
import { collections, toObjectId } from '../config/db.js';

/**
 * Middleware to verify user identity via Better Auth Session Token or JWT.
 * 1. Reads 'Authorization: Bearer <token>' header.
 * 2. Checks token against signed JWT (using BETTER_AUTH_SECRET) OR MongoDB session collection.
 * 3. Verifies token expiration.
 * 4. Loads user document from 'user' collection.
 * 5. Rejects blocked / banned users with 403.
 * 6. Attaches user to req.user.
 */
export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing Authorization header',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Malformed Authorization header. Expected Bearer <token>',
      });
    }

    const token = parts[1];
    let userId = null;
    let userEmail = null;

    // Approach A: Try verifying as standard signed JWT (if issued via JWT plugin)
    const jwtSecret = process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET;
    if (jwtSecret) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        if (decoded && (decoded.sub || decoded.id || decoded.userId)) {
          userId = decoded.sub || decoded.id || decoded.userId;
          userEmail = decoded.email;
        }
      } catch (jwtErr) {
        // Not a standard JWT or expired, will attempt session table lookup
      }
    }

    // Approach B: Verify Better Auth session in MongoDB 'session' collection
    if (!userId) {
      const sessionDoc = await collections.sessions.findOne({ token });
      if (sessionDoc) {
        if (sessionDoc.expiresAt && new Date(sessionDoc.expiresAt).getTime() < Date.now()) {
          return res.status(401).json({
            success: false,
            message: 'Unauthorized: Session has expired. Please log in again.',
          });
        }
        userId = sessionDoc.userId;
      }
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or expired token/session.',
      });
    }

    // Load user record from MongoDB
    let user = null;
    const userObjectId = toObjectId(userId);
    if (userObjectId) {
      user = await collections.users.findOne({ _id: userObjectId });
    }
    if (!user) {
      user = await collections.users.findOne({ id: String(userId) });
    }
    if (!user && userEmail) {
      user = await collections.users.findOne({ email: userEmail });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User account not found.',
      });
    }

    // Blocked user enforcement (Assignment Requirement)
    if (user.isBlocked === true || user.banned === true) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Your account has been suspended by an administrator.',
      });
    }

    // Attach full authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ [verifyToken] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication verification.',
    });
  }
}
