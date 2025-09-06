import express from 'express';
import {
  createPost,
  deletePost,
  getPost,
  getPosts,
} from '../controllers/post.controller';
import authenticateRequest from '../middlewares/auth';

const router = express.Router();

router.use(authenticateRequest);

router.post('/', createPost);
router.get('/', getPosts);
router.get('/:id', getPost);
router.delete('/:id', deletePost);

export default router;
