import mongoose from 'mongoose';
import argon2 from 'argon2';

const userSchema = new mongoose.Schema(
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
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (error: any) {
    throw error;
  }
};

const User = mongoose.model('user', userSchema);
export default User;
