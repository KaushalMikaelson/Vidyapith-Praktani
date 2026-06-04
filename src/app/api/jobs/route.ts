import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/config/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Access denied. No active token provided." }, { status: 401 });
    }

    const list = await prisma.job.findMany({
      orderBy: { created_at: 'desc' }
    });
    return NextResponse.json(list, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Access denied. No active token provided." }, { status: 401 });
    }

    const body = await req.json();
    const { title, company, location, type, description, skills, referralAvailable, contactEmail } = body;

    const newJob = await prisma.job.create({
      data: {
        posted_by: authUser.id,
        title,
        company,
        location,
        type,
        description,
        skills: typeof skills === 'string' ? skills.split(',').map((s: string) => s.trim()) : skills,
        referral_available: referralAvailable,
        contact_email: (contactEmail as string) || authUser.email || '',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    return NextResponse.json({ success: true, job: newJob }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
