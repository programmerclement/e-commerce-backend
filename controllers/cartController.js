import Product from '../models/Product.js';
import User from '../models/User.js';
import Cart from '../models/Cart.js';

// @desc    Get user's cart
// @route   GET /api/v1/cart
// @access  Private
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'name slug price images stock sku variants');

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    // Calculate totals
    let subtotal = 0;
    let totalItems = 0;
    
    for (const item of cart.items) {
      const product = item.product;
      
      if (!product || !product.isActive) {
        continue;
      }

      // Check stock availability
      let availableStock = product.stock;
      let variantPrice = product.price;

      // If variant is selected
      if (item.variant && product.variants && product.variants.length > 0) {
        const variant = product.variants.find(v => v.sku === item.variant.sku);
        if (variant) {
          availableStock = variant.stock;
          variantPrice = variant.price;
        }
      }

      // Use current price (sale or regular)
      const currentPrice = product.isOnSale && product.salePrice 
        ? product.salePrice 
        : variantPrice;

      // Validate quantity
      const quantity = Math.min(item.quantity, availableStock);
      const itemTotal = currentPrice * quantity;

      // Update item details
      item.price = currentPrice;
      item.total = itemTotal;
      item.inStock = quantity > 0;

      subtotal += itemTotal;
      totalItems += quantity;
    }

    // Save updated cart
    await cart.save();

    // Calculate totals
    const shipping = subtotal > 50 ? 0 : 10; // Free shipping over $50
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + shipping + tax;

    res.status(200).json({
      success: true,
      data: {
        items: cart.items,
        summary: {
          subtotal,
          shipping,
          tax,
          total,
          totalItems
        }
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/v1/cart/add
// @access  Private
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variant } = req.body;

    // Get product
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check stock
    let availableStock = product.stock;
    let variantPrice = product.price;
    let variantSku = product.sku;

    if (variant && product.variants && product.variants.length > 0) {
      const selectedVariant = product.variants.find(v => v.sku === variant.sku);
      if (!selectedVariant) {
        return res.status(400).json({
          success: false,
          message: 'Selected variant not found'
        });
      }
      
      availableStock = selectedVariant.stock;
      variantPrice = selectedVariant.price;
      variantSku = selectedVariant.sku;
    }

    if (availableStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableStock} items available in stock`
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [] });
    }

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(item => {
      if (item.product.toString() !== productId) return false;
      
      if (variant && item.variant) {
        return item.variant.sku === variant.sku;
      }
      
      return !variant && !item.variant;
    });

    if (existingItemIndex > -1) {
      // Update existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      if (newQuantity > availableStock) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more than ${availableStock} items`
        });
      }
      
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        variant: variant ? { ...variant, sku: variantSku } : null,
        price: variantPrice,
        total: variantPrice * quantity
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/update/:itemId
// @access  Private
export const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const cartItem = cart.items.id(itemId);
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    // Get product for stock check
    const product = await Product.findById(cartItem.product);
    if (!product || !product.isActive) {
      // Remove item if product no longer exists
      cartItem.remove();
      await cart.save();
      
      return res.status(400).json({
        success: false,
        message: 'Product is no longer available'
      });
    }

    // Check stock
    let availableStock = product.stock;
    
    if (cartItem.variant && product.variants && product.variants.length > 0) {
      const variant = product.variants.find(
        v => v.sku === cartItem.variant.sku
      );
      if (variant) {
        availableStock = variant.stock;
      }
    }

    if (quantity > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableStock} items available in stock`
      });
    }

    if (quantity < 1) {
      // Remove item if quantity is 0
      cartItem.remove();
    } else {
      cartItem.quantity = quantity;
      cartItem.total = cartItem.price * quantity;
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart updated',
      data: cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart'
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/remove/:itemId
// @access  Private
export const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const cartItem = cart.items.id(itemId);
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    cartItem.remove();
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart'
    });
  }
};

// @desc    Clear cart
// @route   DELETE /api/v1/cart/clear
// @access  Private
export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: cart
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/v1/cart/apply-coupon
// @access  Private
export const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product');
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Calculate cart total
    let subtotal = 0;
    for (const item of cart.items) {
      if (item.product && item.product.isActive) {
        subtotal += item.total;
      }
    }

    // Here you would validate the coupon code
    // For now, we'll simulate a 10% discount
    const discount = subtotal * 0.1;
    cart.coupon = {
      code: couponCode,
      discount
    };

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        discount,
        newTotal: subtotal - discount
      }
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply coupon'
    });
  }
};

// @desc    Remove coupon from cart
// @route   DELETE /api/v1/cart/remove-coupon
// @access  Private
export const removeCoupon = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.coupon = undefined;
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Coupon removed successfully',
      data: cart
    });
  } catch (error) {
    console.error('Remove coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove coupon'
    });
  }
};