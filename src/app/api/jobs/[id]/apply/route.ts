import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/config/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Access denied. No active token provided." }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const userId = authUser.id;

    const job = await prisma.job.findUnique({ where: { id: id as string } });
    if (!job) {
      return NextResponse.json({ error: "Job opening not found." }, { status: 404 });
    }

    const applications = job.applications || [];
    if (!applications.includes(userId)) {
      applications.push(userId);
      await prisma.job.update({
        where: { id: id as string },
        data: { applications }
      });

      // Alert sponsor
      await prisma.notification.create({
        data: {
          user_id: job.posted_by,
          title: "New Job Application",
          body: `An alumnus applied for your ${job.title} opening at ${job.company}.`,
          type: "success"
        }
      });
    }

    return NextResponse.json({ success: true, message: "Application filed successfully." }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
