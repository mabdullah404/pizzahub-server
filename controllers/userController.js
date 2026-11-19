import { collections, toObjectId } from '../config/db.js';

/**
 * Get current user's profile
 */
export async function getCurrentUser(req, res) {
  try {
    const user = req.user;
    res.json({
      success: true,
      data: {
        id: user._id || user.id,
        _id: user._id || user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role || 'customer',
        businessName: user.businessName || '',
        phone: user.phone || '',
        subscriptionPlan: user.subscriptionPlan || 'free',
        subscriptionExpiresAt: user.subscriptionExpiresAt || null,
        isBlocked: user.isBlocked || user.banned || false,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ [getCurrentUser] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve user profile.' });
  }
}

/**
 * Update current user's profile
 * Security Rule: Cannot update role, isBlocked, or subscriptionPlan through this route!
 */
export async function updateProfile(req, res) {
  try {
    const user = req.user;
    const { name, image, businessName, phone } = req.body;

    const updateFields = {};
    if (name && name.trim()) updateFields.name = name.trim();
    if (image !== undefined) updateFields.image = image;
    if (businessName !== undefined) updateFields.businessName = businessName.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();

    updateFields.updatedAt = new Date();

    const userId = toObjectId(user._id || user.id);
    const query = userId ? { _id: userId } : { email: user.email };

    const result = await collections.users.findOneAndUpdate(
      query,
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    const updated = result.value || result;

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('❌ [updateProfile] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

/**
 * Admin: Get all users with search and role filter
 */
export async function getAllUsers(req, res) {
  try {
    const { search, role } = req.query;
    const query = {};

    if (search && search.trim()) {
      const sanitized = search.trim();
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
        { businessName: { $regex: sanitized, $options: 'i' } },
      ];
    }

    if (role && role.trim() && role !== 'all') {
      query.role = role.trim();
    }

    const userList = await collections.users
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: userList.length,
      data: userList,
    });
  } catch (error) {
    console.error('❌ [getAllUsers] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
}

/**
 * Admin: Block a user
 */
export async function blockUser(req, res) {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);
    const query = objectId ? { _id: objectId } : { id: String(id) };

    const targetUser = await collections.users.findOne(query);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot block an administrator account.',
      });
    }

    await collections.users.updateOne(query, {
      $set: { isBlocked: true, banned: true, blockedAt: new Date() },
    });

    res.json({ success: true, message: 'User has been blocked successfully.' });
  } catch (error) {
    console.error('❌ [blockUser] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to block user.' });
  }
}

/**
 * Admin: Unblock a user
 */
export async function unblockUser(req, res) {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);
    const query = objectId ? { _id: objectId } : { id: String(id) };

    const targetUser = await collections.users.findOne(query);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await collections.users.updateOne(query, {
      $set: { isBlocked: false, banned: false, unblockedAt: new Date() },
    });

    res.json({ success: true, message: 'User has been unblocked successfully.' });
  } catch (error) {
    console.error('❌ [unblockUser] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to unblock user.' });
  }
}
