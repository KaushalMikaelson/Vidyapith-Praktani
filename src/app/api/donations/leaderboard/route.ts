import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/config/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Access denied. No active token provided." }, { status: 401 });
    }

    const list = await prisma.donation.findMany({
      where: { payment_status: 'approved', show_on_leaderboard: true },
      orderBy: { amount_paise: 'desc' }
    });
    return NextResponse.json(list, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
