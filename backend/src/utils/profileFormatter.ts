/**
 * formatProfile — Converts a raw Prisma AlumniProfile row (or null/undefined)
 * into a plain JS object safe to expose via the API.
 *
 * Uses `as any` once here so that every controller that imports this helper
 * compiles cleanly even when the generated Prisma client is stale (i.e.,
 * `leaving_class` exists in schema.prisma but the client DLL was not
 * regenerated while the dev-server is running).
 */
export function formatProfile(profile: any) {
  if (!profile) {
    return {
      full_name: 'Vidyapith Alumnus',
      profile_photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
      batch_year: 0,
      leaving_class: 'XII',
      house: '',
      bio: '',
      profession_category: '',
      company: '',
      city: '',
      country: 'India',
      linkedin_url: '',
      github_url: '',
      portfolio_url: '',
      personal_url: '',
      skills: [],
      help_categories: [],
      looking_for: [],
      mentorship_status: 'Not Available',
      designation: '',
      years_of_experience: 0,
      education: '',
      open_for: [],
      show_email: true,
      show_phone: false,
      show_social: true,
      department: '',
      industry: '',
      certificate_url: ''
    };
  }

  const p = profile as any;
  return {
    full_name: p.full_name || 'Vidyapith Alumnus',
    profile_photo: p.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
    batch_year: p.batch_year || 0,
    leaving_class: p.leaving_class || 'XII',
    house: p.house || '',
    bio: p.bio || '',
    profession_category: p.profession_category || '',
    company: p.company || '',
    city: p.city || '',
    country: p.country || 'India',
    linkedin_url: p.linkedin_url || '',
    github_url: p.github_url || '',
    portfolio_url: p.portfolio_url || '',
    personal_url: p.personal_url || '',
    skills: p.skills || [],
    help_categories: p.help_categories || [],
    looking_for: p.looking_for || [],
    mentorship_status: p.mentorship_status || 'Not Available',
    designation: p.designation || '',
    years_of_experience: p.years_of_experience ?? 0,
    education: p.education || '',
    open_for: p.open_for || [],
    show_email: p.show_email ?? true,
    show_phone: p.show_phone ?? false,
    show_social: p.show_social ?? true,
    department: p.department || '',
    industry: p.industry || '',
    certificate_url: p.certificate_url || ''
  };
}
