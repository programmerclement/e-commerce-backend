import Stripe from 'stripe';
import Order from '../models/Order.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create payment intent
// @route   POST /api/v1/payment/create-intent
// @access  Private
export const createPaymentIntent = async (req, res) => {
  try {
    const { orderId, amount, currency = 'usd' } = req.body;

    // Verify order exists
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id
      }
    });

    // Update order with payment intent ID
    order.payment.stripePaymentIntentId = paymentIntent.id;
    await order.save();

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent'
    });
  }
};

// @desc    Confirm payment
// @route   POST /api/v1/payment/confirm
// @access  Private
export const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Find order
    const order = await Order.findOne({
      'payment.stripePaymentIntentId': paymentIntentId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order payment status
    if (paymentIntent.status === 'succeeded') {
      order.payment.status = 'paid';
      order.payment.paymentDate = new Date();
      order.payment.transactionId = paymentIntent.id;
      order.orderStatus = 'confirmed';
      
      await order.save();

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          orderId: order._id,
          status: order.orderStatus
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Payment ${paymentIntent.status}`
      });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment'
    });
  }
};

// @desc    Create mobile payment (MoMo)
// @route   POST /api/v1/payment/mobile/create
// @access  Private
export const createMobilePayment = async (req, res) => {
  try {
    const { orderId, phoneNumber, provider = 'mtn' } = req.body;

    // Verify order exists
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // In a real implementation, you would call the MoMo API here
    // This is a mock implementation

    // Generate mock transaction ID
    const transactionId = `MOMO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update order
    order.payment.momoTransactionId = transactionId;
    order.payment.status = 'pending';
    await order.save();

    // Simulate payment request
    // In reality, you would redirect user to MoMo payment page

    res.status(200).json({
      success: true,
      message: 'Mobile payment initiated',
      data: {
        transactionId,
        phoneNumber,
        amount: order.totalPrice,
        currency: 'GHS',
        provider
      }
    });
  } catch (error) {
    console.error('Create mobile payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create mobile payment'
    });
  }
};

// @desc    Verify mobile payment
// @route   POST /api/v1/payment/mobile/verify
// @access  Private
export const verifyMobilePayment = async (req, res) => {
  try {
    const { transactionId } = req.body;

    // Find order
    const order = await Order.findOne({
      'payment.momoTransactionId': transactionId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // In a real implementation, you would verify with MoMo API
    // This is a mock verification

    // Mock verification - assume payment is successful
    order.payment.status = 'paid';
    order.payment.paymentDate = new Date();
    order.orderStatus = 'confirmed';
    
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: order._id,
        status: order.orderStatus
      }
    });
  } catch (error) {
    console.error('Verify mobile payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify mobile payment'
    });
  }
};

// @desc    Get payment methods
// @route   GET /api/v1/payment/methods
// @access  Private
export const getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'stripe',
        name: 'Credit/Debit Card',
        description: 'Pay with Visa, Mastercard, or American Express',
        icon: 'credit-card',
        enabled: true,
        countries: ['US', 'GB', 'CA', 'AU', 'EU']
      },
      {
        id: 'momo',
        name: 'Mobile Money',
        description: 'Pay with MTN MoMo or other mobile money services',
        icon: 'smartphone',
        enabled: true,
        countries: ['GH', 'KE', 'UG', 'TZ', 'ZA']
      },
      {
        id: 'itecpay',
        name: 'ITECPay',
        description: 'Secure online payment solution',
        icon: 'shield',
        enabled: true,
        countries: ['GH', 'NG']
      },
      {
        id: 'cod',
        name: 'Cash on Delivery',
        description: 'Pay when you receive your order',
        icon: 'package',
        enabled: true,
        countries: ['GH', 'NG', 'KE']
      }
    ];

    // Filter by user's country if available
    const userCountry = req.user.addresses?.[0]?.country || 'GH';
    const availableMethods = paymentMethods.filter(method => 
      method.enabled && (!method.countries || method.countries.includes(userCountry))
    );

    res.status(200).json({
      success: true,
      data: availableMethods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment methods'
    });
  }
};