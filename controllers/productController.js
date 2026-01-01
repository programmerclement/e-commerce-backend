import Product from '../models/Product.js';
import Category from '../models/Category.js';
import APIFeatures from '../utils/apiFeatures.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    // Build query
    const features = new APIFeatures(
      Product.find({ isActive: true })
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug'),
      req.query
    )
      .filter()
      .search(['name', 'description', 'tags', 'brand'])
      .sort()
      .paginate()
      .limitFields();

    // Execute query
    const products = await features.query;

    // Get total count for pagination
    const totalFeatures = new APIFeatures(
      Product.find({ isActive: true }),
      req.query
    )
      .filter()
      .search(['name', 'description', 'tags', 'brand']);

    const total = await totalFeatures.query.countDocuments();

    // Get filters data
    const categories = await Category.find({ isActive: true })
      .select('name slug')
      .lean();

    const brands = await Product.distinct('brand', { isActive: true });
    
    const priceRange = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page: features.page || 1,
        limit: features.limit || 12,
        pages: Math.ceil(total / (features.limit || 12))
      },
      filters: {
        categories,
        brands: brands.filter(Boolean),
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 1000 }
      },
      data: products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
export const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ 
      $or: [
        { _id: req.params.id },
        { slug: req.params.id }
      ],
      isActive: true 
    })
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count
    product.viewCount += 1;
    await product.save({ validateBeforeSave: false });

    // Get related products
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    })
      .limit(4)
      .select('name slug price images ratings average stock')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        product,
        relatedProducts
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
};

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private/Admin
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      brand,
      stock,
      sku,
      variants,
      specifications,
      features,
      tags
    } = req.body;

    // Check if SKU already exists
    const skuExists = await Product.findOne({ sku: sku.toUpperCase() });
    if (skuExists) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    // Check category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Handle image uploads
    let images = [];
    if (req.body.images && Array.isArray(req.body.images)) {
      for (const image of req.body.images) {
        if (image.base64) {
          const result = await uploadToCloudinary(
            image.base64,
            'ecommerce/products'
          );
          
          images.push({
            public_id: result.public_id,
            url: result.url,
            isDefault: images.length === 0
          });
        }
      }
    }

    // Calculate total stock
    let totalStock = stock || 0;
    if (variants && Array.isArray(variants)) {
      totalStock = variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
    }

    // Create product
    const product = await Product.create({
      name,
      description,
      price,
      category,
      brand,
      stock: totalStock,
      sku: sku.toUpperCase(),
      images,
      variants: variants || [],
      specifications: specifications || [],
      features: features || [],
      tags: tags || [],
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product'
    });
  }
};

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Handle image updates
    if (req.body.images && Array.isArray(req.body.images)) {
      const newImages = [];
      const imagesToDelete = [];

      // Separate new and existing images
      for (const image of req.body.images) {
        if (image.base64 && !image.public_id) {
          // New image - upload to Cloudinary
          const result = await uploadToCloudinary(
            image.base64,
            'ecommerce/products'
          );
          
          newImages.push({
            public_id: result.public_id,
            url: result.url,
            isDefault: newImages.length === 0 && product.images.length === 0
          });
        } else if (image.public_id) {
          // Existing image - keep it
          newImages.push(image);
        }
      }

      // Find images to delete
      const existingImageIds = product.images.map(img => img.public_id);
      const newImageIds = newImages.map(img => img.public_id);
      
      imagesToDelete.push(...existingImageIds.filter(id => !newImageIds.includes(id)));

      // Delete old images from Cloudinary
      for (const publicId of imagesToDelete) {
        await deleteFromCloudinary(publicId);
      }

      req.body.images = newImages;
    }

    // Update product
    product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user.id },
      { new: true, runValidators: true }
    );

    // Recalculate total stock if variants exist
    if (product.variants && product.variants.length > 0) {
      const totalStock = product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
      product.stock = totalStock;
      await product.save({ validateBeforeSave: false });
    }

    res.status(200).json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete images from Cloudinary
    for (const image of product.images) {
      await deleteFromCloudinary(image.public_id);
    }

    // Delete variant images
    if (product.variants) {
      for (const variant of product.variants) {
        if (variant.images) {
          for (const image of variant.images) {
            await deleteFromCloudinary(image.public_id);
          }
        }
      }
    }

    // Soft delete - mark as inactive
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
};

// @desc    Get featured products
// @route   GET /api/v1/products/featured
// @access  Public
export const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isFeatured: true,
      isActive: true
    })
      .limit(8)
      .populate('category', 'name slug')
      .select('name slug price images stock isOnSale salePrice')
      .lean();

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured products'
    });
  }
};

// @desc    Get products on sale
// @route   GET /api/v1/products/on-sale
// @access  Public
export const getProductsOnSale = async (req, res) => {
  try {
    const now = new Date();
    
    const products = await Product.find({
      isOnSale: true,
      isActive: true,
      $or: [
        { saleStart: { $lte: now } },
        { saleStart: null }
      ],
      $or: [
        { saleEnd: { $gte: now } },
        { saleEnd: null }
      ]
    })
      .limit(8)
      .populate('category', 'name slug')
      .select('name slug price salePrice images stock discountPercentage')
      .lean();

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get sale products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sale products'
    });
  }
};

// @desc    Get new arrivals
// @route   GET /api/v1/products/new-arrivals
// @access  Public
export const getNewArrivals = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products = await Product.find({
      isActive: true,
      createdAt: { $gte: thirtyDaysAgo }
    })
      .sort('-createdAt')
      .limit(8)
      .populate('category', 'name slug')
      .select('name slug price images stock')
      .lean();

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get new arrivals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch new arrivals'
    });
  }
};

// @desc    Get best sellers
// @route   GET /api/v1/products/best-sellers
// @access  Public
export const getBestSellers = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      soldCount: { $gt: 0 }
    })
      .sort('-soldCount')
      .limit(8)
      .populate('category', 'name slug')
      .select('name slug price images stock soldCount')
      .lean();

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get best sellers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch best sellers'
    });
  }
};

// @desc    Update product stock
// @route   PUT /api/v1/products/:id/stock
// @access  Private/Admin
export const updateStock = async (req, res) => {
  try {
    const { quantity, operation = 'add' } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (operation === 'add') {
      product.stock += parseInt(quantity);
    } else if (operation === 'subtract') {
      product.stock -= parseInt(quantity);
      if (product.stock < 0) product.stock = 0;
    } else if (operation === 'set') {
      product.stock = parseInt(quantity);
    }

    await product.save();

    res.status(200).json({
      success: true,
      data: product,
      message: 'Stock updated successfully'
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock'
    });
  }
};

// @desc    Get products by category
// @route   GET /api/v1/products/category/:categoryId
// @access  Public
export const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const features = new APIFeatures(
      Product.find({
        category: categoryId,
        isActive: true
      }),
      req.query
    )
      .filter()
      .search()
      .sort()
      .paginate();

    const products = await features.query
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug');

    const total = await Product.countDocuments({
      category: categoryId,
      isActive: true
    });

    const category = await Category.findById(categoryId);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      category,
      pagination: {
        page: features.page || 1,
        limit: features.limit || 12,
        pages: Math.ceil(total / (features.limit || 12))
      },
      data: products
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products by category'
    });
  }
};