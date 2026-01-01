import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendOrderConfirmationEmail } from '../utils/sendEmail.js';

// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      couponCode
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items in order'
      });
    }

    let orderItems = [];
    let itemsPrice = 0;

    // Process each item
    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`
        });
      }

      // Check stock
      let availableStock = product.stock;
      let variantPrice = product.currentPrice || product.price;
      let variantSku = product.sku;

      if (item.variant && product.variants && product.variants.length > 0) {
        const variant = product.variants.find(v => v.sku === item.variant.sku);
        if (!variant) {
          return res.status(400).json({
            success: false,
            message: `Variant ${item.variant.sku} not found`
          });
        }
        
        availableStock = variant.stock;
        variantPrice = variant.price;
        variantSku = variant.sku;
      }

      if (availableStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${availableStock}`
        });
      }

      const price = variantPrice;
      const total = price * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0] || {},
        price,
        quantity: item.quantity,
        variant: item.variant ? { ...item.variant, sku: variantSku } : null,
        sku: variantSku,
        total
      });

      itemsPrice += total;

      // Reduce stock
      if (item.variant) {
        const variant = product.variants.find(v => v.sku === item.variant.sku);
        if (variant) {
          variant.stock -= item.quantity;
        }
      } else {
        product.stock -= item.quantity;
      }

      // Update sold count
      product.soldCount += item.quantity;
      await product.save();
    }

    // Calculate shipping
    const shippingPrice = itemsPrice > 50 ? 0 : 10; // Free shipping over $50

    // Calculate tax
    const taxPrice = itemsPrice * 0.08; // 8% tax

    // Calculate total
    let totalPrice = itemsPrice + shippingPrice + taxPrice;

    // Apply coupon if provided
    let coupon = null;
    if (couponCode) {
      // Here you would validate and apply coupon
      // For now, we'll simulate a 10% discount
      const discount = itemsPrice * 0.1;
      totalPrice -= discount;
      coupon = {
        code: couponCode,
        discount
      };
    }

    // Create order
    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      coupon,
      shipping: {
        address: shippingAddress,
        cost: shippingPrice
      },
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'pending' : 'pending'
      }
    });

    // Update user's order history
    await User.findByIdAndUpdate(req.user.id, {
      $push: { orders: order._id }
    });

    // Send confirmation email
    const user = await User.findById(req.user.id);
    await sendOrderConfirmationEmail(order, user);

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/v1/orders
// @access  Private/Admin
export const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .populate('user', 'name email')
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    const total = await Order.countDocuments();

    // Calculate statistics
    const totalRevenue = await Order.aggregate([
      { $match: { 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
    const completedOrders = await Order.countDocuments({ orderStatus: 'delivered' });

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      statistics: {
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingOrders,
        completedOrders,
        totalOrders: total
      },
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// @desc    Get single order (Admin)
// @route   GET /api/v1/orders/admin/:id
// @access  Private/Admin
export const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name slug images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

// @desc    Get my orders
// @route   GET /api/v1/orders/my-orders
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: req.user.id })
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    const total = await Order.countDocuments({ user: req.user.id });

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: orders
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/v1/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('items.product', 'name slug images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/v1/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, carrier } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    order.orderStatus = status;

    // Update shipping info if provided
    if (trackingNumber) {
      order.shipping.trackingNumber = trackingNumber;
    }
    if (carrier) {
      order.shipping.carrier = carrier;
    }

    // Set deliveredAt if status is delivered
    if (status === 'delivered') {
      order.shipping.deliveredAt = new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Cancel order
    await order.cancelOrder(reason);

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        if (item.variant) {
          const variant = product.variants.find(v => v.sku === item.variant.sku);
          if (variant) {
            variant.stock += item.quantity;
          }
        } else {
          product.stock += item.quantity;
        }
        
        product.soldCount -= item.quantity;
        await product.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
};