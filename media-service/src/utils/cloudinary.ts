import cloudinary from 'cloudinary';
import { Express } from 'express';
import logger from './logger';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadMediaToCloudinary = (file: any) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      { resource_type: 'auto' },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error: %o', error);
          return reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.end(file.buffer);
  });
};

const deleteMediaFromCloudinary = (publicId: string) => {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.destroy(publicId, (error, result) => {
      if (error) {
        logger.error('Cloudinary delete error: %o', error);
        return reject(error);
      }
      resolve(result);
    });
  });
};

export { uploadMediaToCloudinary, deleteMediaFromCloudinary };
