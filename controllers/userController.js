import { collections, toObjectId } from '../config/db.js';

/**
 * Get current user's profile
 */
export async function getCurrentUser(req, res) {
  try {
    const user = req.user;
    const rawUserId = String(user._id || user.id);
    let profileDoc = null;
    try {
      profileDoc = await collections.profiles.findOne({ userId: rawUserId });
    } catch {}

    res.json({
      success: true,
      data: {
        id: user._id || user.id,
        _id: user._id || user.id,
        name: profileDoc?.name || user.name,
        email: user.email,
        image: profileDoc?.image || user.image,
        role: user.role || 'customer',
        businessName: profileDoc?.businessName || user.businessName || '',
        phone: profileDoc?.phone || user.phone || '',
        subscriptionPlan: user.subscriptionPlan || 'free',
        subscriptionExpiresAt: user.subscriptionExpiresAt || null,
        isBlocked: user.isBlocked || user.banned || false,
        status: user.status || (user.role === 'vendor' ? 'pending' : 'approved'),
        isApproved: user.isApproved !== undefined ? user.isApproved : (user.role === 'vendor' ? user.status === 'approved' : true),
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

    // Synchronize to dedicated 'profiles' collection for persistent profile records
    try {
      const rawUserId = String(user._id || user.id);
      await collections.profiles.updateOne(
        { userId: rawUserId },
        {
          $set: {
            userId: rawUserId,
            email: user.email,
            name: updateFields.name || user.name,
            image: updateFields.image !== undefined ? updateFields.image : user.image,
            businessName: updateFields.businessName !== undefined ? updateFields.businessName : user.businessName,
            phone: updateFields.phone !== undefined ? updateFields.phone : user.phone,
            role: user.role || 'customer',
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    } catch (profileErr) {
      console.warn('⚠️ [updateProfile] Non-blocking profile collection sync error:', profileErr.message);
    }

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

/**
 * Admin: Approve a vendor account
 */
export async function approveVendor(req, res) {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);
    const query = objectId ? { _id: objectId } : { id: String(id) };

    const targetUser = await collections.users.findOne(query);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'Only vendor accounts can be approved as a restaurant partner.',
      });
    }

    await collections.users.updateOne(query, {
      $set: {
        status: 'approved',
        isApproved: true,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Vendor "${targetUser.name || targetUser.businessName || targetUser.email}" approved successfully.`,
    });
  } catch (error) {
    console.error('❌ [approveVendor] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve vendor.' });
  }
}

/**
 * Admin: Reject a vendor account
 */
export async function rejectVendor(req, res) {
  try {
    const { id } = req.params;
    const objectId = toObjectId(id);
    const query = objectId ? { _id: objectId } : { id: String(id) };

    const targetUser = await collections.users.findOne(query);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await collections.users.updateOne(query, {
      $set: {
        status: 'rejected',
        isApproved: false,
        rejectedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Vendor "${targetUser.name || targetUser.email}" rejected.`,
    });
  } catch (error) {
    console.error('❌ [rejectVendor] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject vendor.' });
  }
}

/**
 * Admin: General user status update (e.g. status: 'approved' | 'pending' | 'rejected')
 */
export async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, pending, or rejected.',
      });
    }

    const objectId = toObjectId(id);
    const query = objectId ? { _id: objectId } : { id: String(id) };

    const targetUser = await collections.users.findOne(query);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await collections.users.updateOne(query, {
      $set: {
        status,
        isApproved: status === 'approved',
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `User status updated to ${status}.`,
    });
  } catch (error) {
    console.error('❌ [updateUserStatus] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
}
