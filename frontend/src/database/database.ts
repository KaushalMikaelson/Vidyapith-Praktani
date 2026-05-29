/* -------------------------------------------------------------
 * Vidyapith Connect — Client-side Relational Database Service (TSX Version)
 * Provides seed data and CRUD operations with localStorage sync.
 * ------------------------------------------------------------- */

export interface User {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  password_hash: string;
  batch_year: number;
  house: string;
  role: 'admin' | 'alumni' | 'student';
  verify_status: 'approved' | 'pending' | 'rejected';
  profile_photo: string;
  bio: string;
  profession: string;
  company: string;
  city: string;
  country: string;
  linkedin_url: string;
  privacy: { show_email: boolean; show_mobile: boolean };
  created_at: string;
  certificate_url?: string;
}

export interface Post {
  id: string;
  author_id: string;
  group_id: string;
  content: string;
  media_urls: string[];
  post_type: 'text' | 'photo';
  is_pinned: boolean;
  likes: string[]; // array of user IDs
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  event_type: 'physical' | 'virtual' | 'hybrid';
  online_link: string;
  max_capacity: number;
  created_by: string;
  created_at: string;
}

export interface RSVP {
  id: string;
  event_id: string;
  user_id: string;
  guest_count: number;
  dietary_pref: string;
  created_at: string;
}

export interface Donation {
  id: string;
  donor_id: string;
  amount_paise: number;
  cause: string;
  razorpay_id: string;
  payment_status: 'approved' | 'pending' | 'rejected';
  receipt_url: string;
  show_on_leaderboard: boolean;
  created_at: string;
}

export interface Mentorship {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: 'active' | 'completed' | 'declined' | 'pending';
  goals: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'alert';
  read: boolean;
  created_at: string;
}

export interface JobListing {
  id: string;
  posted_by: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Internship' | 'Contract' | 'Remote';
  description: string;
  skills: string[];
  referral_available: boolean;
  contact_email: string;
  expires_at: string;
  created_at: string;
  applications: string[]; // array of user IDs who applied
}

export interface NewsPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: 'Institutional News' | 'Alumni Spotlight' | 'Achievements' | 'Student Life';
  media_url?: string;
  author_name: string;
  published_at: string;
  is_featured: boolean;
}

export interface HeritageItem {
  id: string;
  title: string;
  description: string;
  decade: '1920s' | '1940s' | '1960s' | '1980s' | '2000s' | '2020s';
  media_url: string;
  category: 'Campus' | 'Dormitories' | 'Temple' | 'Reunions' | 'Sports';
  year: number;
}

const STORAGE_KEYS = {
  USERS: 'rkmv_users',
  EVENTS: 'rkmv_events',
  RSVPS: 'rkmv_rsvps',
  DONATIONS: 'rkmv_donations',
  MENTORSHIPS: 'rkmv_mentorships',
  POSTS: 'rkmv_posts',
  COMMENTS: 'rkmv_comments',
  NOTIFS: 'rkmv_notifs',
  JOBS: 'rkmv_jobs',
  NEWS: 'rkmv_news',
  HERITAGE: 'rkmv_heritage'
};

export const RKMV_DB = {
  // Initialize Database
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.seed();
    }
  },

  // Seed Data Generation
  seed() {
    console.log("Seeding Vidyapith Connect Database in TypeScript React...");

    // 1. Initial Users
    const users: User[] = [
      {
        id: "usr-admin-1",
        full_name: "Swami Brahmananda-ji",
        email: "swami@rkmv.org",
        mobile: "+91 9431320000",
        password_hash: "admin123",
        batch_year: 1982,
        house: "Monastery",
        role: "admin",
        verify_status: "approved",
        profile_photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&q=80",
        bio: "Monastic member of Ramakrishna Order. Dedicated to the education and spiritual welfare of children at Ramakrishna Mission Vidyapith, Deoghar.",
        profession: "Secretary & Headmaster",
        company: "Ramakrishna Mission Vidyapith, Deoghar",
        city: "Deoghar",
        country: "India",
        linkedin_url: "",
        privacy: { show_email: true, show_mobile: true },
        created_at: new Date("2020-01-01").toISOString()
      },
      {
        id: "usr-alumni-1",
        full_name: "Aurobindo Ghosh",
        email: "aurobindo@google.com",
        mobile: "+91 9876543210",
        password_hash: "alumni123",
        batch_year: 1995,
        house: "Vivekananda House",
        role: "alumni",
        verify_status: "approved",
        profile_photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&q=80",
        bio: "Principal Software Architect at Google Cloud. Alumnus of RKMV Deoghar (1995 batch). Enthusiastic about mentoring young minds and contributing to Vidyapith's development.",
        profession: "Principal Architect",
        company: "Google Cloud",
        city: "Bengaluru",
        country: "India",
        linkedin_url: "https://linkedin.com/in/aurobindo-ghosh-rkmv",
        privacy: { show_email: true, show_mobile: false },
        created_at: new Date("2021-06-15").toISOString()
      },
      {
        id: "usr-alumni-2",
        full_name: "Dr. Shubhendu Roy",
        email: "shubhendu.r@apollo.com",
        mobile: "+91 9123456789",
        password_hash: "alumni123",
        batch_year: 1988,
        house: "Brahmananda House",
        role: "alumni",
        verify_status: "approved",
        profile_photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&h=150&fit=crop&q=80",
        bio: "Senior Consultant Cardiologist at Apollo Gleneagles. Proud ex-Vidyapith student. Regular volunteer at health camps organized in Jharkhand.",
        profession: "Consultant Cardiologist",
        company: "Apollo Hospitals",
        city: "Kolkata",
        country: "India",
        linkedin_url: "https://linkedin.com/in/dr-shubhendu-roy-cardiologist",
        privacy: { show_email: true, show_mobile: true },
        created_at: new Date("2021-12-05").toISOString()
      },
      {
        id: "usr-alumni-3",
        full_name: "Rishi Kumar Sen",
        email: "rishi.sen@ifs.gov.in",
        mobile: "+91 9988776655",
        password_hash: "alumni123",
        batch_year: 2005,
        house: "Shardananda House",
        role: "alumni",
        verify_status: "approved",
        profile_photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&q=80",
        bio: "Indian Foreign Service (IFS) officer, 2012 batch. Currently serving as First Secretary at the Embassy of India. RKMV shaped my moral canvas.",
        profession: "IFS Officer",
        company: "Ministry of External Affairs, India",
        city: "New Delhi",
        country: "India",
        linkedin_url: "",
        privacy: { show_email: false, show_mobile: false },
        created_at: new Date("2022-03-12").toISOString()
      },
      {
        id: "usr-student-1",
        full_name: "Tathagata Mukhopadhyay",
        email: "tatha.m@student.org",
        mobile: "+91 8877665544",
        password_hash: "student123",
        batch_year: 2025,
        house: "Ramakrishnananda House",
        role: "student",
        verify_status: "approved",
        profile_photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&q=80",
        bio: "Passed Class X from Vidyapith in 2025. Currently pursuing Higher Secondary education with focus on STEM. Interested in AI, robotics, and sanskrit literature.",
        profession: "High School Student",
        company: "RKMV Deoghar",
        city: "Deoghar",
        country: "India",
        linkedin_url: "",
        privacy: { show_email: true, show_mobile: true },
        created_at: new Date("2025-04-10").toISOString()
      },
      {
        id: "usr-pending-1",
        full_name: "Debasish Lahiri",
        email: "debasish.lahiri@outlook.com",
        mobile: "+91 9776655443",
        password_hash: "alumni123",
        batch_year: 2012,
        house: "Yogananda House",
        role: "alumni",
        verify_status: "pending",
        profile_photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80",
        bio: "Senior Associate at PwC Consulting. Looking to reconnect with my batchmates and hostel brothers.",
        profession: "Management Consultant",
        company: "PricewaterhouseCoopers",
        city: "Pune",
        country: "India",
        linkedin_url: "https://linkedin.com/in/debasish-lahiri-pwc",
        privacy: { show_email: false, show_mobile: false },
        created_at: new Date("2026-05-27").toISOString(),
        certificate_url: "Leaving_Certificate_Debasish.pdf"
      },
      {
        id: "usr-pending-2",
        full_name: "Amitabha Banik",
        email: "amitabha.b@gmail.com",
        mobile: "+91 9007123456",
        password_hash: "alumni123",
        batch_year: 2018,
        house: "Premananda House",
        role: "alumni",
        verify_status: "pending",
        profile_photo: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&h=150&fit=crop&q=80",
        bio: "PhD Scholar at IISER Kolkata doing research in Quantum Physics. Vidyapith instilled the spirit of curiosity and Swami-ji's teachings in my heart.",
        profession: "Research Fellow",
        company: "IISER Kolkata",
        city: "Kalyani",
        country: "India",
        linkedin_url: "",
        privacy: { show_email: true, show_mobile: false },
        created_at: new Date("2026-05-28").toISOString(),
        certificate_url: "RKMV_Marskheet_2018.jpg"
      }
    ];

    // 2. Initial Posts (Forums)
    const posts: Post[] = [
      {
        id: "post-1",
        author_id: "usr-alumni-1",
        group_id: "grp-all",
        content: "Delighted to join Vidyapith Connect! Truly a magnificent initiative. The values Swami Vivekananda instilled in us on those beautiful mornings in the temple hall are the guiding light of our lives. If any student or young alumnus from the tech domain wants guidance or recommendations for Google/tech jobs, please reach out to me! Joy Ramakrishna! 🙏",
        media_urls: ["https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&fit=crop&q=80"],
        post_type: "photo",
        is_pinned: true,
        likes: ["usr-alumni-2", "usr-student-1", "usr-admin-1"],
        created_at: new Date("2026-05-20T10:00:00Z").toISOString()
      },
      {
        id: "post-2",
        author_id: "usr-admin-1",
        group_id: "grp-all",
        content: "Blessed greetings to all beloved children of Sri Ramakrishna. The silver jubilee batch (1998 Batch) is organizing a meeting at the Vidyapith premises on the occasion of upcoming Durga Puja. Let us assemble to cherish memories and discuss how we can serve the rural schools nearby. Details of the agenda will be published under the Events tab.",
        media_urls: [],
        post_type: "text",
        is_pinned: false,
        likes: ["usr-alumni-1", "usr-alumni-3"],
        created_at: new Date("2026-05-24T06:30:00Z").toISOString()
      },
      {
        id: "post-3",
        author_id: "usr-alumni-2",
        group_id: "grp-1988",
        content: "Anyone from the 1988 batch meeting in Kolkata this weekend? Dr. Alok Mitra is visiting from the USA. Let's gather at our usual coffee house spot. Cheers!",
        media_urls: [],
        post_type: "text",
        is_pinned: false,
        likes: [],
        created_at: new Date("2026-05-27T18:15:00Z").toISOString()
      }
    ];

    // 3. Initial Comments
    const comments: Comment[] = [
      {
        id: "comm-1",
        post_id: "post-1",
        author_id: "usr-student-1",
        content: "Aurobindo Da, thank you so much for this offer! I am currently preparing for JEE and want to eventually major in Computer Science. I will definitely request a mentorship pairing with you.",
        created_at: new Date("2026-05-20T11:45:00Z").toISOString()
      },
      {
        id: "comm-2",
        post_id: "post-1",
        author_id: "usr-admin-1",
        content: "Aurobindo, it warms our hearts to see you helping the younger generation. Your dedication is the true manifestation of Swami-ji's words: 'Servants of mankind are the true worshippers of God.'",
        created_at: new Date("2026-05-20T14:20:00Z").toISOString()
      }
    ];

    // 4. Initial Events
    const events: Event[] = [
      {
        id: "evt-1",
        title: "Durga Puja & Centennial Alumni Reunion",
        description: "The grandest festival at Ramakrishna Mission Vidyapith, Deoghar. This year marks the special silver jubilee reunion of the 1998-2000 leaving batches. Includes holy Prasad distribution, evening Aarati, batch presentations, and discussion on charitable relief works.",
        event_date: new Date("2026-10-18T08:00:00Z").toISOString(),
        location: "Vidyapith Prayer Hall & Auditorium, Deoghar",
        event_type: "physical",
        online_link: "",
        max_capacity: 500,
        created_by: "usr-admin-1",
        created_at: new Date("2026-05-01").toISOString()
      },
      {
        id: "evt-2",
        title: "Webinar: Career Paths in Modern Civil Services",
        description: "An exclusive interactive webinar led by senior ex-students who are in Indian Administrative Services (IAS), Foreign Services (IFS), and Police Services (IPS). Learn strategy, moral leadership, and governance frameworks.",
        event_date: new Date("2026-06-15T15:00:00Z").toISOString(),
        location: "Zoom Video Meeting",
        event_type: "virtual",
        online_link: "https://zoom.us/j/rkmv-civil-services",
        max_capacity: 1000,
        created_by: "usr-alumni-3",
        created_at: new Date("2026-05-15").toISOString()
      }
    ];

    // 5. Initial RSVPs
    const rsvps: RSVP[] = [
      {
        id: "rsvp-1",
        event_id: "evt-1",
        user_id: "usr-alumni-1",
        guest_count: 2,
        dietary_pref: "Vegetarian",
        created_at: new Date("2026-05-05").toISOString()
      },
      {
        id: "rsvp-2",
        event_id: "evt-1",
        user_id: "usr-alumni-2",
        guest_count: 1,
        dietary_pref: "Vegetarian",
        created_at: new Date("2026-05-07").toISOString()
      },
      {
        id: "rsvp-3",
        event_id: "evt-2",
        user_id: "usr-student-1",
        guest_count: 0,
        dietary_pref: "N/A",
        created_at: new Date("2026-05-20").toISOString()
      }
    ];

    // 6. Initial Donations
    const donations: Donation[] = [
      {
        id: "don-1",
        donor_id: "usr-alumni-1",
        amount_paise: 5000000, // ₹50,000
        cause: "Brahmananda Hostel Renovation",
        razorpay_id: "pay_RKMV12345ABCD",
        payment_status: "approved",
        receipt_url: "receipt_Brahmananda_auro.pdf",
        show_on_leaderboard: true,
        created_at: new Date("2026-05-10T12:00:00Z").toISOString()
      },
      {
        id: "don-2",
        donor_id: "usr-alumni-2",
        amount_paise: 10000000, // ₹1,00,000
        cause: "Vidyapith Rural Scholarship Fund",
        razorpay_id: "pay_RKMV98765XYZ",
        payment_status: "approved",
        receipt_url: "receipt_Scholarship_shub.pdf",
        show_on_leaderboard: true,
        created_at: new Date("2026-05-18T14:30:00Z").toISOString()
      },
      {
        id: "don-3",
        donor_id: "usr-alumni-3",
        amount_paise: 2500000, // ₹25,000
        cause: "Vivekananda Computer Lab Extension",
        razorpay_id: "pay_RKMV77443PLK",
        payment_status: "approved",
        receipt_url: "receipt_Lab_rishi.pdf",
        show_on_leaderboard: true,
        created_at: new Date("2026-05-25T09:15:00Z").toISOString()
      }
    ];

    // 7. Initial Mentorships
    const mentorships: Mentorship[] = [
      {
        id: "ment-1",
        mentor_id: "usr-alumni-1",
        mentee_id: "usr-student-1",
        status: "active",
        goals: "Guidance on software career preparation, learning computer architecture, and managing IIT JEE preparation balance.",
        start_date: "2026-05-22",
        end_date: null,
        created_at: new Date("2026-05-21T16:00:00Z").toISOString()
      }
    ];

    // 8. Notifications
    const notifications: Notification[] = [
      {
        id: "not-1",
        user_id: "usr-admin-1",
        title: "New Alumni Registration",
        body: "Amitabha Banik (Batch of 2018) submitted a new registration request for verification.",
        type: "alert",
        read: false,
        created_at: new Date("2026-05-28T10:00:00Z").toISOString()
      },
      {
        id: "not-2",
        user_id: "usr-student-1",
        title: "Mentorship Approved",
        body: "Aurobindo Ghosh accepted your request and is now your active mentor! Reach out to him.",
        type: "success",
        read: false,
        created_at: new Date("2026-05-22T09:00:00Z").toISOString()
      },
      {
        id: "not-3",
        user_id: "usr-alumni-1",
        title: "Donation Receipt Generated",
        body: "Thank you! Your donation of ₹50,000 has been verified. 80G receipt is ready for download.",
        type: "success",
        read: false,
        created_at: new Date("2026-05-10T12:05:00Z").toISOString()
      }
    ];

    // 9. Job listings (Module 7)
    const jobs: JobListing[] = [
      {
        id: "job-1",
        posted_by: "usr-alumni-1",
        title: "Backend Engineering Intern",
        company: "Google Cloud",
        location: "Bengaluru, India (Hybrid)",
        type: "Internship",
        description: "Looking for an energetic CS student from RKMV to join Google Cloud Developer Relations team as an intern. Hands-on development in Go, Kubernetes, and gRPC. Preference for final-year students with high algorithmic competency.",
        skills: ["Go", "Kubernetes", "gRPC", "Docker"],
        referral_available: true,
        contact_email: "aurobindo@google.com",
        expires_at: new Date("2026-09-30").toISOString(),
        created_at: new Date("2026-05-20").toISOString(),
        applications: []
      },
      {
        id: "job-2",
        posted_by: "usr-alumni-2",
        title: "Junior Resident doctor (Cardiology)",
        company: "Apollo Hospitals",
        location: "Kolkata, India",
        type: "Full-time",
        description: "Assisting senior cardiologists in non-invasive coronary screenings, critical care monitoring, and clinical research. Great opportunity for recent MBBS grads planning their MD exams.",
        skills: ["Clinical Medicine", "Patient Care", "ECG Analysis"],
        referral_available: true,
        contact_email: "shubhendu.r@apollo.com",
        expires_at: new Date("2026-08-15").toISOString(),
        created_at: new Date("2026-05-25").toISOString(),
        applications: []
      }
    ];

    // 10. News & Spotlights (Module 6)
    const news: NewsPost[] = [
      {
        id: "news-1",
        title: "Vidyapith Centenary Celebrations Prep in Full Swing",
        slug: "vidyapith-centenary-celebrations-prep",
        body: "Ramakrishna Mission Vidyapith, Deoghar, is marching towards its glorious 100th anniversary! Elaborate spiritual programmes, educational symposia, and a worldwide alumni convocation are scheduled for late December. The monastic community invites all ex-students to join and volunteer.",
        category: "Institutional News",
        media_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&fit=crop&q=80",
        author_name: "Swami Brahmananda-ji",
        published_at: new Date("2026-05-22").toISOString(),
        is_featured: true
      },
      {
        id: "news-2",
        title: "Alumni Spotlight: Rishi Kumar Sen, IFS",
        slug: "alumni-spotlight-rishi-kumar-sen",
        body: "Our distinguished brother Rishi Kumar Sen (Batch of 2005, Shardananda House) has been selected as the First Secretary to the Embassy of India. In a brief chat, Rishi mentions how RKMV's early morning prayers and residential rules paved his path to the Civil Services.",
        category: "Alumni Spotlight",
        media_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&fit=crop&q=80",
        author_name: "Alumni Cell Secretary",
        published_at: new Date("2026-05-26").toISOString(),
        is_featured: false
      }
    ];

    // 11. Heritage Archives (Module 6)
    const heritage: HeritageItem[] = [
      {
        id: "her-1",
        title: "Vidyapith Shrine Hall under construction",
        description: "A rare historical photograph capturing the layout and dome placement of the Universal Temple of Sri Ramakrishna in Deoghar.",
        decade: "1940s",
        media_url: "https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=500&fit=crop&q=80",
        category: "Temple",
        year: 1946
      },
      {
        id: "her-2",
        title: "Founder Monks Group Portrait",
        description: "Monastics and early spiritual guides who established the residential ashram school in Deoghar, bringing values-based education to rural Jharkhand.",
        decade: "1920s",
        media_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&fit=crop&q=80",
        category: "Campus",
        year: 1925
      },
      {
        id: "her-3",
        title: "Vintage Sports Day March Past",
        description: "Students marching in strict ranks in front of the Vivekananda Hostel, carrying their house colors under the guidance of physical education instructors.",
        decade: "1960s",
        media_url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&fit=crop&q=80",
        category: "Sports",
        year: 1968
      },
      {
        id: "her-4",
        title: "Vidyapith Library Inauguration",
        description: "Aurobindo Ghosh (as class leader) receiving the first batch of digitised encyclopedias from the headmaster in the main school library corridor.",
        decade: "1980s",
        media_url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=500&fit=crop&q=80",
        category: "Campus",
        year: 1989
      }
    ];

    // Save all to localStorage
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(rsvps));
    localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(donations));
    localStorage.setItem(STORAGE_KEYS.MENTORSHIPS, JSON.stringify(mentorships));
    localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(notifications));
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(news));
    localStorage.setItem(STORAGE_KEYS.HERITAGE, JSON.stringify(heritage));
  },

  // Helper Methods for Reading & Synchronizing States
  getData<T>(key: string): T[] {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  },

  saveData<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // Users Database Methods
  getUsers(): User[] { return this.getData<User>(STORAGE_KEYS.USERS); },
  
  getApprovedAlumni(): User[] {
    return this.getUsers().filter(u => u.verify_status === 'approved' && u.role !== 'admin');
  },

  getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  },

  addUser(user: User): User {
    const users = this.getUsers();
    users.push(user);
    this.saveData(STORAGE_KEYS.USERS, users);
    return user;
  },

  updateUser(id: string, updatedFields: Partial<User>): User | null {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updatedFields };
      this.saveData(STORAGE_KEYS.USERS, users);
      return users[idx];
    }
    return null;
  },

  // Search alumni
  searchAlumni(query: string, filters: { batchYear?: string; house?: string; city?: string } = {}): User[] {
    let alumni = this.getApprovedAlumni();
    
    if (query) {
      const q = query.toLowerCase();
      alumni = alumni.filter(a => 
        a.full_name.toLowerCase().includes(q) ||
        a.profession.toLowerCase().includes(q) ||
        a.company.toLowerCase().includes(q) ||
        a.bio.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q)
      );
    }

    if (filters.batchYear) {
      alumni = alumni.filter(a => a.batch_year === parseInt(filters.batchYear!));
    }
    if (filters.house) {
      alumni = alumni.filter(a => a.house === filters.house);
    }
    if (filters.city) {
      alumni = alumni.filter(a => a.city && a.city.toLowerCase().includes(filters.city!.toLowerCase()));
    }

    return alumni;
  },

  // Forums Posting System
  getPosts(groupId: string = "grp-all"): Post[] {
    const posts = this.getData<Post>(STORAGE_KEYS.POSTS);
    return posts
      .filter(p => groupId === "grp-all" ? true : p.group_id === groupId)
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  },

  addPost(post: Post): Post {
    const posts = this.getData<Post>(STORAGE_KEYS.POSTS);
    posts.unshift(post);
    this.saveData(STORAGE_KEYS.POSTS, posts);
    return post;
  },

  toggleLikePost(postId: string, userId: string): Post | null {
    const posts = this.getData<Post>(STORAGE_KEYS.POSTS);
    const idx = posts.findIndex(p => p.id === postId);
    if (idx !== -1) {
      const likes = posts[idx].likes || [];
      const userIdx = likes.indexOf(userId);
      if (userIdx === -1) {
        likes.push(userId);
      } else {
        likes.splice(userIdx, 1);
      }
      posts[idx].likes = likes;
      this.saveData(STORAGE_KEYS.POSTS, posts);
      return posts[idx];
    }
    return null;
  },

  getComments(postId: string): Comment[] {
    const comments = this.getData<Comment>(STORAGE_KEYS.COMMENTS);
    return comments
      .filter(c => c.post_id === postId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  addComment(comment: Comment): Comment {
    const comments = this.getData<Comment>(STORAGE_KEYS.COMMENTS);
    comments.push(comment);
    this.saveData(STORAGE_KEYS.COMMENTS, comments);
    return comment;
  },

  // Events System
  getEvents(): Event[] {
    const events = this.getData<Event>(STORAGE_KEYS.EVENTS);
    return events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  },

  addEvent(event: Event): Event {
    const events = this.getData<Event>(STORAGE_KEYS.EVENTS);
    events.push(event);
    this.saveData(STORAGE_KEYS.EVENTS, events);
    return event;
  },

  getRSVPs(eventId: string): RSVP[] {
    const rsvps = this.getData<RSVP>(STORAGE_KEYS.RSVPS);
    return rsvps.filter(r => r.event_id === eventId);
  },

  hasUserRSVPed(eventId: string, userId: string): boolean {
    const rsvps = this.getData<RSVP>(STORAGE_KEYS.RSVPS);
    return rsvps.some(r => r.event_id === eventId && r.user_id === userId);
  },

  addRSVP(rsvp: RSVP): RSVP {
    const rsvps = this.getData<RSVP>(STORAGE_KEYS.RSVPS);
    const idx = rsvps.findIndex(r => r.event_id === rsvp.event_id && r.user_id === rsvp.user_id);
    if (idx === -1) {
      rsvps.push(rsvp);
    } else {
      rsvps[idx] = rsvp;
    }
    this.saveData(STORAGE_KEYS.RSVPS, rsvps);
    return rsvp;
  },

  // Donations System
  getDonations(): Donation[] {
    return this.getData<Donation>(STORAGE_KEYS.DONATIONS).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getDonationLeaderboard(): { user: User; total_amount: number }[] {
    const donations = this.getDonations();
    const donorTotals: { [key: string]: number } = {};
    donations
      .filter(d => d.payment_status === 'approved' && d.show_on_leaderboard)
      .forEach(d => {
        donorTotals[d.donor_id] = (donorTotals[d.donor_id] || 0) + d.amount_paise;
      });

    return Object.entries(donorTotals)
      .map(([donorId, total]) => {
        const user = this.getUserById(donorId)!;
        return {
          user,
          total_amount: total
        };
      })
      .filter(item => item.user !== undefined)
      .sort((a, b) => b.total_amount - a.total_amount);
  },

  addDonation(donation: Donation): Donation {
    const donations = this.getData<Donation>(STORAGE_KEYS.DONATIONS);
    donations.unshift(donation);
    this.saveData(STORAGE_KEYS.DONATIONS, donations);
    return donation;
  },

  // Mentorship System
  getMentorships(): Mentorship[] {
    return this.getData<Mentorship>(STORAGE_KEYS.MENTORSHIPS);
  },

  addMentorship(mentorship: Mentorship): Mentorship {
    const mentorships = this.getMentorships();
    mentorships.push(mentorship);
    this.saveData(STORAGE_KEYS.MENTORSHIPS, mentorships);
    return mentorship;
  },

  // Jobs Board System (Module 7)
  getJobs(): JobListing[] {
    return this.getData<JobListing>(STORAGE_KEYS.JOBS).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addJob(job: JobListing): JobListing {
    const jobs = this.getJobs();
    jobs.unshift(job);
    this.saveData(STORAGE_KEYS.JOBS, jobs);
    return job;
  },

  applyForJob(jobId: string, userId: string): JobListing | null {
    const jobs = this.getJobs();
    const idx = jobs.findIndex(j => j.id === jobId);
    if (idx !== -1) {
      const apps = jobs[idx].applications || [];
      if (!apps.includes(userId)) {
        apps.push(userId);
      }
      jobs[idx].applications = apps;
      this.saveData(STORAGE_KEYS.JOBS, jobs);
      return jobs[idx];
    }
    return null;
  },

  // News & Heritage Hub System (Module 6)
  getNews(): NewsPost[] {
    return this.getData<NewsPost>(STORAGE_KEYS.NEWS).sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  },

  addNews(post: NewsPost): NewsPost {
    const news = this.getNews();
    news.unshift(post);
    this.saveData(STORAGE_KEYS.NEWS, news);
    return post;
  },

  getHeritage(): HeritageItem[] {
    return this.getData<HeritageItem>(STORAGE_KEYS.HERITAGE).sort((a, b) => a.year - b.year);
  },

  // Notifications System
  getNotifications(userId: string): Notification[] {
    const notifs = this.getData<Notification>(STORAGE_KEYS.NOTIFS);
    return notifs
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addNotification(notif: Notification): Notification {
    const notifs = this.getData<Notification>(STORAGE_KEYS.NOTIFS);
    notifs.unshift(notif);
    this.saveData(STORAGE_KEYS.NOTIFS, notifs);
    return notif;
  },

  markNotificationsAsRead(userId: string) {
    const notifs = this.getData<Notification>(STORAGE_KEYS.NOTIFS);
    notifs.forEach(n => {
      if (n.user_id === userId) n.read = true;
    });
    this.saveData(STORAGE_KEYS.NOTIFS, notifs);
  }
};

// Initialize DB immediately on module import
RKMV_DB.init();
