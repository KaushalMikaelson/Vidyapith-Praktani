import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'vidyapith-connect-secret-key';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { profile: true }
    });

    if (!user) {
      return NextResponse.json({ error: "No account found with this email." }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch && password !== user.password_hash) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 400 });
    }

    if (user.verify_status === 'rejected') {
      return NextResponse.json({ error: "Registration declined by the administrative committee." }, { status: 403 });
    }

    if (user.verify_status === 'pending') {
      return NextResponse.json({ error: "Account verification pending character leaving certificate review." }, { status: 403 });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.profile ? `${user.email.split('@')[0]}` : "Vidyapith Alumnus"
      }
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
