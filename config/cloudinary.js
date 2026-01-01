import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';

config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Upload utility function
export const uploadToCloudinary = async (file, folder = 'ecommerce') => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto:good' },
        { format: 'webp' }
      ]
    });
    return {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

// Delete from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete from Cloudinary: ${error.message}`);
  }
};

export default cloudinary;