import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Neon database with Vidyapith Connect demo data...");

  // Clear existing entries to prevent duplication
  await prisma.comment.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.mentorship.deleteMany({});
  await prisma.donation.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.rSVP.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.news.deleteMany({});
  await prisma.heritage.deleteMany({});
  await prisma.alumniProfile.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Database cleared. Seeding news and heritage only (0 users and 0 posts)...");

  // Seed news & heritage
  await prisma.news.createMany({
    data: [
      {
        title: "Vidyapith Centenary Celebrations Prep in Full Swing",
        slug: "vidyapith-centenary-celebrations-prep",
        body: "Ramakrishna Mission Vidyapith, Deoghar, is marching towards its glorious 100th anniversary! Elaborate spiritual programmes, educational symposia, and a worldwide alumni convocation are scheduled for late December. The monastic community invites all ex-students to join and volunteer.",
        category: "Institutional News",
        media_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&fit=crop&q=80",
        author_name: "Swami Brahmananda-ji",
        is_featured: true
      },
      {
        title: "Alumni Spotlight: Rishi Kumar Sen, IFS",
        slug: "alumni-spotlight-rishi-kumar-sen",
        body: "Our distinguished brother Rishi Kumar Sen (Batch of 2005, Shardananda House) has been selected as the First Secretary to the Embassy of India. In a brief chat, Rishi mentions how RKMV's early morning prayers and residential rules paved his path to the Civil Services.",
        category: "Alumni Spotlight",
        media_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&fit=crop&q=80",
        author_name: "Alumni Cell Secretary",
        is_featured: false
      }
    ]
  });

  await prisma.heritage.createMany({
    data: [
      {
        title: "Vidyapith Shrine Hall under construction",
        description: "A rare historical photograph capturing the layout and dome placement of the Universal Temple of Sri Ramakrishna in Deoghar.",
        decade: "1940s",
        media_url: "https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=500&fit=crop&q=80",
        category: "Temple",
        year: 1946
      },
      {
        title: "Founder Monks Group Portrait",
        description: "Monastics and early spiritual guides who established the residential ashram school in Deoghar, bringing values-based education to rural Jharkhand.",
        decade: "1920s",
        media_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&fit=crop&q=80",
        category: "Campus",
        year: 1925
      },
      {
        title: "Vintage Sports Day March Past",
        description: "Students marching in strict ranks in front of the Vivekananda Hostel, carrying their house colors under the guidance of physical education instructors.",
        decade: "1960s",
        media_url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&fit=crop&q=80",
        category: "Sports",
        year: 1968
      },
      {
        title: "Vidyapith Library Inauguration",
        description: "Aurobindo Ghosh (as class leader) receiving the first batch of digitised encyclopedias from the headmaster in the main school library corridor.",
        decade: "1980s",
        media_url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=500&fit=crop&q=80",
        category: "Campus",
        year: 1989
      }
    ]
  });

  console.log("Database seeded successfully with empty users/posts, and initial news/heritage data.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
