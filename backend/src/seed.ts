import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Neon database with Vidyapith Connect demo data...");

  // Clear existing entries to prevent duplication
  await prisma.comment.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.mentorship.deleteMany({});
  await prisma.donation.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.news.deleteMany({});
  await prisma.heritage.deleteMany({});
  await prisma.alumniProfile.deleteMany({});
  await prisma.user.deleteMany({});

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash("admin123", salt);
  const alumniHash = await bcrypt.hash("alumni123", salt);
  const studentHash = await bcrypt.hash("student123", salt);

  const mainUsers = [
    // Admin
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
        certificate_url: "Leaving_Certificate_Scan.pdf",
        department: "Administration",
        industry: "Education"
      }
    },
    // 10 screenshot profiles
    {
      email: "rahul.sharma@gmail.com",
      phone: "+91 9876500001",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Rahul Sharma",
        profile_photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&q=80",
        batch_year: 2000,
        house: "Tagore House",
        bio: "Tech entrepreneur. Passionate about software engineering and machine learning.",
        profession_category: "Software Engineer",
        company: "Tech Solutions Inc.",
        city: "Mumbai",
        country: "India",
        linkedin_url: "https://linkedin.com",
        show_email: true,
        show_phone: false,
        department: "Engineering",
        industry: "Technology"
      }
    },
    {
      email: "sophia.verma@gmail.com",
      phone: "+91 9876500002",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Sophia Verma",
        profile_photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80",
        batch_year: 2005,
        house: "Gandhi House",
        bio: "Scientific researcher. Exploring biotechnology and genomic datasets.",
        profession_category: "Biotech Researcher",
        company: "Genomics Lab",
        city: "Delhi",
        country: "India",
        linkedin_url: "https://linkedin.com",
        show_email: true,
        show_phone: false,
        department: "Science",
        industry: "Research"
      }
    },
    {
      email: "mehta@gmail.com",
      phone: "+91 9876500003",
      password_hash: alumniHash,
      role: "faculty",
      verify_status: "approved",
      profile: {
        full_name: "Dr. Mehta",
        profile_photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&q=80",
        batch_year: 1985,
        house: "Monastery",
        bio: "Dedicated Physics professor. Over 30 years of teaching experience.",
        profession_category: "Physics Professor",
        company: "Ramakrishna Mission Vidyapith",
        city: "Pune",
        country: "India",
        linkedin_url: "https://linkedin.com",
        show_email: true,
        show_phone: true,
        department: "Physics",
        industry: "Education"
      }
    },
    {
      email: "sameer.khan@gmail.com",
      phone: "+91 9876500004",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Sameer Khan",
        profile_photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80",
        batch_year: 2010,
        house: "Bose House",
        bio: "Financial analyst and investment portfolio manager.",
        profession_category: "Investment Analyst",
        company: "Capital Markets Corp",
        city: "Bangalore",
        country: "India",
        linkedin_url: "https://linkedin.com",
        show_email: true,
        show_phone: false,
        department: "Commerce",
        industry: "Finance"
      }
    },
    {
      email: "priya.singh@gmail.com",
      phone: "+91 9876500005",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Priya Singh",
        profile_photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80",
        batch_year: 2015,
        house: "Nehru House",
        bio: "Creative art designer. Focused on visual arts and UI design.",
        profession_category: "UI/UX Designer",
        company: "Design Studio",
        city: "Mumbai",
        country: "India",
        linkedin_url: "https://linkedin.com",
        show_email: true,
        show_phone: false,
        department: "Arts",
        industry: "Art"
      }
    },
    {
      email: "anita.rao@gmail.com",
      phone: "+91 9876500006",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Anita Rao",
        profile_photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80",
        batch_year: 2020,
        house: "Tagore House",
        bio: "Data scientist. Passionate about machine learning and data analytics.",
        profession_category: "Data Scientist",
        company: "Analytics Co.",
        city: "Delhi",
        country: "India",
        linkedin_url: "https://linkedin.com",
        show_email: true,
        show_phone: false,
        department: "Science",
        industry: "Research"
      }
    },
    {
      email: "rohan.das@gmail.com",
      phone: "+91 9876500007",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Rohan Das",
        profile_photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80",
        batch_year: 2012,
        house: "Bose House",
        bio: "DevOps Engineer. Passionate about cloud architecture and Kubernetes.",
        profession_category: "DevOps Engineer",
        company: "CloudTech Solutions",
        city: "Pune",
        country: "India",
        linkedin_url: "https://linkedin.com",
        show_email: true,
        show_phone: false,
        department: "Engineering",
        industry: "Technology"
      }
    },
    {
      email: "nikhil.joshi@gmail.com",
      phone: "+91 9876500008",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Nikhil Joshi",
        profile_photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&q=80",
        batch_year: 2008,
        house: "Nehru House",
        bio: "Accountant and financial auditor. Helping startups manage taxes.",
        profession_category: "Chartered Accountant",
        company: "Joshi & Associates",
        city: "Mumbai",
        country: "India",
        linkedin_url: "https://linkedin.com",
        show_email: true,
        show_phone: false,
        department: "Commerce",
        industry: "Finance"
      }
    },
    {
      email: "divya.nair@gmail.com",
      phone: "+91 9876500009",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Divya Nair",
        profile_photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&q=80",
        batch_year: 2018,
        house: "Gandhi House",
        bio: "Writer and content creator. Passionate about literature and fine arts.",
        profession_category: "Content Strategist",
        company: "Media Group",
        city: "Bangalore",
        country: "India",
        linkedin_url: "https://linkedin.com",
        show_email: true,
        show_phone: false,
        department: "Arts",
        industry: "Art"
      }
    },
    {
      email: "arun.pillai@gmail.com",
      phone: "+91 9876500010",
      password_hash: alumniHash,
      role: "faculty",
      verify_status: "approved",
      profile: {
        full_name: "Arun Pillai",
        profile_photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&q=80",
        batch_year: 1990,
        house: "Monastery",
        bio: "Chemistry teacher. Dedicated to explaining chemical reactions and formulas.",
        profession_category: "Chemistry Professor",
        company: "Ramakrishna Mission Vidyapith",
        city: "Delhi",
        country: "India",
        linkedin_url: "https://linkedin.com",
        show_email: true,
        show_phone: true,
        department: "Chemistry",
        industry: "Education"
      }
    },
    // 4 house representatives
    {
      email: "arjun.nair@gmail.com",
      phone: "+91 9876500011",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Arjun Nair",
        profile_photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80",
        batch_year: 2001,
        house: "Tagore House",
        bio: "Tagore House representative.",
        profession_category: "Architect",
        company: "Nair & Partners",
        city: "Cochin",
        country: "India",
        linkedin_url: "",
        show_email: true,
        show_phone: false,
        department: "Engineering",
        industry: "Technology"
      }
    },
    {
      email: "meera.pillai@gmail.com",
      phone: "+91 9876500012",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Meera Pillai",
        profile_photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80",
        batch_year: 2004,
        house: "Gandhi House",
        bio: "Gandhi House representative.",
        profession_category: "Medical Resident",
        company: "General Hospital",
        city: "Trivandrum",
        country: "India",
        linkedin_url: "",
        show_email: true,
        show_phone: false,
        department: "Science",
        industry: "Healthcare"
      }
    },
    {
      email: "vikram.bose@gmail.com",
      phone: "+91 9876500013",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Vikram Bose",
        profile_photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80",
        batch_year: 2002,
        house: "Bose House",
        bio: "Bose House representative.",
        profession_category: "Manager",
        company: "Bose Corp",
        city: "Kolkata",
        country: "India",
        linkedin_url: "",
        show_email: true,
        show_phone: false,
        department: "Commerce",
        industry: "Finance"
      }
    },
    {
      email: "kavya.iyer@gmail.com",
      phone: "+91 9876500014",
      password_hash: alumniHash,
      role: "alumni",
      verify_status: "approved",
      profile: {
        full_name: "Kavya Iyer",
        profile_photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80",
        batch_year: 2003,
        house: "Nehru House",
        bio: "Nehru House representative.",
        profession_category: "Research Scholar",
        company: "Nehru Center",
        city: "Chennai",
        country: "India",
        linkedin_url: "",
        show_email: true,
        show_phone: false,
        department: "Arts",
        industry: "Research"
      }
    },
    // 3 legacy users for dependency links
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
        house: "Tagore House",
        bio: "Principal Software Architect at Google Cloud. Alumnus of RKMV Deoghar (1995 batch). Enthusiastic about mentoring young minds.",
        profession_category: "Principal Architect",
        company: "Google Cloud",
        city: "Bengaluru",
        country: "India",
        linkedin_url: "https://linkedin.com/in/aurobindo-ghosh-rkmv",
        show_email: true,
        show_phone: false,
        certificate_url: "Leaving_Certificate_Scan.pdf",
        department: "Engineering",
        industry: "Technology"
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
        house: "Gandhi House",
        bio: "Senior Consultant Cardiologist at Apollo Gleneagles. Proud ex-Vidyapith student.",
        profession_category: "Consultant Cardiologist",
        company: "Apollo Hospitals",
        city: "Kolkata",
        country: "India",
        linkedin_url: "https://linkedin.com/in/dr-shubhendu-roy-cardiologist",
        show_email: true,
        show_phone: true,
        certificate_url: "Leaving_Certificate_Scan.pdf",
        department: "Science",
        industry: "Healthcare"
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
        house: "Nehru House",
        bio: "Passed Class X from Vidyapith in 2025. Pursuing Higher Secondary education.",
        profession_category: "High School Student",
        company: "RKMV Deoghar",
        city: "Deoghar",
        country: "India",
        linkedin_url: "",
        show_email: true,
        show_phone: true,
        certificate_url: "Leaving_Certificate_Scan.pdf",
        department: "Science",
        industry: "Research"
      }
    }
  ];

  // Seed the main users
  for (const item of mainUsers) {
    const { profile, ...userData } = item;
    await prisma.user.create({
      data: {
        ...userData,
        profile: {
          create: profile
        }
      }
    });
  }
  console.log("Main screenshot profiles seeded.");

  // Lists for generating 238 random profiles
  const firstNamesAD = ["Amit", "Abhishek", "Anuj", "Akash", "Aman", "Bobby", "Bipin", "Bhupesh", "Chandan", "Chirag", "Deepak", "Debasish", "Dinesh", "Dev"];
  const firstNamesEH = ["Eshwar", "Ekansh", "Farhan", "Faisal", "Gaurav", "Gopal", "Gautam", "Girish", "Hari", "Himanshu", "Harish", "Hrithik"];
  const firstNamesIL = ["Ishan", "Indrajit", "Imran", "Jitendra", "Jatin", "Joy", "Kunal", "Kartik", "Ketan", "Lokesh", "Lalit", "Lakshay"];
  const firstNamesMP = ["Manish", "Manoj", "Mayank", "Mohit", "Nitin", "Naveen", "Nikhil", "Pradeep", "Pankaj", "Piyush", "Parth", "Pranav"];
  const firstNamesQT = ["Raj", "Ranjan", "Rohan", "Rishi", "Sandeep", "Sanjay", "Suresh", "Sameer", "Tarun", "Tushar", "Tanmay"];
  const firstNamesUZ = ["Uday", "Ujjwal", "Utkarsh", "Vivek", "Vikram", "Vinay", "Vijay", "Yash", "Yogesh", "Zaheer", "Zeeshan"];

  const lastNames = ["Sharma", "Verma", "Gupta", "Roy", "Sen", "Das", "Joshi", "Nair", "Pillai", "Singh", "Rao", "Kumar", "Banik", "Lahiri", "Mehta", "Khan", "Bose", "Iyer", "Patel", "Mishra", "Mukhopadhyay", "Choudhury", "Bhattacharya"];

  const ranges = [
    { target: 35, names: firstNamesAD }, // A-D (42 total - 7 main)
    { target: 38, names: firstNamesEH }, // E-H (38 total - 0 main)
    { target: 28, names: firstNamesIL }, // I-L (29 total - 1 main)
    { target: 58, names: firstNamesMP }, // M-P (61 total - 3 main)
    { target: 42, names: firstNamesQT }, // Q-T (47 total - 5 main)
    { target: 30, names: firstNamesUZ }  // U-Z (31 total - 1 main)
  ];

  let idCounter = 100;
  for (const range of ranges) {
    for (let i = 0; i < range.target; i++) {
      const firstName = range.names[Math.floor(Math.random() * range.names.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      const id = `usr-gen-${idCounter++}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${idCounter}@vidyapith.org`;
      const phone = `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`;
      
      const role = Math.random() > 0.15 ? "alumni" : "student";
      const batch_year = role === 'student' ? 2025 + Math.floor(Math.random() * 2) : 1980 + Math.floor(Math.random() * 45);
      
      const house = ["Tagore House", "Gandhi House", "Bose House", "Nehru House"][Math.floor(Math.random() * 4)];
      const department = ["Engineering", "Science", "Commerce", "Arts"][Math.floor(Math.random() * 4)];
      const industry = ["Technology", "Healthcare", "Finance", "Government", "Research", "Art"][Math.floor(Math.random() * 6)];
      const city = ["Mumbai", "Delhi", "Pune", "Bangalore", "Kolkata", "Deoghar"][Math.floor(Math.random() * 6)];

      await prisma.user.create({
        data: {
          id,
          email,
          phone,
          password_hash: alumniHash,
          role,
          verify_status: "approved",
          profile: {
            create: {
              full_name: `${firstName} ${lastName}`,
              profile_photo: `https://images.unsplash.com/photo-${[
                "1535713875002-d1d0cf377fde", "1570295999919-56ceb5ecca61", "1527983359383-4758693f760c",
                "1500648767791-00dcc994a43e", "1544005313-94ddf0286df2", "1506794778202-cad84cf45f1d",
                "1534528741775-53994a69daeb", "1494790108377-be9c29b29330", "1517841905240-472988babdf9"
              ][Math.floor(Math.random() * 9)]}?w=150&h=150&fit=crop&q=80`,
              batch_year,
              house,
              bio: `Vidyapith ex-student. Proud of our legacy.`,
              profession_category: role === 'student' ? 'High School Student' : 'Professional Analyst',
              company: role === 'student' ? 'RKMV Deoghar' : 'Global Corporation',
              city,
              country: "India",
              linkedin_url: "",
              show_email: true,
              show_phone: false,
              department,
              industry
            }
          }
        }
      });
    }
  }
  console.log("All 248 search directory users seeded.");

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
