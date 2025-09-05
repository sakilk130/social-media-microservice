import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

import logger from '../utils/logger';

import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const validateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('No token provided in the request');
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    });
  }
  jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
    if (err) {
      logger.warn('Invalid token');
      return res.status(403).json({
        success: false,
        message: 'Invalid token',
      });
    }
    req.user = user;
    next();
  });
};

export default validateToken;
