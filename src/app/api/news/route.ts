import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/config/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Access denied. No active token provided." }, { status: 401 });
    }

    const list = await prisma.news.findMany({
      orderBy: { published_at: 'desc' }
    });
    return NextResponse.json(list, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = getAuthenticatedUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json({ error: "Access denied. Administrative credentials required." }, { status: 403 });
    }

    const data = await req.json();
    const { title, body, category, mediaUrl } = data;
    const authorName = authUser.email.split('@')[0] || "Alumni Cell Secretary";

    const newPost = await prisma.news.create({
      data: {
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        body,
        category,
        media_url: mediaUrl || null,
        author_name: authorName
      }
    });

    return NextResponse.json({ success: true, news: newPost }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
