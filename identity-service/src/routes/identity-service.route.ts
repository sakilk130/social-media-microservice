import express from 'express';

import {
  registerUser,
  loginUser,
  refreshTokenUser,
  logout,
} from '../controllers/identity.controller';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh-token', refreshTokenUser);
router.post('/logout', logout);

export default router;
