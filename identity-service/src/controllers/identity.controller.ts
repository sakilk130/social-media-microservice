import { Request, Response } from 'express';
import logger from '../utils/logger';
import { validateLogin, validateRegistration } from '../utils/validation';
import User from '../models/user';
import generateTokens from '../utils/generate-token';
import RefreshToken from '../models/refresh-token';
import { ref } from 'process';

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

const refreshTokenUser = async (req: Request, res: Response) => {
  logger.info('Refreshing token');
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      logger.warn('Refresh token not provided');
      return res
        .status(400)
        .json({ success: false, message: 'Refresh token is required' });
    }

    const foundToken = await RefreshToken.findOne({ token: refresh_token });

    if (!foundToken) {
      logger.warn('Invalid refresh token provided');
      return res.status(400).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    if (foundToken.expires_at < new Date()) {
      logger.warn('Invalid or expired refresh token');
      return res.status(401).json({
        success: false,
        message: `Invalid or expired refresh token`,
      });
    }

    const user = await User.findById(foundToken.user);
    if (!user) {
      logger.warn('User not found for the provided refresh token');
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await RefreshToken.deleteOne({ _id: foundToken._id });

    const { accessToken, refreshToken } = await generateTokens(user);
    logger.info('Token refreshed successfully for user: %s', user._id);
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully!',
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (error) {
    logger.error('Error refreshing token: %o', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export { registerUser, loginUser, refreshTokenUser };
