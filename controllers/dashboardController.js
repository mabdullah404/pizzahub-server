import { collections } from '../config/db.js';

/**
 * Vendor Dashboard Statistics
 */
export async function getVendorStats(req, res) {
  try {
    const vendorId = String(req.user._id || req.user.id);

    const [totalItems, activeItems, pendingOrders, acceptedOrders, allOrders] =
      await Promise.all([
        collections.menuItems.countDocuments({ vendorId }),
        collections.menuItems.countDocuments({ vendorId, status: 'approved' }),
        collections.orders.countDocuments({ vendorId, status: 'pending' }),
        collections.orders.countDocuments({ vendorId, status: 'accepted' }),
        collections.orders.find({ vendorId }).sort({ createdAt: -1 }).limit(10).toArray(),
      ]);

    // Group orders by status for chart
    const statusCounts = await collections.orders
      .aggregate([
        { $match: { vendorId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .toArray();

    res.json({
      success: true,
      data: {
        totalItems,
        activeItems,
        pendingOrders,
        acceptedOrders,
        subscriptionPlan: req.user.subscriptionPlan || 'free',
        subscriptionExpiresAt: req.user.subscriptionExpiresAt || null,
        recentOrders: allOrders,
        chartData: statusCounts.map((s) => ({ status: s._id, count: s.count })),
      },
    });
  } catch (error) {
    console.error('❌ [getVendorStats] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve vendor stats.' });
  }
}

/**
 * Customer Dashboard Statistics
 */
export async function getCustomerStats(req, res) {
  try {
    const customerId = String(req.user._id || req.user.id);

    const [totalOrders, pendingOrders, acceptedOrders, rejectedOrders, recentOrders] =
      await Promise.all([
        collections.orders.countDocuments({ customerId }),
        collections.orders.countDocuments({ customerId, status: 'pending' }),
        collections.orders.countDocuments({ customerId, status: 'accepted' }),
        collections.orders.countDocuments({ customerId, status: 'rejected' }),
        collections.orders.find({ customerId }).sort({ createdAt: -1 }).limit(5).toArray(),
      ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        acceptedOrders,
        rejectedOrders,
        recentOrders,
      },
    });
  } catch (error) {
    console.error('❌ [getCustomerStats] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve customer stats.' });
  }
}

/**
 * Admin Dashboard Statistics
 */
export async function getAdminStats(req, res) {
  try {
    const [
      totalUsers,
      totalVendors,
      totalCustomers,
      totalMenuItems,
      pendingMenuItems,
      totalTransactions,
      allTransactions,
    ] = await Promise.all([
      collections.users.countDocuments({}),
      collections.users.countDocuments({ role: 'vendor' }),
      collections.users.countDocuments({ role: 'customer' }),
      collections.menuItems.countDocuments({}),
      collections.menuItems.countDocuments({ status: 'pending' }),
      collections.transactions.countDocuments({ status: 'succeeded' }),
      collections.transactions.find({ status: 'succeeded' }).toArray(),
    ]);

    const totalRevenue = allTransactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // Chart distribution
    const roleDistribution = [
      { name: 'Vendors', value: totalVendors },
      { name: 'Customers', value: totalCustomers },
    ];

    res.json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        totalCustomers,
        totalMenuItems,
        pendingMenuItems,
        totalTransactions,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        roleDistribution,
      },
    });
  } catch (error) {
    console.error('❌ [getAdminStats] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve admin stats.' });
  }
}
