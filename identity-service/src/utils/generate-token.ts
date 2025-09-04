import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import RefreshToken from '../models/refresh-token';

dotenv.config();

const generateTokens = async (user: any) => {
  const accessToken = jwt.sign(
    {
      user_id: user._id,
      username: user.username,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '60m' }
  );
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    token: refreshToken,
    user: user._id,
    expires_at: expiresAt,
  });

  return { accessToken, refreshToken };
};

export default generateTokens;
