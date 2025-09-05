import express from 'express';
import { createPost } from '../controllers/post.controller';
import authenticateRequest from '../middlewares/auth';

const router = express.Router();

router.use(authenticateRequest);

router.post('/', createPost);

export default router;
