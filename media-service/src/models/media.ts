import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    public_id: { type: String, required: true },
    original_name: {
      type: String,
      required: true,
    },
    mime_type: { type: String, required: true },
    url: {
      type: String,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

mediaSchema.index({ content: 'text' });
const Media = mongoose.model('Media', mediaSchema);
export default Media;
