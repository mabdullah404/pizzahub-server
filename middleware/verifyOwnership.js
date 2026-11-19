import { collections, toObjectId } from '../config/db.js';

/**
 * Middleware to verify vendor owns the menu item being modified/deleted.
 */
export async function verifyMenuItemOwnership(req, res, next) {
  try {
    const id = req.params.id;
    const objectId = toObjectId(id);
    if (!objectId) {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    }

    const item = await collections.menuItems.findOne({ _id: objectId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    // Admins can manage any item; vendors can only manage their own
    const currentUserId = String(req.user._id || req.user.id);
    const itemVendorId = String(item.vendorId);

    if (req.user.role !== 'admin' && itemVendorId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to modify this menu item.',
      });
    }

    req.menuItem = item;
    next();
  } catch (error) {
    console.error('❌ [verifyMenuItemOwnership] Error:', error);
    res.status(500).json({ success: false, message: 'Ownership verification failed.' });
  }
}

/**
 * Middleware to verify vendor owns the order they are accepting/rejecting.
 */
export async function verifyOrderVendorOwnership(req, res, next) {
  try {
    const id = req.params.id;
    const objectId = toObjectId(id);
    if (!objectId) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await collections.orders.findOne({ _id: objectId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const currentUserId = String(req.user._id || req.user.id);
    const orderVendorId = String(order.vendorId);

    if (req.user.role !== 'admin' && orderVendorId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this order.',
      });
    }

    req.order = order;
    next();
  } catch (error) {
    console.error('❌ [verifyOrderVendorOwnership] Error:', error);
    res.status(500).json({ success: false, message: 'Order ownership verification failed.' });
  }
}

/**
 * Middleware to verify customer owns the order they are cancelling.
 */
export async function verifyOrderCustomerOwnership(req, res, next) {
  try {
    const id = req.params.id;
    const objectId = toObjectId(id);
    if (!objectId) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await collections.orders.findOne({ _id: objectId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const currentUserId = String(req.user._id || req.user.id);
    const orderCustomerId = String(order.customerId);

    if (req.user.role !== 'admin' && orderCustomerId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot cancel an order that belongs to another customer.',
      });
    }

    req.order = order;
    next();
  } catch (error) {
    console.error('❌ [verifyOrderCustomerOwnership] Error:', error);
    res.status(500).json({ success: false, message: 'Customer order verification failed.' });
  }
}
