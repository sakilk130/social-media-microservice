import mongoose, { Schema, Document, Model } from 'mongoose';
import argon2 from 'argon2';
interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    try {
      this.password = await argon2.hash(this.password);
    } catch (error: any) {
      return next(error);
    }
  }
  next();
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (error: any) {
    throw error;
  }
};

interface UserModel extends Model<IUser> {}

const User = mongoose.model<IUser, UserModel>('User', userSchema);
export default User;
