/**
 * Role-Based Access Control Middlewares
 * Ensures users can only access endpoints authorized for their designated platform role.
 */

export function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Administrator privileges required.',
    });
  }
  next();
}

export function verifyVendor(req, res, next) {
  if (!req.user || req.user.role !== 'vendor') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Vendor (Restaurant) privileges required.',
    });
  }
  next();
}

export function verifyCustomer(req, res, next) {
  if (!req.user || req.user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Customer privileges required.',
    });
  }
  next();
}

export function verifyVendorOrAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'vendor' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Vendor or Administrator privileges required.',
    });
  }
  next();
}
