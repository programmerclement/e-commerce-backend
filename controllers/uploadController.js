import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// @desc    Upload single image
// @route   POST /api/v1/upload/single
// @access  Private
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get uploaded file info from Cloudinary
    const result = {
      public_id: req.file.filename,
      url: req.file.path,
      format: req.file.format,
      bytes: req.file.size,
      folder: req.file.folder
    };

    res.status(200).json({
      success: true,
      data: result,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
};

// @desc    Upload multiple images
// @route   POST /api/v1/upload/multiple
// @access  Private
export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      public_id: file.filename,
      url: file.path,
      format: file.format,
      bytes: file.size,
      folder: file.folder
    }));

    res.status(200).json({
      success: true,
      count: uploadedFiles.length,
      data: uploadedFiles,
      message: 'Images uploaded successfully'
    });
  } catch (error) {
    console.error('Upload multiple images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images'
    });
  }
};

// @desc    Delete image
// @route   DELETE /api/v1/upload/:publicId
// @access  Private/Admin
export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    await deleteFromCloudinary(publicId);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image'
    });
  }
};