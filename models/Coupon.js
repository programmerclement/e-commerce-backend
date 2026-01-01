import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  description: String,
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minPurchase: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDiscount: {
    type: Number,
    default: null
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: null
  },
  usedCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  excludedCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  excludedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  userLimit: {
    type: Number,
    default: 1
  },
  singleUse: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ startDate: 1, endDate: 1 });
couponSchema.index({ isActive: 1 });

// Virtual for isExpired
couponSchema.virtual('isExpired').get(function() {
  return new Date() > this.endDate;
});

// Virtual for isStarted
couponSchema.virtual('isStarted').get(function() {
  return new Date() >= this.startDate;
});

// Virtual for isActiveNow
couponSchema.virtual('isActiveNow').get(function() {
  const now = new Date();
  return this.isActive && 
         now >= this.startDate && 
         now <= this.endDate && 
         (this.usageLimit === null || this.usedCount < this.usageLimit);
});

// Method to check if coupon is valid
couponSchema.methods.isValid = function() {
  return this.isActiveNow;
};

// Method to calculate discount amount
couponSchema.methods.calculateDiscount = function(totalAmount) {
  if (totalAmount < this.minPurchase) {
    throw new Error(`Minimum purchase of $${this.minPurchase} required`);
  }

  if (!this.isValid()) {
    throw new Error('Coupon is not valid');
  }

  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = (totalAmount * this.discountValue) / 100;
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else {
    discount = this.discountValue;
  }

  // Ensure discount doesn't exceed total amount
  return Math.min(discount, totalAmount);
};

// Method to increment usage
couponSchema.methods.incrementUsage = async function() {
  this.usedCount += 1;
  await this.save({ validateBeforeSave: false });
};

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;