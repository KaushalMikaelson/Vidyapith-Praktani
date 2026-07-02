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
  role: 'admin' | 'alumni' | 'student' | 'faculty';
  verify_status: 'approved' | 'pending' | 'rejected';
  profile_photo: string;
  bio: string;
  profession: string;
  company: string;
  city: string;
  country: string;
  linkedin_url: string;
  github_url?: string;
  portfolio_url?: string;
  skills?: string[];
  help_categories?: string[];
  looking_for?: string[];
  mentorship_status?: string;
  privacy: { show_email: boolean; show_mobile: boolean };
  // Upgraded professional networking fields
  designation?: string;
  years_of_experience?: string;
  education?: string;
  open_for?: string[];
  personal_url?: string;
  show_social?: boolean;
  show_email?: boolean;
  show_mobile?: boolean;
  created_at: string;
  certificate_url?: string;
  department?: string;
  industry?: string;
  profession_category?: string;
  leaving_class?: string;
  profile?: any;
}

export interface Post {
  id: string;
  author_id: string;
  group_id: string;
  content: string;
  media_urls: string[];
  post_type: 'text' | 'photo' | 'video' | 'article' | 'notes' | 'code' | 'link' | 'placement' | 'carousel' | 'achievement' | 'career' | 'mentorship' | 'event' | 'story' | 'announcement' | 'spotlight' | 'tribute';
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
  crucial?: boolean;
  action_url?: string | null;
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

// Safe localStorage wrapper to prevent private-mode, headless-testing, or SSR crashes
const safeStorage = {
  isAvailable(): boolean {
    try {
      const key = '__storage_test__';
      localStorage.setItem(key, key);
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  
  memoryStore: {} as Record<string, string>,

  getItem(key: string): string | null {
    if (this.isAvailable()) {
      return localStorage.getItem(key);
    }
    return this.memoryStore[key] || null;
  },

  setItem(key: string, value: string): void {
    if (this.isAvailable()) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn("localStorage setItem failed, falling back to in-memory store", e);
        this.memoryStore[key] = value;
      }
    } else {
      this.memoryStore[key] = value;
    }
  }
};

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
    RKMV_DB.seed();
  },

  // Seed Data Generation
  seed() {
    console.log("Seeding Vidyapith Connect Database in TypeScript React...");

    // 1. Initial Users
    const users: User[] = [
      {
        id: "usr-admin-1",
        full_name: "Kaushal",
        email: "kaushalstar1@gmail.com",
        mobile: "+91 9431320000",
        password_hash: "Klaus@6621",
        batch_year: 2026,
        house: "Monastery",
        role: "admin",
        verify_status: "approved",
        profile_photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80",
        bio: "Platform Administrator.",
        profession: "Administrator",
        company: "Ramakrishna Mission Vidyapith, Deoghar",
        city: "Deoghar",
        country: "India",
        linkedin_url: "",
        privacy: { show_email: true, show_mobile: true },
        created_at: new Date().toISOString()
      }
    ];

    // 2. Initial Posts (Forums)
    const posts: Post[] = [];

    // 3. Initial Comments
    const comments: Comment[] = [];

    // 4. Initial Events
    const events: Event[] = [];

    // 5. Initial RSVPs
    const rsvps: RSVP[] = [];

    // 6. Initial Donations
    const donations: Donation[] = [];

    // 7. Initial Mentorships
    const mentorships: Mentorship[] = [];

    // 8. Notifications
    const notifications: Notification[] = [];

    // 9. Job listings (Module 7)
    const jobs: JobListing[] = [];

    // 10. News & Spotlights (Module 6)
    const news: NewsPost[] = [];

    // 11. Heritage Archives (Module 6)
    const heritage: HeritageItem[] = [];

    // Save to safe storage only if the key is not already present,
    // which protects existing user data while initializing new/missing tables.
    const checkAndSet = (key: string, defaultData: unknown) => {
      if (!safeStorage.getItem(key)) {
        safeStorage.setItem(key, JSON.stringify(defaultData));
      }
    };

    checkAndSet(STORAGE_KEYS.USERS, users);
    checkAndSet(STORAGE_KEYS.POSTS, posts);
    checkAndSet(STORAGE_KEYS.COMMENTS, comments);
    checkAndSet(STORAGE_KEYS.EVENTS, events);
    checkAndSet(STORAGE_KEYS.RSVPS, rsvps);
    checkAndSet(STORAGE_KEYS.DONATIONS, donations);
    checkAndSet(STORAGE_KEYS.MENTORSHIPS, mentorships);
    checkAndSet(STORAGE_KEYS.NOTIFS, notifications);
    checkAndSet(STORAGE_KEYS.JOBS, jobs);
    checkAndSet(STORAGE_KEYS.NEWS, news);
    checkAndSet(STORAGE_KEYS.HERITAGE, heritage);
  },

  // Helper Methods for Reading & Synchronizing States
  getData<T>(key: string): T[] {
    try {
      const data = safeStorage.getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch (e) {
      console.error(`Error reading key ${key} from storage:`, e);
      return [];
    }
  },

  saveData<T>(key: string, data: T[]) {
    safeStorage.setItem(key, JSON.stringify(data));
  },

  // Users Database Methods
  getUsers(): User[] { return RKMV_DB.getData<User>(STORAGE_KEYS.USERS); },
  
  getApprovedAlumni(): User[] {
    return RKMV_DB.getUsers().filter(u => u.verify_status === 'approved' && u.role !== 'admin');
  },

  getUserById(id: string): User | undefined {
    return RKMV_DB.getUsers().find(u => u.id === id);
  },

  addUser(user: User): User {
    const users = RKMV_DB.getUsers();
    users.push(user);
    RKMV_DB.saveData(STORAGE_KEYS.USERS, users);
    return user;
  },

  updateUser(id: string, updatedFields: Partial<User>): User | null {
    const users = RKMV_DB.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updatedFields };
      RKMV_DB.saveData(STORAGE_KEYS.USERS, users);
      return users[idx];
    }
    return null;
  },

  // Search alumni
  searchAlumni(query: string, filters: { batchYear?: string; house?: string; city?: string } = {}): User[] {
    let alumni = RKMV_DB.getApprovedAlumni();
    
    if (query) {
      const q = query.toLowerCase();
      alumni = alumni.filter(a => 
        (a.full_name || '').toLowerCase().includes(q) ||
        (a.profession || '').toLowerCase().includes(q) ||
        (a.company || '').toLowerCase().includes(q) ||
        (a.bio || '').toLowerCase().includes(q) ||
        (a.city || '').toLowerCase().includes(q)
      );
    }

    if (filters.batchYear) {
      const yearVal = parseInt(filters.batchYear);
      if (!isNaN(yearVal)) {
        alumni = alumni.filter(a => a.batch_year === yearVal);
      }
    }
    if (filters.house) {
      alumni = alumni.filter(a => a.house === filters.house);
    }
    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      alumni = alumni.filter(a => a.city && a.city.toLowerCase().includes(cityLower));
    }

    return alumni;
  },

  // Forums Posting System
  getPosts(groupId: string = "grp-all"): Post[] {
    const posts = RKMV_DB.getData<Post>(STORAGE_KEYS.POSTS);
    return posts
      .filter(p => groupId === "grp-all" ? true : p.group_id === groupId)
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  },

  addPost(post: Post): Post {
    const posts = RKMV_DB.getData<Post>(STORAGE_KEYS.POSTS);
    posts.unshift(post);
    RKMV_DB.saveData(STORAGE_KEYS.POSTS, posts);
    return post;
  },

  toggleLikePost(postId: string, userId: string): Post | null {
    const posts = RKMV_DB.getData<Post>(STORAGE_KEYS.POSTS);
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
      RKMV_DB.saveData(STORAGE_KEYS.POSTS, posts);
      return posts[idx];
    }
    return null;
  },

  getComments(postId: string): Comment[] {
    const comments = RKMV_DB.getData<Comment>(STORAGE_KEYS.COMMENTS);
    return comments
      .filter(c => c.post_id === postId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  addComment(comment: Comment): Comment {
    const comments = RKMV_DB.getData<Comment>(STORAGE_KEYS.COMMENTS);
    comments.push(comment);
    RKMV_DB.saveData(STORAGE_KEYS.COMMENTS, comments);
    return comment;
  },

  // Events System
  getEvents(): Event[] {
    const events = RKMV_DB.getData<Event>(STORAGE_KEYS.EVENTS);
    return events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  },

  addEvent(event: Event): Event {
    const events = RKMV_DB.getData<Event>(STORAGE_KEYS.EVENTS);
    events.push(event);
    RKMV_DB.saveData(STORAGE_KEYS.EVENTS, events);
    return event;
  },

  getRSVPs(eventId: string): RSVP[] {
    const rsvps = RKMV_DB.getData<RSVP>(STORAGE_KEYS.RSVPS);
    return rsvps.filter(r => r.event_id === eventId);
  },

  hasUserRSVPed(eventId: string, userId: string): boolean {
    const rsvps = RKMV_DB.getData<RSVP>(STORAGE_KEYS.RSVPS);
    return rsvps.some(r => r.event_id === eventId && r.user_id === userId);
  },

  addRSVP(rsvp: RSVP): RSVP {
    const rsvps = RKMV_DB.getData<RSVP>(STORAGE_KEYS.RSVPS);
    const idx = rsvps.findIndex(r => r.event_id === rsvp.event_id && r.user_id === rsvp.user_id);
    if (idx === -1) {
      rsvps.push(rsvp);
    } else {
      rsvps[idx] = rsvp;
    }
    RKMV_DB.saveData(STORAGE_KEYS.RSVPS, rsvps);
    return rsvp;
  },

  // Donations System
  getDonations(): Donation[] {
    return RKMV_DB.getData<Donation>(STORAGE_KEYS.DONATIONS).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getDonationLeaderboard(): { user: User; total_amount: number }[] {
    const donations = RKMV_DB.getDonations();
    const donorTotals: { [key: string]: number } = {};
    donations
      .filter(d => d.payment_status === 'approved' && d.show_on_leaderboard)
      .forEach(d => {
        donorTotals[d.donor_id] = (donorTotals[d.donor_id] || 0) + d.amount_paise;
      });

    const leaderboardList: { user: User; total_amount: number }[] = [];
    for (const [donorId, total] of Object.entries(donorTotals)) {
      const user = RKMV_DB.getUserById(donorId);
      if (user) {
        leaderboardList.push({ user, total_amount: total });
      }
    }
    return leaderboardList.sort((a, b) => b.total_amount - a.total_amount);
  },

  addDonation(donation: Donation): Donation {
    const donations = RKMV_DB.getData<Donation>(STORAGE_KEYS.DONATIONS);
    donations.unshift(donation);
    RKMV_DB.saveData(STORAGE_KEYS.DONATIONS, donations);
    return donation;
  },

  // Mentorship System
  getMentorships(): Mentorship[] {
    return RKMV_DB.getData<Mentorship>(STORAGE_KEYS.MENTORSHIPS);
  },

  addMentorship(mentorship: Mentorship): Mentorship {
    const mentorships = RKMV_DB.getMentorships();
    mentorships.push(mentorship);
    RKMV_DB.saveData(STORAGE_KEYS.MENTORSHIPS, mentorships);
    return mentorship;
  },

  // Jobs Board System (Module 7)
  getJobs(): JobListing[] {
    return RKMV_DB.getData<JobListing>(STORAGE_KEYS.JOBS).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addJob(job: JobListing): JobListing {
    const jobs = RKMV_DB.getJobs();
    jobs.unshift(job);
    RKMV_DB.saveData(STORAGE_KEYS.JOBS, jobs);
    return job;
  },

  applyForJob(jobId: string, userId: string): JobListing | null {
    const jobs = RKMV_DB.getData<JobListing>(STORAGE_KEYS.JOBS);
    const idx = jobs.findIndex(j => j.id === jobId);
    if (idx !== -1) {
      const apps = jobs[idx].applications || [];
      if (!apps.includes(userId)) {
        apps.push(userId);
      }
      jobs[idx].applications = apps;
      RKMV_DB.saveData(STORAGE_KEYS.JOBS, jobs);
      return jobs[idx];
    }
    return null;
  },

  // News & Heritage Hub System (Module 6)
  getNews(): NewsPost[] {
    return RKMV_DB.getData<NewsPost>(STORAGE_KEYS.NEWS).sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  },

  addNews(post: NewsPost): NewsPost {
    const news = RKMV_DB.getNews();
    news.unshift(post);
    RKMV_DB.saveData(STORAGE_KEYS.NEWS, news);
    return post;
  },

  getHeritage(): HeritageItem[] {
    return RKMV_DB.getData<HeritageItem>(STORAGE_KEYS.HERITAGE).sort((a, b) => a.year - b.year);
  },

  // Notifications System
  getNotifications(userId: string): Notification[] {
    const notifs = RKMV_DB.getData<Notification>(STORAGE_KEYS.NOTIFS);
    return notifs
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addNotification(notif: Notification): Notification {
    const notifs = RKMV_DB.getData<Notification>(STORAGE_KEYS.NOTIFS);
    notifs.unshift(notif);
    RKMV_DB.saveData(STORAGE_KEYS.NOTIFS, notifs);
    return notif;
  },

  markNotificationsAsRead(userId: string) {
    const notifs = RKMV_DB.getData<Notification>(STORAGE_KEYS.NOTIFS);
    notifs.forEach(n => {
      if (n.user_id === userId) n.read = true;
    });
    RKMV_DB.saveData(STORAGE_KEYS.NOTIFS, notifs);
  }
};

// Initialize DB immediately on module import
// RKMV_DB.init();
