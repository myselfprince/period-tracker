// app/api/auth/route.js
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(req) {
  await connectDB();
  const { action, email, password, cycleData } = await req.json();

  try {
    // --- REGISTER ---
    // ... inside try block ...

    // --- UPDATE DATA & HISTORY ---
    
    if (action === 'register') {
      const existingUser = await User.findOne({ email });
      if (existingUser) return NextResponse.json({ error: 'User already exists' }, { status: 400 });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ 
        email, 
        password: hashedPassword,
        cycleData: { lastPeriodStart: null, cycleLength: 28, periodDuration: 5 } // defaults
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
      const { email, cycleData } = await req.json();

      // 1. Find the user first
      const user = await User.findOne({ email });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      // 2. Update the "Current" settings
      user.cycleData = cycleData;

      // 3. Update History Logic
      const newDate = new Date(cycleData.lastPeriodStart);
      
      // Check if an entry with this specific Start Date already exists
      const existingEntryIndex = user.history.findIndex(entry => 
        new Date(entry.startDate).toDateString() === newDate.toDateString()
      );

      if (existingEntryIndex > -1) {
        // Update existing entry (e.g. if she changed the cycle length for that month)
        user.history[existingEntryIndex] = {
          startDate: newDate,
          cycleLength: cycleData.cycleLength,
          periodDuration: cycleData.periodDuration
        };
      } else {
        // Add new entry to history
        user.history.push({
          startDate: newDate,
          cycleLength: cycleData.cycleLength,
          periodDuration: cycleData.periodDuration
        });
      }

      // Sort history (Newest first)
      user.history.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

      await user.save();
      return NextResponse.json({ success: true, user });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}