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
