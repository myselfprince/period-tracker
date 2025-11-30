// src/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  
  // FIX 1: Add username field. We will fill this with the email automatically.
  username: { type: String, unique: true }, 
  
  password: { type: String, required: true },
  
  cycleData: {
    lastPeriodStart: { type: Date },
    cycleLength: { type: Number, default: 28 },
    periodDuration: { type: Number, default: 5 },
  },

  // FIX 2: Ensure default is an empty array to prevent 500 crashes
  history: {
    type: [{
      startDate: { type: Date },
      cycleLength: { type: Number },
      periodDuration: { type: Number }
    }],
    default: [] 
  }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);