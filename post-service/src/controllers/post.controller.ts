import { Request, Response } from 'express';
import logger from '../utils/logger';
import { validateCreatePost } from '../utils/validation';
import Post from '../models/post';

const invalidatePostsCache = async (req: any, input: any) => {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);

  const keys = await req.redisClient.keys('posts:*');
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
};

const createPost = async (req: any, res: Response) => {
  logger.info('Creating a new post');
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn('Validation error: %s', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content, media_ids } = req.body;

    const newPost = new Post({
      user: req.user.userId,
      content,
      media_ids,
    });
    await newPost.save();
    logger.info('Post created with ID: %s', newPost._id);
    await invalidatePostsCache(req, newPost?._id?.toString());
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: newPost,
    });
  } catch (error) {
    logger.error('Error creating post: %o', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getPosts = async (req: any, res: Response) => {
  logger.info('Fetching posts');
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      logger.info('Cache hit for key: %s', cacheKey);
      return res.status(200).json({
        success: true,
        message: 'Posts fetched from cache',
        data: JSON.parse(cachedPosts),
      });
    }

    const posts = await Post.find()
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const total = await Post.countDocuments().exec();

    const results = {
      posts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(results)); // Cache for 5 minutes
    logger.info('Cache miss for key: %s. Fetched from DB.', cacheKey);
    res.status(200).json({
      success: true,
      message: 'Posts fetched successfully',
      data: results,
    });
  } catch (error) {
    logger.error('Error fetching posts: %o', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getPost = async (req: Request, res: Response) => {
  logger.info('Fetching a single post');
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await (req as any).redisClient.get(cacheKey);

    if (cachedPost) {
      logger.info('Cache hit for key: %s', cacheKey);
      return res.status(200).json({
        success: true,
        message: 'Post fetched from cache',
        data: JSON.parse(cachedPost),
      });
    }

    const post = await Post.findById(postId).exec();
    if (!post) {
      logger.warn('Post not found with ID: %s', postId);
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    await (req as any).redisClient.setex(cacheKey, 3600, JSON.stringify(post)); // Cache for 1 hour
    logger.info('Cache miss for key: %s. Fetched from DB.', cacheKey);
    res.status(200).json({
      success: true,
      message: 'Post fetched successfully',
      data: post,
    });
  } catch (error) {
    logger.error('Error fetching post: %o', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const deletePost = async (req: any, res: Response) => {
  logger.info('Deleting a post');
  try {
    const postId = req.params.id;
    const userId = req.user.userId;
    const cacheKey = `post:${postId}`;
    await req.redisClient.del(cacheKey);

    const post = await Post.findById(postId).exec();
    if (!post) {
      logger.warn('Post not found with ID: %s', postId);
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    if (post.user.toString() !== userId) {
      logger.warn(
        'Unauthorized delete attempt by user: %s on post: %s',
        userId,
        postId
      );
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this post',
      });
    }
    await Post.findByIdAndDelete(postId).exec();
    await invalidatePostsCache(req, postId);
    logger.info('Post deleted with ID: %s', postId);
    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting post: %o', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export { createPost, getPosts, getPost, deletePost };
