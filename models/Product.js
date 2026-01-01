import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  color: String,
  size: String,
  material: String,
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  comparePrice: {
    type: Number,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  images: [{
    public_id: String,
    url: String
  }],
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  brand: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  comparePrice: {
    type: Number,
    min: 0
  },
  costPrice: {
    type: Number,
    min: 0
  },
  images: [{
    public_id: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    altText: String
  }],
  variants: [variantSchema],
  specifications: [{
    key: String,
    value: String
  }],
  features: [String],
  tags: [String],
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  barcode: String,
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['g', 'kg', 'lb', 'oz'],
      default: 'g'
    }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'm', 'in', 'ft'],
      default: 'cm'
    }
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isOnSale: {
    type: Boolean,
    default: false
  },
  salePrice: Number,
  saleStart: Date,
  saleEnd: Date,
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  viewCount: {
    type: Number,
    default: 0
  },
  soldCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isOnSale: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

// Virtuals
productSchema.virtual('discountPercentage').get(function() {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  }
  return 0;
});

productSchema.virtual('currentPrice').get(function() {
  if (this.isOnSale && this.salePrice) {
    return this.salePrice;
  }
  return this.price;
});

productSchema.virtual('inStock').get(function() {
  return this.stock > 0;
});

productSchema.virtual('isLowStock').get(function() {
  return this.stock > 0 && this.stock <= this.lowStockThreshold;
});

// Pre-save middleware to generate slug
productSchema.pre('save', function(next) {
  if (!this.isModified('name')) return next();
  
  this.slug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
    
  next();
});

// Method to update stock
productSchema.methods.updateStock = async function(quantity) {
  this.stock += quantity;
  await this.save({ validateBeforeSave: false });
};

// Method to check if product is on sale
productSchema.methods.isOnSaleNow = function() {
  if (!this.isOnSale) return false;
  if (!this.saleStart && !this.saleEnd) return true;
  
  const now = new Date();
  if (this.saleStart && now < this.saleStart) return false;
  if (this.saleEnd && now > this.saleEnd) return false;
  
  return true;
};

const Product = mongoose.model('Product', productSchema);

export default Product;