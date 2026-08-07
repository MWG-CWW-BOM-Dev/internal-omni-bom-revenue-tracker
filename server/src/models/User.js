import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'user'],
    default: 'user'
  },
  permissions: {
    type: [String],
    default: []
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
