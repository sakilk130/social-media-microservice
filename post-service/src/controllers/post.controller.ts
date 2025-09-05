import { Request, Response } from 'express';
import logger from '../utils/logger';
import { validateCreatePost } from '../utils/validation';
import Post from '../models/post';

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

const getPosts = async (req: Request, res: Response) => {
  logger.info('Fetching posts');
  try {
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
  } catch (error) {
    logger.error('Error fetching post: %o', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const deletePost = async (req: Request, res: Response) => {
  logger.info('Deleting a post');
  try {
  } catch (error) {
    logger.error('Error deleting post: %o', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export { createPost, getPosts, getPost, deletePost };
