import { collections, toObjectId } from '../config/db.js';
import { DHAKA_LOCATIONS, VALID_CATEGORIES } from '../config/locations.js';

export { DHAKA_LOCATIONS, VALID_CATEGORIES };

/**
 * Public Menu Listing with Advanced Search, Filtering, and Sorting
 * Challenge 1 Implementation:
 * Supports:
 * - ?search=... (case-insensitive name or description)
 * - ?category=... (filter by category)
 * - ?location=... (filter by city or area)
 * - ?sort=price_asc | price_desc | newest
 * - ?limit=...
 * Only returns approved & active items for public requests.
 */
export async function getMenuItems(req, res) {
  try {
    const { search, category, location, sort, featured, limit } = req.query;

    const query = {
      status: 'approved',
    };

    if (search && search.trim()) {
      const sanitized = search.trim();
      query.$or = [
        { itemName: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
      ];
    }

    if (category && category.trim() && category !== 'All') {
      query.category = { $regex: `^${category.trim()}$`, $options: 'i' };
    }

    if (location && location.trim() && location !== 'All') {
      query.location = { $regex: location.trim(), $options: 'i' };
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'price_asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { price: -1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    }

    const maxLimit = limit ? Math.min(parseInt(limit, 10), 100) : 100;

    const items = await collections.menuItems
      .find(query)
      .sort(sortOptions)
      .limit(maxLimit)
      .toArray();

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error('❌ [getMenuItems] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch menu items.' });
  }
}

/**
 * Get details for a single menu item
 */
export async function getMenuItemById(req, res) {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);
    if (!objectId) {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID.' });
    }

    const item = await collections.menuItems.findOne({ _id: objectId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found.' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('❌ [getMenuItemById] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve menu item.' });
  }
}

/**
 * Vendor: Create New Menu Item
 * Enforces Free Tier max 3 active items limit.
 */
export async function createMenuItem(req, res) {
  try {
    const user = req.user;
    const { itemName, category, description, price, location, images } = req.body;

    if (!itemName || !category || !description || price === undefined || !location) {
      return res.status(400).json({
        success: false,
        message: 'All fields (Item Name, Category, Description, Price, Location) are required.',
      });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid positive number.',
      });
    }

    if (!VALID_CATEGORIES.includes(category.trim())) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    const trimmedLoc = location.trim();
    const isValidLoc = DHAKA_LOCATIONS.some(
      (loc) => loc.toLowerCase() === trimmedLoc.toLowerCase() || trimmedLoc.toLowerCase().includes(loc.toLowerCase())
    );
    if (!isValidLoc) {
      return res.status(400).json({
        success: false,
        message: `Invalid location. Must be in Dhaka: ${DHAKA_LOCATIONS.join(', ')}`,
      });
    }

    // Verify Free Tier Limits
    const isPremium = user.subscriptionPlan === 'premium';
    const vendorId = String(user._id || user.id);

    if (!isPremium) {
      const activeCount = await collections.menuItems.countDocuments({
        vendorId,
        status: { $in: ['pending', 'approved'] },
      });

      if (activeCount >= 3) {
        return res.status(403).json({
          success: false,
          code: 'LIMIT_EXCEEDED',
          message:
            'Free plan limit reached! You can have at most 3 active menu items. Please upgrade to Premium for unlimited publishing.',
        });
      }
    }

    const imageArray = Array.isArray(images)
      ? images
      : images
      ? [images]
      : ['/images/chad-montano-MqT0asuoIcU-unsplash.jpg'];

    const newItem = {
      vendorId,
      vendorName: user.name || 'Artisan Pizzeria',
      vendorEmail: user.email,
      businessName: user.businessName || user.name || 'Artisan Pizzeria',
      itemName: itemName.trim(),
      category: category.trim(),
      description: description.trim(),
      price: parsedPrice,
      location: location.trim(),
      images: imageArray,
      status: 'pending', // Starts in pending status until approved by admin
      isFeatured: isPremium,
      createdAt: new Date(),
    };

    const result = await collections.menuItems.insertOne(newItem);
    newItem._id = result.insertedId;

    res.status(201).json({
      success: true,
      message: 'Menu item submitted successfully! It is pending admin approval.',
      data: newItem,
    });
  } catch (error) {
    console.error('❌ [createMenuItem] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create menu item.' });
  }
}

/**
 * Vendor: Retrieve own menu items
 */
export async function getVendorMenuItems(req, res) {
  try {
    const vendorId = String(req.user._id || req.user.id);
    const items = await collections.menuItems
      .find({ vendorId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('❌ [getVendorMenuItems] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor menu items.' });
  }
}

/**
 * Vendor or Admin: Update menu item
 */
export async function updateMenuItem(req, res) {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);
    const { itemName, category, description, price, location, images, status } = req.body;

    const updateFields = {};
    if (itemName) updateFields.itemName = itemName.trim();
    if (category) updateFields.category = category.trim();
    if (description) updateFields.description = description.trim();
    if (price !== undefined) updateFields.price = parseFloat(price);
    if (location) updateFields.location = location.trim();
    if (images) updateFields.images = Array.isArray(images) ? images : [images];

    // Only admins can change status to approved/rejected; vendors can toggle active/inactive
    if (status) {
      if (req.user.role === 'admin') {
        updateFields.status = status;
      } else if (status === 'inactive' || status === 'pending') {
        updateFields.status = status;
      }
    }

    updateFields.updatedAt = new Date();

    const result = await collections.menuItems.findOneAndUpdate(
      { _id: objectId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: 'Menu item updated successfully.',
      data: result.value || result,
    });
  } catch (error) {
    console.error('❌ [updateMenuItem] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update menu item.' });
  }
}

/**
 * Vendor or Admin: Delete menu item
 */
export async function deleteMenuItem(req, res) {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);

    await collections.menuItems.deleteOne({ _id: objectId });
    res.json({ success: true, message: 'Menu item deleted successfully.' });
  } catch (error) {
    console.error('❌ [deleteMenuItem] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete menu item.' });
  }
}

/**
 * Admin: Approve / Reject / Update Status
 */
export async function updateMenuItemStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: pending, approved, rejected, inactive.',
      });
    }

    const objectId = toObjectId(id);
    const result = await collections.menuItems.findOneAndUpdate(
      { _id: objectId },
      { $set: { status, reviewedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: `Menu item status updated to ${status}.`,
      data: result.value || result,
    });
  } catch (error) {
    console.error('❌ [updateMenuItemStatus] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update item status.' });
  }
}

/**
 * Admin: Get all submitted menu items (pending, approved, rejected, inactive)
 */
export async function getAdminMenuItems(req, res) {
  try {
    const { search, status, category, limit = 100 } = req.query;
    const query = {};

    if (status && status !== 'all' && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const sanitized = search.trim();
      query.$or = [
        { itemName: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
        { vendorName: { $regex: sanitized, $options: 'i' } },
        { vendorEmail: { $regex: sanitized, $options: 'i' } },
        { businessName: { $regex: sanitized, $options: 'i' } },
      ];
    }

    if (category && category !== 'all' && category !== 'All') {
      query.category = { $regex: `^${category.trim()}$`, $options: 'i' };
    }

    const items = await collections.menuItems
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 100)
      .toArray();

    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error('❌ [getAdminMenuItems] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch catalog items for admin.' });
  }
}
