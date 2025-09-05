import { Request, Response } from 'express';
import logger from '../utils/logger';
import { validateLogin, validateRegistration } from '../utils/validation';
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
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (error) {
    logger.error('Error registering user: %o', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const loginUser = async (req: Request, res: Response) => {
  logger.info('Logging in user');
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn('Validation error: %s', error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('User not found with email: %s', email);
      return res
        .status(400)
        .json({ success: false, message: 'Invalid email or password' });
    }
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn('Invalid password');
      return res.status(400).json({
        success: false,
        message: 'Invalid password',
      });
    }
    const { accessToken, refreshToken } = await generateTokens(user);
    logger.info('User logged in successfully: %s', user._id);
    res.status(200).json({
      success: true,
      message: 'User logged in successfully!',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (error) {
    logger.error('Error logging in user: %o', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export { registerUser, loginUser };
