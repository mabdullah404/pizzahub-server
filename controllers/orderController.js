import { collections, toObjectId } from '../config/db.js';

/**
 * Customer: Place a new pizza order
 */
export async function createOrder(req, res) {
  try {
    const customer = req.user;
    const { itemId, deliveryDate, deliveryAddress, message } = req.body;

    if (!itemId || !deliveryDate || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Menu item ID, delivery date, and delivery address are required.',
      });
    }

    const itemObjectId = toObjectId(itemId);
    if (!itemObjectId) {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    }

    const menuItem = await collections.menuItems.findOne({ _id: itemObjectId });
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    // Must be approved and active
    if (menuItem.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'This menu item is currently unavailable for ordering.',
      });
    }

    const customerId = String(customer._id || customer.id);
    const vendorId = String(menuItem.vendorId);

    // Prevent ordering own items
    if (customerId === vendorId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot place an order for your own menu item.',
      });
    }

    // Prevent duplicate active orders for the same item and delivery date
    const existingActiveOrder = await collections.orders.findOne({
      itemId: String(menuItem._id),
      customerId,
      deliveryDate: String(deliveryDate).trim(),
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingActiveOrder) {
      return res.status(400).json({
        success: false,
        message:
          'You already have an active order for this pizza on the selected delivery date.',
      });
    }

    const newOrder = {
      itemId: String(menuItem._id),
      itemName: menuItem.itemName,
      itemPrice: menuItem.price,
      itemImage: menuItem.images?.[0] || '/images/chad-montano-MqT0asuoIcU-unsplash.jpg',
      itemCategory: menuItem.category,
      vendorId,
      vendorName: menuItem.vendorName || 'Pizzeria',
      vendorEmail: menuItem.vendorEmail,
      customerId,
      customerName: customer.name || 'Customer',
      customerEmail: customer.email,
      deliveryDate: String(deliveryDate).trim(),
      deliveryAddress: String(deliveryAddress).trim(),
      message: message ? String(message).trim() : '',
      status: 'pending',
      createdAt: new Date(),
    };

    const result = await collections.orders.insertOne(newOrder);
    newOrder._id = result.insertedId;

    res.status(201).json({
      success: true,
      message: 'Pizza order placed successfully! The restaurant will review it.',
      data: newOrder,
    });
  } catch (error) {
    console.error('❌ [createOrder] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to place order.' });
  }
}

/**
 * Customer: Get own orders
 */
export async function getCustomerOrders(req, res) {
  try {
    const customerId = String(req.user._id || req.user.id);
    const orders = await collections.orders
      .find({ customerId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('❌ [getCustomerOrders] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve orders.' });
  }
}

/**
 * Vendor: Get orders for vendor's restaurant
 */
export async function getVendorOrders(req, res) {
  try {
    const vendorId = String(req.user._id || req.user.id);
    const orders = await collections.orders
      .find({ vendorId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('❌ [getVendorOrders] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve vendor orders.' });
  }
}

/**
 * Vendor: Accept or Reject order (Only once, only when pending)
 */
export async function updateOrderStatusByVendor(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = req.order; // Attached by verifyOrderVendorOwnership

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "accepted" or "rejected".',
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order cannot be updated because it is already ${order.status}. Decisions are final.`,
      });
    }

    const objectId = toObjectId(id);
    const result = await collections.orders.findOneAndUpdate(
      { _id: objectId },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: `Order marked as ${status}.`,
      data: result.value || result,
    });
  } catch (error) {
    console.error('❌ [updateOrderStatusByVendor] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
}

/**
 * Customer: Cancel pending order
 */
export async function cancelOrderByCustomer(req, res) {
  try {
    const { id } = req.params;
    const order = req.order; // Attached by verifyOrderCustomerOwnership

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel this order because it is already ${order.status}. Only pending orders can be cancelled.`,
      });
    }

    const objectId = toObjectId(id);
    const result = await collections.orders.findOneAndUpdate(
      { _id: objectId },
      { $set: { status: 'cancelled', cancelledAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: 'Order cancelled successfully.',
      data: result.value || result,
    });
  } catch (error) {
    console.error('❌ [cancelOrderByCustomer] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel order.' });
  }
}
