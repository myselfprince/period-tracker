import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Current settings for quick prediction
  cycleData: {
    lastPeriodStart: { type: Date },
    cycleLength: { type: Number, default: 28 },
    periodDuration: { type: Number, default: 5 },
  },

  // NEW: History Array
  history: [{
    startDate: { type: Date },
    cycleLength: { type: Number },
    periodDuration: { type: Number }
  }]
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);