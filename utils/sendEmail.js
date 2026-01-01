import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

export const sendWelcomeEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Welcome to ${process.env.APP_NAME}!</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <p>Hi ${user.name},</p>
        <p>Thank you for registering with ${process.env.APP_NAME}. We're excited to have you on board!</p>
        <p>To complete your registration, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>Best regards,<br>The ${process.env.APP_NAME} Team</p>
      </div>
      <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
        <p>This email was sent to ${user.email}</p>
      </div>
    </div>
  `;

  return await sendEmail({
    email: user.email,
    subject: `Welcome to ${process.env.APP_NAME} - Verify Your Email`,
    html
  });
};

export const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Password Reset Request</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <p>Hi ${user.name},</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #f44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>The ${process.env.APP_NAME} Team</p>
      </div>
      <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
        <p>This email was sent to ${user.email}</p>
      </div>
    </div>
  `;

  return await sendEmail({
    email: user.email,
    subject: `Password Reset Request - ${process.env.APP_NAME}`,
    html
  });
};

export const sendOrderConfirmationEmail = async (order, user) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">
        <img src="${item.image.url}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover;">
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${item.price.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${item.total.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Order Confirmation</h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <p>Hi ${user.name},</p>
        <p>Thank you for your order! Your order has been confirmed and is being processed.</p>
        
        <h3>Order Details</h3>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        
        <h3>Items Ordered</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left;">Image</th>
              <th style="padding: 10px; text-align: left;">Product</th>
              <th style="padding: 10px; text-align: left;">Quantity</th>
              <th style="padding: 10px; text-align: left;">Price</th>
              <th style="padding: 10px; text-align: left;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <h3>Order Summary</h3>
        <p><strong>Subtotal:</strong> $${order.itemsPrice.toFixed(2)}</p>
        <p><strong>Shipping:</strong> $${order.shippingPrice.toFixed(2)}</p>
        <p><strong>Tax:</strong> $${order.taxPrice.toFixed(2)}</p>
        <p><strong>Total:</strong> $${order.totalPrice.toFixed(2)}</p>
        
        <h3>Shipping Address</h3>
        <p>${order.shippingAddress.street}<br>
        ${order.shippingAddress.city}, ${order.shippingAddress.state}<br>
        ${order.shippingAddress.country} ${order.shippingAddress.postalCode}<br>
        Phone: ${order.shippingAddress.phone}</p>
        
        <p>You can track your order by logging into your account.</p>
        <p>Best regards,<br>The ${process.env.APP_NAME} Team</p>
      </div>
      <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
        <p>© ${new Date().getFullYear()} ${process.env.APP_NAME}. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    email: user.email,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html
  });
};