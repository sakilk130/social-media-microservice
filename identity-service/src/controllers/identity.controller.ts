import { Request, Response } from 'express';
import logger from '../utils/logger';
import { validateRegistration } from '../utils/validation';
import User from '../models/user';
import generateTokens from '../utils/generate-token';

const registerUser = async (req: Request, res: Response) => {
  logger.info('Registering user');
  try {
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn('Validation error: %s', error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    const { email, password, username } = req.body;
    let user = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (user) {
      logger.warn(
        'User already exists with email: %s or username: %s',
        email,
        username
      );
      return res
        .status(409)
        .json({ success: false, message: 'User already exists' });
    }
    user = new User({ email, password, username });
    await user.save();
    logger.info('User registered successfully: %s', user._id);

    const { accessToken, refreshToken } = await generateTokens(user);
    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (error) {
    logger.error('Error registering user: %o', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export { registerUser };
