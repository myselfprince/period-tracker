// src/app/api/auth/route.js
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(req) {
  await connectDB();
  
  try {
    const body = await req.json();
    const { action, email, password, cycleData } = body;

    // --- REGISTER ---
    if (action === 'register') {
      const existingUser = await User.findOne({ email });
      if (existingUser) return NextResponse.json({ error: 'User already exists' }, { status: 400 });

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // FIX 1: We save 'username' as the 'email'. 
      // This satisfies the MongoDB unique index requirement without extra work.
      const user = await User.create({ 
        email, 
        username: email, 
        password: hashedPassword,
        cycleData: { lastPeriodStart: null, cycleLength: 28, periodDuration: 5 },
        history: []
      });
      return NextResponse.json({ success: true, user });
    }

    // --- LOGIN ---
    if (action === 'login') {
      const user = await User.findOne({ email });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

      return NextResponse.json({ success: true, user });
    }

    // --- UPDATE DATA ---
    if (action === 'update') {
      // 1. Find User
      const user = await User.findOne({ email });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      // 2. Update Current Cycle Data
      user.cycleData = cycleData;

      // FIX 2: Safety Check - Ensure history array exists
      if (!user.history) {
        user.history = [];
      }

      // 3. Logic to add/update History
      const newDate = new Date(cycleData.lastPeriodStart);
      
      // Check if this date already exists in history
      const existingEntryIndex = user.history.findIndex(entry => 
        new Date(entry.startDate).toDateString() === newDate.toDateString()
      );

      if (existingEntryIndex > -1) {
        // Update existing entry
        user.history[existingEntryIndex] = {
          startDate: newDate,
          cycleLength: cycleData.cycleLength,
          periodDuration: cycleData.periodDuration
        };
      } else {
        // Add new entry
        user.history.push({
          startDate: newDate,
          cycleLength: cycleData.cycleLength,
          periodDuration: cycleData.periodDuration
        });
      }

      // Sort history (Newest date first)
      user.history.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

      // Save to DB
      await user.save();
      
      return NextResponse.json({ success: true, user });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error("API Error:", error); // This helps see the real error in Vercel logs
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}