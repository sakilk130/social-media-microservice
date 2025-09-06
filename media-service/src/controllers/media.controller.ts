import { Response } from 'express';
import logger from '../utils/logger';
import { uploadMediaToCloudinary } from '../utils/cloudinary';
import Media from '../models/media';

const uploadMedia = async (req: any, res: Response) => {
  logger.info('Upload media request received');
  try {
    if (!req.file) {
      logger.warn('No file provided in the request');
      return res
        .status(400)
        .json({ success: false, message: 'No file provided' });
    }
    const { originalname, mimetype, size, buffer } = req.file;
    logger.info('File details: %o', { originalname, mimetype, size });
    logger.info('File is being uploading to Cloudinary...');
    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info('File uploaded to Cloudinary: %o', cloudinaryUploadResult);
    const mediaData = new Media({
      public_id: (cloudinaryUploadResult as any).public_id,
      original_name: originalname,
      mime_type: mimetype,
      url: (cloudinaryUploadResult as any).secure_url,
      user_id: req.user.userId,
    });
    await mediaData.save();
    logger.info('Media metadata saved to database: %o', mediaData);
    res.status(201).json({
      success: true,
      data: {
        id: mediaData._id,
        url: mediaData.url,
      },
    });
  } catch (error) {
    logger.error('Error uploading media: %o', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getAllMedia = async (req: any, res: Response) => {
  logger.info('Get all media request received');
  try {
    const media = await Media.find({
      user_id: (req as any).user.userId,
    });
    if (media.length === 0) {
      logger.info('No media found for user: %s', (req as any).user.userId);
      return res
        .status(404)
        .json({ success: false, message: 'No media found' });
    }
    logger.info('Media retrieved: %d items', media.length);
    res.status(200).json({
      success: true,
      data: media,
      message: 'Media fetched successfully',
    });
  } catch (error) {
    logger.error('Error fetching media: %o', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export { uploadMedia, getAllMedia };
