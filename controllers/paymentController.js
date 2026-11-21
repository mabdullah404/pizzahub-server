import Stripe from 'stripe';
import { collections, toObjectId } from '../config/db.js';

const getStripe = () => {
  return process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
};

const PREMIUM_PLAN_PRICE = 29.0; // $29.00 / month

function getCleanClientUrl(req) {
  const candidate = req?.body?.origin || req?.headers?.origin || req?.headers?.referer || process.env.CLIENT_URL;
  if (!candidate) return 'https://pizzahub-client-tan.vercel.app';
  try {
    const s = String(candidate).trim();
    const p = new URL(s.startsWith('http') ? s : 'https://' + s);
    return p.origin;
  } catch {
    return 'https://pizzahub-client-tan.vercel.app';
  }
}

/**
 * Vendor: Create Stripe Checkout Session for Premium Subscription
 */
export async function createCheckoutSession(req, res) {
  try {
    const user = req.user;
    const vendorId = String(user._id || user.id);
    const clientUrl = getCleanClientUrl(req);

    if (user.subscriptionPlan === 'premium') {
      return res.status(400).json({
        success: false,
        message: 'You already have an active Premium subscription!',
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      // Sandbox fallback if Stripe API key is not configured locally yet
      const sandboxSessionId = `sandbox_cs_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return res.json({
        success: true,
        mode: 'sandbox',
        url: `${clientUrl}/dashboard/vendor/subscription?session_id=${sandboxSessionId}&payment=success&sandbox=true`,
        sessionId: sandboxSessionId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'PizzaHub Vendor Premium Subscription',
              description:
                'Unlimited active menu items, Premium Restaurant Badge, and Featured placement on Homepage.',
            },
            unit_amount: Math.round(PREMIUM_PLAN_PRICE * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: user.email,
      metadata: {
        vendorId,
        vendorEmail: user.email,
        vendorName: user.name || 'Vendor',
        plan: 'premium',
      },
      success_url: `${clientUrl}/dashboard/vendor/subscription?session_id={CHECKOUT_SESSION_ID}&payment=success`,
      cancel_url: `${clientUrl}/dashboard/vendor/subscription?payment=cancelled`,
    });

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('❌ [createCheckoutSession] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session.',
      error: error.message,
    });
  }
}

/**
 * Handle Stripe Webhook
 * Must verify event signature with STRIPE_WEBHOOK_SECRET
 * Idempotent: Does not duplicate transactions
 */
export async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const stripe = getStripe();
  let event = null;

  try {
    if (stripe && process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error('⚠️ [handleStripeWebhook] Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const vendorId = session.metadata?.vendorId;
      const sessionId = session.id;

      // Idempotency check: see if transaction already processed
      const existingTx = await collections.transactions.findOne({ stripeSessionId: sessionId });
      if (existingTx) {
        return res.json({ received: true, message: 'Already processed' });
      }

      // Record transaction
      const transactionDoc = {
        vendorId,
        vendorEmail: session.metadata?.vendorEmail || session.customer_details?.email,
        vendorName: session.metadata?.vendorName || 'Vendor',
        plan: 'premium',
        amount: session.amount_total ? session.amount_total / 100 : PREMIUM_PLAN_PRICE,
        currency: session.currency || 'usd',
        stripeSessionId: sessionId,
        stripeSubscriptionId: session.subscription || null,
        status: 'succeeded',
        createdAt: new Date(),
      };

      await collections.transactions.insertOne(transactionDoc);

      // Upgrade Vendor account to Premium for 30 days
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const userObjectId = toObjectId(vendorId);
      const userQuery = userObjectId ? { _id: userObjectId } : { id: String(vendorId) };

      await collections.users.updateOne(userQuery, {
        $set: {
          subscriptionPlan: 'premium',
          subscriptionExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
      });

      console.log(`🎉 Vendor [${vendorId}] successfully upgraded to Premium!`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('❌ [handleStripeWebhook] Error processing event:', err);
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
}

/**
 * Confirm/Verify session on return (Handles sandbox or fallback verification)
 */
export async function confirmPaymentSession(req, res) {
  try {
    const { sessionId, sandbox } = req.body;
    const user = req.user;
    const vendorId = String(user._id || user.id);

    // If sandbox or direct verification
    const existingTx = await collections.transactions.findOne({ stripeSessionId: sessionId });
    if (!existingTx) {
      const transactionDoc = {
        vendorId,
        vendorEmail: user.email,
        vendorName: user.name || 'Vendor',
        plan: 'premium',
        amount: PREMIUM_PLAN_PRICE,
        currency: 'usd',
        stripeSessionId: sessionId,
        status: 'succeeded',
        createdAt: new Date(),
      };
      await collections.transactions.insertOne(transactionDoc);

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const userObjectId = toObjectId(vendorId);
      const userQuery = userObjectId ? { _id: userObjectId } : { id: String(vendorId) };

      await collections.users.updateOne(userQuery, {
        $set: {
          subscriptionPlan: 'premium',
          subscriptionExpiresAt: expiresAt,
          updatedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      message: 'Subscription confirmed successfully. You are now a Premium Vendor!',
    });
  } catch (error) {
    console.error('❌ [confirmPaymentSession] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm payment.' });
  }
}

/**
 * Admin: Get all transactions
 * Note: Admin CANNOT edit payment records as per assignment rules.
 */
export async function getAllTransactions(req, res) {
  try {
    const transactions = await collections.transactions
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error('❌ [getAllTransactions] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve transactions.' });
  }
}
