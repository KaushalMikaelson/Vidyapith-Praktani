import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/config/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: "Access denied. Administrative credentials required." }, { status: 403 });
    }

    const body = await req.json();
    const { id, status } = body; // status: "approved" | "rejected"
    
    await prisma.user.update({
      where: { id },
      data: { verify_status: status }
    });

    await prisma.notification.create({
      data: {
        user_id: id,
        title: status === 'approved' ? "Verification Approved!" : "Registration Declined",
        body: status === 'approved' ? "Welcome! The administrative committee has approved your alumni status." : "The committee declined your uploaded certificate. Contact support.",
        type: status === 'approved' ? "success" : "alert"
      }
    });

    return NextResponse.json({ success: true, message: `Applicant successfully ${status}` }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
