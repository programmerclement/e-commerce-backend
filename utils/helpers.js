import crypto from 'crypto';

// Generate random string
export const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Format currency
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Format date
export const formatDate = (date, format = 'en-US') => {
  return new Intl.DateTimeFormat(format, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
};

// Truncate string
export const truncateString = (str, length = 100) => {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

// Generate slug
export const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Validate email
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validate phone
export const isValidPhone = (phone) => {
  const regex = /^[0-9]{10,15}$/;
  return regex.test(phone);
};

// Calculate discount percentage
export const calculateDiscountPercentage = (originalPrice, salePrice) => {
  if (!originalPrice || !salePrice || salePrice >= originalPrice) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
};

// Generate order number
export const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${year}${month}${day}-${random}`;
};

// Calculate tax
export const calculateTax = (amount, taxRate = 0.08) => {
  return parseFloat((amount * taxRate).toFixed(2));
};

// Generate SKU
export const generateSKU = (productName, variant = '') => {
  const prefix = productName.substring(0, 3).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  const variantCode = variant ? `-${variant.substring(0, 3).toUpperCase()}` : '';
  return `${prefix}${random}${variantCode}`;
};