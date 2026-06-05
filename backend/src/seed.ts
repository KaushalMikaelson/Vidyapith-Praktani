import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Neon database with Vidyapith Connect demo data...");

  // Clear existing entries to prevent duplication
  await prisma.notification.deleteMany({});
  await prisma.alumniProfile.deleteMany({});
  await prisma.user.deleteMany({});

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash("admin123", salt);
  const alumniHash = await bcrypt.hash("alumni123", salt);
  const studentHash = await bcrypt.hash("student123", salt);

  const usersData = [
    {
      email: "swami@rkmv.org",
      phone: "+91 9431320000",
      password_hash: adminHash,
      role: "admin",
      verify_status: "approved",
      profile: {
        full_name: "Swami Brahmananda-ji",
        profile_photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80",
        batch_year: 1982,
        house: "Monastery",
        bio: "Monastic member of Ramakrishna Order. Dedicated to the education and spiritual welfare of children at Ramakrishna Mission Vidyapith, Deoghar.",
        profession_category: "Secretary & Headmaster",
        company: "Ramakrishna Mission Vidyapith, Deoghar",
        city: "Deoghar",
        country: "India",
        linkedin_url: "",
        show_email: true,
        show_phone: true,
        certificate_url: "Leaving_Certificate_Scan.pdf"
      }
    },
    {
      email: "aurobindo@google.com",
      phone: "+91 9876543210",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Aurobindo Ghosh",
        profile_photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&q=80",
        batch_year: 1995,
        house: "Vivekananda House",
        bio: "Principal Software Architect at Google Cloud. Alumnus of RKMV Deoghar (1995 batch). Enthusiastic about mentoring young minds and contributing to Vidyapith's development.",
        profession_category: "Principal Architect",
        company: "Google Cloud",
        city: "Bengaluru",
        country: "India",
        linkedin_url: "https://linkedin.com/in/aurobindo-ghosh-rkmv",
        show_email: true,
        show_phone: false,
        certificate_url: "Leaving_Certificate_Scan.pdf"
      }
    },
    {
      email: "shubhendu.r@apollo.com",
      phone: "+91 9123456789",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Dr. Shubhendu Roy",
        profile_photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&h=150&fit=crop&q=80",
        batch_year: 1988,
        house: "Brahmananda House",
        bio: "Senior Consultant Cardiologist at Apollo Gleneagles. Proud ex-Vidyapith student. Regular volunteer at health camps organized in Jharkhand.",
        profession_category: "Consultant Cardiologist",
        company: "Apollo Hospitals",
        city: "Kolkata",
        country: "India",
        linkedin_url: "https://linkedin.com/in/dr-shubhendu-roy-cardiologist",
        show_email: true,
        show_phone: true,
        certificate_url: "Leaving_Certificate_Scan.pdf"
      }
    },
    {
      email: "rishi.sen@ifs.gov.in",
      phone: "+91 9988776655",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Rishi Kumar Sen",
        profile_photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80",
        batch_year: 2005,
        house: "Shardananda House",
        bio: "Indian Foreign Service (IFS) officer, 2012 batch. Currently serving as First Secretary at the Embassy of India. RKMV shaped my moral canvas.",
        profession_category: "IFS Officer",
        company: "Ministry of External Affairs, India",
        city: "New Delhi",
        country: "India",
        linkedin_url: "",
        show_email: false,
        show_phone: false,
        certificate_url: "Leaving_Certificate_Scan.pdf"
      }
    },
    {
      email: "tatha.m@student.org",
      phone: "+91 8877665544",
      password_hash: studentHash,
      role: "student",
      verify_status: "approved",
      profile: {
        full_name: "Tathagata Mukhopadhyay",
        profile_photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&q=80",
        batch_year: 2025,
        house: "Ramakrishnananda House",
        bio: "Passed Class X from Vidyapith in 2025. Currently pursuing Higher Secondary education with focus on STEM. Interested in AI, robotics, and sanskrit literature.",
        profession_category: "High School Student",
        company: "RKMV Deoghar",
        city: "Deoghar",
        country: "India",
        linkedin_url: "",
        show_email: true,
        show_phone: true,
        certificate_url: "Leaving_Certificate_Scan.pdf"
      }
    },
    {
      email: "debasish.lahiri@outlook.com",
      phone: "+91 9776655443",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "pending",
      profile: {
        full_name: "Debasish Lahiri",
        profile_photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80",
        batch_year: 2012,
        house: "Yogananda House",
        bio: "Senior Associate at PwC Consulting. Looking to reconnect with my batchmates and hostel brothers.",
        profession_category: "Management Consultant",
        company: "PricewaterhouseCoopers",
        city: "Pune",
        country: "India",
        linkedin_url: "https://linkedin.com/in/debasish-lahiri-pwc",
        show_email: false,
        show_phone: false,
        certificate_url: "Leaving_Certificate_Debasish.pdf"
      }
    },
    {
      email: "amitabha.b@gmail.com",
      phone: "+91 9007123456",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "pending",
      profile: {
        full_name: "Amitabha Banik",
        profile_photo: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop&q=80",
        batch_year: 2018,
        house: "Premananda House",
        bio: "PhD Scholar at IISER Kolkata doing research in Quantum Physics. Vidyapith instilled the spirit of curiosity and Swami-ji's teachings in my heart.",
        profession_category: "Research Fellow",
        company: "IISER Kolkata",
        city: "Kalyani",
        country: "India",
        linkedin_url: "",
        show_email: true,
        show_phone: false,
        certificate_url: "RKMV_Marskheet_2018.jpg"
      }
    }
  ];

  for (const item of usersData) {
    const { profile, ...userData } = item;
    const user = await prisma.user.create({
      data: {
        ...userData,
        profile: {
          create: profile
        }
      }
    });
    console.log(`Created user: ${user.email} (${user.role})`);
  }

  // Pre-seed some notifications, posts, comments, events, jobs
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
  const aurobindo = await prisma.user.findFirst({ where: { email: 'aurobindo@google.com' } });
  const shubhendu = await prisma.user.findFirst({ where: { email: 'shubhendu.r@apollo.com' } });
  const student = await prisma.user.findFirst({ where: { email: 'tatha.m@student.org' } });

  if (adminUser && aurobindo && shubhendu && student) {
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
        }
      ]
    });

    // Seed jobs
    await prisma.job.createMany({
      data: [
        {
          posted_by: aurobindo.id,
          title: "Backend Engineering Intern",
          company: "Google Cloud",
          location: "Bengaluru, India (Hybrid)",
          type: "Internship",
          description: "Looking for an energetic CS student from RKMV to join Google Cloud Developer Relations team as an intern. Hands-on development in Go, Kubernetes, and gRPC. Preference for final-year students with high algorithmic competency.",
          skills: ["Go", "Kubernetes", "gRPC", "Docker"],
          referral_available: true,
          contact_email: "aurobindo@google.com",
          expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        },
        {
          posted_by: shubhendu.id,
          title: "Junior Resident doctor (Cardiology)",
          company: "Apollo Hospitals",
          location: "Kolkata, India",
          type: "Full-time",
          description: "Assisting senior cardiologists in non-invasive coronary screenings, critical care monitoring, and clinical research. Great opportunity for recent MBBS grads planning their MD exams.",
          skills: ["Clinical Medicine", "Patient Care", "ECG Analysis"],
          referral_available: true,
          contact_email: "shubhendu.r@apollo.com",
          expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        }
      ]
    });

    // Seed events
    await prisma.event.createMany({
      data: [
        {
          title: "Durga Puja & Centennial Alumni Reunion",
          description: "The grandest festival at Ramakrishna Mission Vidyapith, Deoghar. This year marks the special silver jubilee reunion of the 1998-2000 leaving batches. Includes holy Prasad distribution, evening Aarati, batch presentations, and discussion on charitable relief works.",
          event_date: new Date("2026-10-18T08:00:00Z"),
          location: "Vidyapith Prayer Hall & Auditorium, Deoghar",
          event_type: "physical",
          online_link: "",
          max_capacity: 500,
          created_by: adminUser.id
        },
        {
          title: "Webinar: Career Paths in Modern Civil Services",
          description: "An exclusive interactive webinar led by senior ex-students who are in Indian Administrative Services (IAS), Foreign Services (IFS), and Police Services (IPS). Learn strategy, moral leadership, and governance frameworks.",
          event_date: new Date("2026-06-15T15:00:00Z"),
          location: "Zoom Video Meeting",
          event_type: "virtual",
          online_link: "https://zoom.us/j/rkmv-civil-services",
          max_capacity: 1000,
          created_by: aurobindo.id
        }
      ]
    });

    // Seed posts
    await prisma.post.createMany({
      data: [
        {
          author_id: aurobindo.id,
          group_id: "grp-all",
          content: "Delighted to join Vidyapith Connect! Truly a magnificent initiative. The values Swami Vivekananda instilled in us on those beautiful mornings in the temple hall are the guiding light of our lives. If any student or young alumnus from the tech domain wants guidance or recommendations for Google/tech jobs, please reach out to me! Joy Ramakrishna! 🙏",
          media_urls: ["https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&fit=crop&q=80"],
          post_type: "photo",
          is_pinned: true,
          likes: [shubhendu.id, student.id, adminUser.id]
        },
        {
          author_id: adminUser.id,
          group_id: "grp-all",
          content: "Blessed greetings to all beloved children of Sri Ramakrishna. The silver jubilee batch (1998 Batch) is organizing a meeting at the Vidyapith premises on the occasion of upcoming Durga Puja. Let us assemble to cherish memories and discuss how we can serve the rural schools nearby. Details of the agenda will be published under the Events tab.",
          media_urls: [],
          post_type: "text",
          is_pinned: false,
          likes: [aurobindo.id]
        }
      ]
    });

    const mainPost = await prisma.post.findFirst({ where: { author_id: aurobindo.id } });
    if (mainPost) {
      await prisma.comment.createMany({
        data: [
          {
            post_id: mainPost.id,
            author_id: student.id,
            content: "Aurobindo Da, thank you so much for this offer! I am currently preparing for JEE and want to eventually major in Computer Science. I will definitely request a mentorship pairing with you."
          },
          {
            post_id: mainPost.id,
            author_id: adminUser.id,
            content: "Aurobindo, it warms our hearts to see you helping the younger generation. Your dedication is the true manifestation of Swami-ji's words: 'Servants of mankind are the true worshippers of God.'"
          }
        ]
      });
    }

    // Seed mentorships
    await prisma.mentorship.create({
      data: {
        mentor_id: aurobindo.id,
        mentee_id: student.id,
        status: "active",
        goals: "Guidance on software career preparation, learning computer architecture, and managing IIT JEE preparation balance.",
        start_date: new Date()
      }
    });

    // Seed donations
    await prisma.donation.createMany({
      data: [
        {
          donor_id: aurobindo.id,
          amount_paise: 5000000,
          cause: "Brahmananda Hostel Renovation",
          razorpay_id: "pay_RKMV12345ABCD",
          payment_status: "approved",
          receipt_url: "receipt_Brahmananda_auro.pdf",
          show_on_leaderboard: true
        },
        {
          donor_id: shubhendu.id,
          amount_paise: 10000000,
          cause: "Vidyapith Rural Scholarship Fund",
          razorpay_id: "pay_RKMV98765XYZ",
          payment_status: "approved",
          receipt_url: "receipt_Scholarship_shub.pdf",
          show_on_leaderboard: true
        }
      ]
    });

    // Seed notifications
    await prisma.notification.createMany({
      data: [
        {
          user_id: adminUser.id,
          title: "New Alumni Registration",
          body: "Amitabha Banik (Batch of 2018) submitted a new registration request for verification.",
          type: "alert"
        },
        {
          user_id: student.id,
          title: "Mentorship Approved",
          body: "Aurobindo Ghosh accepted your request and is now your active mentor! Reach out to him.",
          type: "success"
        }
      ]
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
