import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/config/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Access denied. No active token provided." }, { status: 401 });
    }

    const body = await req.json();
    const { amount, cause, showOnLeaderboard } = body;
    const userId = authUser.id || 'usr-guest';

    const newDonation = await prisma.donation.create({
      data: {
        donor_id: userId,
        amount_paise: parseInt(amount) * 100,
        cause,
        razorpay_id: 'pay_' + Math.random().toString(36).substr(2, 12).toUpperCase(),
        payment_status: 'approved',
        receipt_url: `receipt_Exempt80G_${Math.floor(Math.random() * 10000)}.pdf`,
        show_on_leaderboard: showOnLeaderboard
      }
    });

    await prisma.notification.create({
      data: {
        user_id: userId,
        title: "Donation Successful",
        body: `Donated ₹${amount} to ${cause}. 80G tax receipt ready.`,
        type: "success"
      }
    });

    return NextResponse.json({ success: true, donation: newDonation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
