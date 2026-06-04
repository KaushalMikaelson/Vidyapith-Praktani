import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/config/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, full_name, mobile, batch_year, house, profession, company, city, certificate_name } = body;

    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingEmail) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    const existingPhone = await prisma.user.findFirst({
      where: { phone: mobile }
    });

    if (existingPhone) {
      return NextResponse.json({ error: "An account with this mobile number already exists." }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user and profile in a transaction
    const newUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        phone: mobile,
        password_hash,
        role: 'alumni',
        verify_status: 'pending',
        profile: {
          create: {
            batch_year: parseInt(batch_year),
            house,
            bio: "Joined the Vidyapith Connect network. Proud alumnus of RKMV Deoghar.",
            profession_category: profession || "Not specified",
            company: company || "Not specified",
            city: city || "Not specified",
            country: "India",
            linkedin_url: "",
            certificate_url: certificate_name || "Leaving_Certificate_Scan.pdf"
          }
        }
      }
    });

    // Notify admins of new registration
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          user_id: admin.id,
          title: "New Registration Request",
          body: `${full_name} (Batch of ${batch_year}) requested verification.`,
          type: "alert"
        }
      });
    }

    return NextResponse.json({ success: true, message: "Registration submitted for verification review." }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
