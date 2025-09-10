import Media from '../models/media';
import { deleteMediaFromCloudinary } from '../utils/cloudinary';
import logger from '../utils/logger';

const handlePostDeleted = async (data: any) => {
  try {
    const { post_id, user_id, media_ids } = data;
    const mediaToDelete = await Media.find({
      _id: { $in: media_ids },
      user: user_id,
    }).exec();
    if (mediaToDelete.length === 0) {
      logger.warn('No media found for deletion for post: %s', post_id);
      return;
    }
    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.public_id);
      await Media.findByIdAndDelete(media._id).exec();
      logger.info('Deleted media with ID: %s for post: %s', media._id, post_id);
    }
    logger.info('Completed media deletion for post: %s', post_id);
  } catch (error) {
    logger.error('Error handling post.deleted event: %o', error);
  }
};

export { handlePostDeleted };
