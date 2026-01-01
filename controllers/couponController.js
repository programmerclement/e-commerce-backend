import Coupon from '../models/Coupon.js';

// @desc    Get all coupons
// @route   GET /api/v1/coupons
// @access  Private/Admin
export const getAllCoupons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const coupons = await Coupon.find()
      .populate('applicableCategories', 'name')
      .populate('excludedCategories', 'name')
      .populate('applicableProducts', 'name')
      .populate('excludedProducts', 'name')
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    const total = await Coupon.countDocuments();

    res.status(200).json({
      success: true,
      count: coupons.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: coupons
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons'
    });
  }
};

// @desc    Get active coupons
// @route   GET /api/v1/coupons/active
// @access  Public
export const getActiveCoupons = async (req, res) => {
  try {
    const now = new Date();
    
    const coupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { usageLimit: null },
        { usageLimit: { $gt: 0 } }
      ]
    }).select('code description discountType discountValue minPurchase maxDiscount');

    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons
    });
  } catch (error) {
    console.error('Get active coupons error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active coupons'
    });
  }
};

// @desc    Get coupon by code
// @route   GET /api/v1/coupons/code/:code
// @access  Public
export const getCouponByCode = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({
      code: req.params.code.toUpperCase()
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check if coupon is valid
    if (!coupon.isActiveNow) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is not valid'
      });
    }

    res.status(200).json({
      success: true,
      data: coupon
    });
  } catch (error) {
    console.error('Get coupon by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon'
    });
  }
};

// @desc    Create coupon
// @route   POST /api/v1/coupons
// @access  Private/Admin
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
      usageLimit
    } = req.body;

    // Check if coupon code already exists
    const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
    if (couponExists) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      usageLimit,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: coupon,
      message: 'Coupon created successfully'
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create coupon'
    });
  }
};

// @desc    Update coupon
// @route   PUT /api/v1/coupons/:id
// @access  Private/Admin
export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check if code is being updated and if it already exists
    if (req.body.code && req.body.code !== coupon.code) {
      const codeExists = await Coupon.findOne({ 
        code: req.body.code.toUpperCase(),
        _id: { $ne: coupon._id }
      });
      
      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists'
        });
      }
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedCoupon,
      message: 'Coupon updated successfully'
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update coupon'
    });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/v1/coupons/:id
// @access  Private/Admin
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    await coupon.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete coupon'
    });
  }
};

// @desc    Validate coupon
// @route   POST /api/v1/coupons/validate
// @access  Private
export const validateCoupon = async (req, res) => {
  try {
    const { code, cartItems, totalAmount } = req.body;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check if coupon is valid
    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is not valid'
      });
    }

    // Check minimum purchase
    if (totalAmount < coupon.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of $${coupon.minPurchase} required`
      });
    }

    // Check if user has used this coupon before (if single use)
    if (coupon.singleUse) {
      // In a real implementation, you would check user's order history
      // For now, we'll assume it's their first time using it
    }

    // Calculate discount
    const discount = coupon.calculateDiscount(totalAmount);

    res.status(200).json({
      success: true,
      data: {
        coupon: {
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minPurchase: coupon.minPurchase,
          maxDiscount: coupon.maxDiscount
        },
        discount,
        newTotal: totalAmount - discount
      },
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to validate coupon'
    });
  }
};