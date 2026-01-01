import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    public_id: String,
    url: String
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  variant: {
    color: String,
    size: String,
    material: String,
    sku: String
  },
  sku: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const shippingSchema = new mongoose.Schema({
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  phone: String,
  method: {
    type: String,
    enum: ['standard', 'express', 'pickup'],
    default: 'standard'
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  trackingNumber: String,
  carrier: String,
  estimatedDelivery: Date,
  deliveredAt: Date
});

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['stripe', 'momo', 'itecpay', 'cod'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  transactionId: String,
  amountPaid: {
    type: Number,
    default: 0
  },
  paymentDate: Date,
  receiptUrl: String,
  stripePaymentIntentId: String,
  momoTransactionId: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  itemsPrice: {
    type: Number,
    required: true,
    min: 0
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  coupon: {
    code: String,
    discount: {
      type: Number,
      default: 0
    }
  },
  shipping: shippingSchema,
  payment: paymentSchema,
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  notes: String,
  cancelledAt: Date,
  cancelledReason: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'shipping.trackingNumber': 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `ORD-${year}${month}${day}-${random}`;
  }
  
  // Add to status history
  if (this.isModified('orderStatus')) {
    this.statusHistory.push({
      status: this.orderStatus,
      note: this.orderStatus === 'cancelled' ? this.cancelledReason : 'Status updated'
    });
  }
  
  next();
});

// Virtual for isDelivered
orderSchema.virtual('isDelivered').get(function() {
  return this.orderStatus === 'delivered';
});

// Virtual for isCancelled
orderSchema.virtual('isCancelled').get(function() {
  return this.orderStatus === 'cancelled';
});

// Virtual for isPaid
orderSchema.virtual('isPaid').get(function() {
  return this.payment.status === 'paid';
});

// Method to calculate total items
orderSchema.methods.getTotalItems = function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
};

// Method to cancel order
orderSchema.methods.cancelOrder = async function(reason) {
  this.orderStatus = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledReason = reason;
  await this.save();
};

const Order = mongoose.model('Order', orderSchema);

export default Order;