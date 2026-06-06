"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Post, Comment } from '../database/database';
import { 
  Send, Image, MessageCircle, Heart, Bookmark, MoreHorizontal, Pin, Bell,
  Smile, Share2, Film, Link, FileText, Clipboard, Play, ExternalLink, 
  Sparkles, Check, ChevronLeft, ChevronRight, Download, BookOpen, Eye, 
  Flame, Trophy, Trash2, Plus, ShieldAlert, Award, Search, HelpCircle, 
  Briefcase, Star, Settings, CheckCircle2, AlertTriangle, BookMarked, User as UserIcon, X,
  Calendar, MapPin, Clock, Lock, Tag, MessageSquare, Paperclip, Volume2,
  Users, Camera, ChevronDown, Quote, UserPlus
} from 'lucide-react';
import { apiFetch } from '../utils/api';

interface FeedScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
  screenMode?: string;
  forceProfileId?: string;
  refreshKey?: number;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({ 
  showToast, onViewProfile, screenMode = 'feed', forceProfileId, refreshKey = 0 
}) => {
  const { currentUser } = useAuth();
  
  // Feed & Filtering states
  const [activeGroupId, setActiveGroupId] = useState('grp-all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterChip, setFilterChip] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Profile details if view-profile is requested
  const [profileUser, setProfileUser] = useState<any>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [profileTab, setProfileTab] = useState<'posts' | 'notes' | 'reels' | 'achievements' | 'saved'>('posts');

  // Profile Settings form states
  const [settingsBio, setSettingsBio] = useState(currentUser?.bio || '');
  const [settingsProfession, setSettingsProfession] = useState(currentUser?.profession || '');
  const [settingsCompany, setSettingsCompany] = useState(currentUser?.company || '');
  const [settingsCity, setSettingsCity] = useState(currentUser?.city || '');
  const [settingsCountry, setSettingsCountry] = useState(currentUser?.country || 'India');
  const [settingsPhotoUrl, setSettingsPhotoUrl] = useState(currentUser?.profile_photo || '');
  const [settingsShowEmail, setSettingsShowEmail] = useState(currentUser?.privacy?.show_email ?? true);
  const [settingsShowMobile, setSettingsShowMobile] = useState(currentUser?.privacy?.show_mobile ?? false);

  // Post Creator Studio States
  const [newPostText, setNewPostText] = useState('');
  const [postMediaType, setPostMediaType] = useState<'text' | 'photo' | 'video' | 'achievement' | 'career' | 'mentorship' | 'event' | 'story' | 'announcement' | 'spotlight' | 'tribute'>('text');
  const [postToGroup, setPostToGroup] = useState('grp-all');
  
  // Specific media type inputs
  const [mediaImages, setMediaImages] = useState<string[]>([]);
  const [tempImageInput, setTempImageInput] = useState('');
  
  const [newPostVideoUrl, setNewPostVideoUrl] = useState('');
  
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfSubject, setPdfSubject] = useState('DSA');
  const [pdfSemester, setPdfSemester] = useState('3');
  const [pdfPageCount, setPdfPageCount] = useState('12');
  const [pdfFileSize, setPdfFileSize] = useState('4.2 MB');
  
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeContent, setCodeContent] = useState('// Write your solution here\nfunction solve() {\n  console.log("Hello, Vidyapith!");\n}');
  const [simulatedConsoleOutput, setSimulatedConsoleOutput] = useState<{ [postId: string]: string }>({});
  
  const [resourceLinkUrl, setResourceLinkUrl] = useState('');
  const [resourceLinkTitle, setResourceLinkTitle] = useState('');
  const [resourceLinkDesc, setResourceLinkDesc] = useState('');

  // New post types details
  const [achievementTitle, setAchievementTitle] = useState('');
  const [achievementBadge, setAchievementBadge] = useState('School Ambassador');
  const [careerTitle, setCareerTitle] = useState('');
  const [careerCompany, setCareerCompany] = useState('');
  const [careerLocation, setCareerLocation] = useState('');
  const [careerReferral, setCareerReferral] = useState(true);
  const [mentorshipExpertise, setMentorshipExpertise] = useState('Software Engineering');
  const [mentorshipOffer, setMentorshipOffer] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDateStr, setEventDateStr] = useState('');
  const [eventLocationStr, setEventLocationStr] = useState('');
  const [storyTeacher, setStoryTeacher] = useState('');
  const [storyYear, setStoryYear] = useState('2015');
  const [announcementUrgency, setAnnouncementUrgency] = useState('Standard');

  // Memories Upload / Grid states
  const [memoryTags, setMemoryTags] = useState('Cricket Tournament');
  const [memoryLocation, setMemoryLocation] = useState('Vidyapith Playground');
  const [dragOverActive, setDragOverActive] = useState(false);
  const [activeMemoryLightbox, setActiveMemoryLightbox] = useState<any>(null);

  // Discover filters
  const [discoverCity, setDiscoverCity] = useState('');
  const [discoverProfession, setDiscoverProfession] = useState('');
  const [discoverIndustry, setDiscoverIndustry] = useState('');
  const [discoverCompany, setDiscoverCompany] = useState('');
  const [discoverHigherEdu, setDiscoverHigherEdu] = useState('');
  const [discoverCountry, setDiscoverCountry] = useState('');
  const [discoverSkills, setDiscoverSkills] = useState('');

  // Batch polls
  const [batchPollQuestion, setBatchPollQuestion] = useState('');
  const [batchPollOpts, setBatchPollOpts] = useState<string[]>(['', '']);
  const [batchPolls, setBatchPolls] = useState<any[]>([
    { id: 'poll-1', question: 'Where should we organize our 25-year Reunion meetup?', options: ['Vidyapith Deoghar Campus', 'Kolkata Monastic Center', 'Bengaluru Tech Park'], votes: [14, 8, 5], votedIndex: null }
  ]);

  // Reunions expense list
  const [reunionExpenses, setReunionExpenses] = useState<any[]>([
    { id: 'exp-1', title: 'Grand Lunch Prasad Catering', amount: 35000, payer: 'Aurobindo Ghosh (Google)' },
    { id: 'exp-2', title: 'Temple Hall Floral Decoration', amount: 8500, payer: 'Dr. Shubhendu Roy' },
    { id: 'exp-3', title: 'Centennial Souvenir Printing', amount: 12000, payer: 'Rishi Kumar Sen' }
  ]);
  const [expTitleInput, setExpTitleInput] = useState('');
  const [expAmountInput, setExpAmountInput] = useState('');
  const [reunionPhotos, setReunionPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&fit=crop&q=80'
  ]);
  const [tempReunionPhotoInput, setTempReunionPhotoInput] = useState('');

  // School Archives decadal timeline selector
  const [archiveDecade, setArchiveDecade] = useState('1980s');
  const [archiveCategory, setArchiveCategory] = useState('All');

  // Messaging private chats
  const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({
    'chat-1': [
      { id: 'msg-1', senderId: 'usr-alumni-2', text: 'Hey Aurobindo! Are you coming to Deoghar this Puja?', time: '10:30 AM' },
      { id: 'msg-2', senderId: 'usr-alumni-1', text: 'Yes Shubhendu! Already booked my tickets. Looking forward to meeting Brahmananda-ji.', time: '10:32 AM' }
    ],
    'chat-batch': [
      { id: 'bmsg-1', senderId: 'usr-alumni-2', text: 'Brothers, has anyone contributed to the computer lab fund yet?', time: 'Yesterday' },
      { id: 'bmsg-2', senderId: 'usr-alumni-3', text: 'Yes, just completed a ₹25k transfer. Receipt received.', time: 'Yesterday' }
    ]
  });
  const [messageInputText, setMessageInputText] = useState('');
  const [activeChatId, setActiveChatId] = useState('chat-1');
  const [messagingModalOpen, setMessagingModalOpen] = useState(false);
  const [playingVoiceNoteId, setPlayingVoiceNoteId] = useState<string | null>(null);

  const [placementCompany, setPlacementCompany] = useState('');
  const [placementRole, setPlacementRole] = useState('');
  const [placementCtc, setPlacementCtc] = useState('');
  const [placementExperience, setPlacementExperience] = useState('');
  const [placementQuestions, setPlacementQuestions] = useState('');

  // Knowledge Carousel Slide builder
  const [carouselSlides, setCarouselSlides] = useState<{ title: string; text: string }[]>([
    { title: 'Slide 1 Title', text: 'Explain the core concept here...' }
  ]);
  const [carouselActiveIndexes, setCarouselActiveIndexes] = useState<{ [postId: string]: number }>({});

  // Metadata
  const [postSubject, setPostSubject] = useState('DSA');
  const [postSemester, setPostSemester] = useState('3');
  const [postBranch, setPostBranch] = useState('CSE');
  const [postDifficulty, setPostDifficulty] = useState('Intermediate');
  const [postVisibility, setPostVisibility] = useState('Public');

  // Instagram Interactions & UI states
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [expandedCaptions, setExpandedCaptions] = useState<{ [postId: string]: boolean }>({});
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [activeOptionsPostId, setActiveOptionsPostId] = useState<string | null>(null);
  const [activeEmojiPostId, setActiveEmojiPostId] = useState<string | null>(null);
  const [likedAnimationPostId, setLikedAnimationPostId] = useState<{ [postId: string]: boolean }>({});
  const [activePdfPreviewUrl, setActivePdfPreviewUrl] = useState<string | null>(null);

  // AI Generation loader simulation
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Alumni Nostalgic metadata states
  const [tagClassmates, setTagClassmates] = useState('');
  const [targetBatchYear, setTargetBatchYear] = useState('');
  const [isReunionPost, setIsReunionPost] = useState(false);
  const [nostalgicPhotoUrl, setNostalgicPhotoUrl] = useState('');
  const [showMemoryAssistantMenu, setShowMemoryAssistantMenu] = useState(false);
  
  // Spotlight and Tribute specific states
  const [spotlightName, setSpotlightName] = useState('');
  const [spotlightBatch, setSpotlightBatch] = useState('');
  const [spotlightAchievement, setSpotlightAchievement] = useState('');
  const [tributePerson, setTributePerson] = useState('');
  const [tributeRole, setTributeRole] = useState('');

  // Additional composer panel & interaction states
  const [showNostalgiaPanel, setShowNostalgiaPanel] = useState(false);
  const [publishHovered, setPublishHovered] = useState(false);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);

  // New sub-screens states
  const [discoverAlumni, setDiscoverAlumni] = useState<any[]>([]);
  const [connectionSentIds, setConnectionSentIds] = useState<string[]>([]);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [memoryImage, setMemoryImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Sync bookmarks from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rkmv_bookmarked_posts');
      if (saved) {
        try { setBookmarks(JSON.parse(saved)); } catch (e) {}
      }
    }
  }, []);

  // Fetch feed content
  const loadFeed = async () => {
    setLoading(true);
    try {
      let endpoint = `/posts?groupId=${activeGroupId}`;
      const feedPosts = await apiFetch(endpoint);
      setPosts(feedPosts);
    } catch (err: any) {
      showToast(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Fetch profile details
  const loadProfile = async (targetId: string) => {
    try {
      const uDetails = await apiFetch(`/directory/profile/${targetId}`);
      setProfileUser(uDetails);
      const allPosts = await apiFetch(`/posts?groupId=grp-all`);
      setProfilePosts(allPosts.filter((p: any) => p.author_id === targetId));
    } catch (err: any) {
      showToast("Failed to load profile details", "danger");
    }
  };

  useEffect(() => {
    if (screenMode === 'profile' && forceProfileId) {
      loadProfile(forceProfileId);
    } else {
      loadFeed();
    }
    if (screenMode === 'discover') {
      apiFetch('/directory')
        .then(data => setDiscoverAlumni(data))
        .catch(err => console.error(err));
    }
  }, [activeGroupId, screenMode, forceProfileId, refreshKey]);

  const handleConnectRequest = async (id: string, name: string) => {
    try {
      await apiFetch('/directory/connect', {
        method: 'POST',
        body: JSON.stringify({ targetId: id })
      });
      setConnectionSentIds(prev => [...prev, id]);
      showToast(`Connection request sent to ${name}!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  if (!currentUser) return null;

  // Memory Assistant template handler
  const handleMemoryAssistantClick = (templateType: string) => {
    setIsAiGenerating(true);
    setShowMemoryAssistantMenu(false);
    showToast("Memory Assistant is drafting...", "info");
    setTimeout(() => {
      setIsAiGenerating(false);
      let text = '';
      if (templateType === 'caption') {
        text = "Nostalgia hitting hard today! Looking back at our school days at RKM Vidyapith Deoghar, the assemblies, class pranks, and spiritual sessions under the mango tree. Proud to be an alumnus! #RKMVDeoghar #SchoolDays #Nostalgia";
      } else if (templateType === 'story') {
        text = "Remembering the guidance of Swami Brahmananda-ji in the year 2015. His lectures on values, discipline, and character building shaped who I am today. Here's a short story of how one simple lesson on truthfulness changed my career trajectory... #VidyapithStories #LifeLessons";
      } else if (templateType === 'idea') {
        text = "Quick shoutout to the Class of 2016! Where is everyone settled now? Let's trace our batchmates. Comment down your current city and profession, let's plan a virtual meetup this weekend! #ClassOf2016 #Reconnect";
      } else if (templateType === 'reunion') {
        text = "📢 Vidyapith Reunion Invite! Let's get together, catch up on old times, and share memories. Date: Oct 18, 2026. Venue: San Francisco Cafe. RSVP here! #Reunion2026 #RKMVAlumni";
      } else if (templateType === 'event') {
        text = "Join us for the Vidyapith Alumni Mentorship & Networking Meetup. An opportunity for young graduates and current students to connect with senior alumni in Tech, Medicine, and Public Services. #Mentorship #AlumniMeet";
      } else if (templateType === 'announcement') {
        text = "🚨 URGENT ANNOUNCEMENT: Swami Asangananda-ji Memorial and Prayer Meeting. We request all alumni to join the prayer service in memory of our beloved teacher. Venue: Temple Hall & Zoom. #Announcements #VidyapithCommunity";
      }
      setNewPostText(text);
      showToast("Draft generated by Memory Assistant!", "success");
    }, 1500);
  };

  // AI Simulation Assistant Helper (compatibility wrapper)
  const handleAiAssist = async (action: string) => {
    if (action === 'hashtags') {
      setNewPostText(prev => prev + `\n\n#ClassOf${currentUser.batch_year} #VidyapithAlumni #SchoolMemories #Reconnect`);
      showToast("Alumni tags appended!", "success");
    } else {
      handleMemoryAssistantClick(action);
    }
  };

  const appendSuggestion = (textToAppend: string) => {
    setNewPostText(prev => {
      const space = prev.endsWith(' ') || prev === '' ? '' : ' ';
      return prev + space + textToAppend;
    });
    if (composerTextareaRef.current) {
      composerTextareaRef.current.focus();
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) {
      showToast("Post content or description cannot be empty!", "danger");
      return;
    }

    // Serialized nostalgic metadata to append as the last element of mediaUrls
    const nostalgicObj = {
      tagClassmates: tagClassmates.trim(),
      targetBatchYear: targetBatchYear.trim(),
      isReunionPost,
      nostalgicPhotoUrl: nostalgicPhotoUrl.trim(),
      memoryLocation: memoryLocation.trim()
    };
    const serializedNostalgic = JSON.stringify(nostalgicObj);

    let mediaUrls: string[] = [];
    let finalPostType: string = 'text';

    if (postMediaType === 'photo') {
      if (mediaImages.length === 0 && !nostalgicPhotoUrl.trim()) {
        showToast("Please attach or upload at least one memory image URL!", "danger");
        return;
      }
      const allPics = mediaImages.length > 0 ? mediaImages : [nostalgicPhotoUrl.trim()];
      mediaUrls = [...allPics, memoryTags, memoryLocation, serializedNostalgic];
      finalPostType = 'photo';
    } else if (postMediaType === 'video') {
      if (!newPostVideoUrl.trim()) {
        showToast("Please provide a video or YouTube URL!", "danger");
        return;
      }
      mediaUrls = [newPostVideoUrl.trim(), serializedNostalgic];
      finalPostType = 'video';
    } else if (postMediaType === 'achievement') {
      if (!achievementTitle.trim()) {
        showToast("Please provide an achievement title!", "danger");
        return;
      }
      mediaUrls = [achievementTitle.trim(), achievementBadge, serializedNostalgic];
      finalPostType = 'achievement';
    } else if (postMediaType === 'career') {
      if (!careerTitle.trim() || !careerCompany.trim()) {
        showToast("Please specify job title and company!", "danger");
        return;
      }
      mediaUrls = [careerTitle.trim(), careerCompany.trim(), careerLocation.trim(), careerReferral ? 'yes' : 'no', serializedNostalgic];
      finalPostType = 'career';
    } else if (postMediaType === 'mentorship') {
      if (!mentorshipOffer.trim()) {
        showToast("Please detail what mentorship you are offering!", "danger");
        return;
      }
      mediaUrls = [mentorshipExpertise, mentorshipOffer.trim(), serializedNostalgic];
      finalPostType = 'mentorship';
    } else if (postMediaType === 'event') {
      if (!eventTitle.trim() || !eventDateStr.trim()) {
        showToast("Please specify event title and date!", "danger");
        return;
      }
      mediaUrls = [eventTitle.trim(), eventDateStr, eventLocationStr.trim(), serializedNostalgic];
      finalPostType = 'event';
    } else if (postMediaType === 'story') {
      if (!storyTeacher.trim()) {
        showToast("Please name the teacher or hostel guide in the story!", "danger");
        return;
      }
      mediaUrls = [storyTeacher.trim(), storyYear, serializedNostalgic];
      finalPostType = 'story';
    } else if (postMediaType === 'announcement') {
      mediaUrls = [announcementUrgency, serializedNostalgic];
      finalPostType = 'announcement';
    } else if (postMediaType === 'spotlight') {
      if (!spotlightName.trim() || !spotlightAchievement.trim()) {
        showToast("Please specify the spotlight alumnus name and achievement!", "danger");
        return;
      }
      mediaUrls = [spotlightName.trim(), spotlightBatch.trim(), spotlightAchievement.trim(), serializedNostalgic];
      finalPostType = 'spotlight';
    } else if (postMediaType === 'tribute') {
      if (!tributePerson.trim()) {
        showToast("Please specify the person name for the tribute!", "danger");
        return;
      }
      mediaUrls = [tributePerson.trim(), tributeRole.trim(), serializedNostalgic];
      finalPostType = 'tribute';
    } else {
      mediaUrls = [serializedNostalgic];
      finalPostType = 'text';
    }

    try {
      await apiFetch('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: newPostText.trim(),
          mediaUrls,
          postType: finalPostType,
          groupId: postToGroup
        })
      });
      showToast("Post shared successfully with the alumni community!", "success");

      // Reset all composer states
      setNewPostText('');
      setPostMediaType('text');
      setMediaImages([]);
      setNewPostVideoUrl('');
      setAchievementTitle('');
      setAchievementBadge('School Ambassador');
      setCareerTitle('');
      setCareerCompany('');
      setCareerLocation('');
      setCareerReferral(true);
      setMentorshipOffer('');
      setEventTitle('');
      setEventDateStr('');
      setEventLocationStr('');
      setStoryTeacher('');
      setStoryYear('2015');
      setSpotlightName('');
      setSpotlightBatch('');
      setSpotlightAchievement('');
      setTributePerson('');
      setTributeRole('');
      setTagClassmates('');
      setTargetBatchYear('');
      setIsReunionPost(false);
      setNostalgicPhotoUrl('');
      setShowNostalgiaPanel(false);
      setPostToGroup('grp-all');
      
      loadFeed();
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/directory/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          bio: settingsBio,
          profession_category: settingsProfession,
          company: settingsCompany,
          city: settingsCity,
          country: settingsCountry,
          profile_photo: settingsPhotoUrl,
          show_email: settingsShowEmail,
          show_mobile: settingsShowMobile
        })
      });
      showToast("Profile settings updated successfully!", "success");
      // Force refresh auth status or profile reload
      if (forceProfileId) {
        loadProfile(forceProfileId);
      }
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await apiFetch(`/posts/${postId}/like`, { method: 'POST' });
      loadFeed();
      if (screenMode === 'profile' && forceProfileId) {
        loadProfile(forceProfileId);
      }
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const toggleBookmark = (postId: string) => {
    const updated = bookmarks.includes(postId)
      ? bookmarks.filter(id => id !== postId)
      : [...bookmarks, postId];
    setBookmarks(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rkmv_bookmarked_posts', JSON.stringify(updated));
    }
    showToast(
      bookmarks.includes(postId) 
        ? "Post removed from Saved" 
        : "Post saved to your Collection!", 
      "success"
    );
  };

  const handleCopyLink = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(link);
    showToast("Shareable link copied to clipboard!", "success");
    setActiveOptionsPostId(null);
  };

  const handleDoubleLike = async (postId: string, isAlreadyLiked: boolean) => {
    setLikedAnimationPostId(prev => ({ ...prev, [postId]: true }));
    setTimeout(() => {
      setLikedAnimationPostId(prev => ({ ...prev, [postId]: false }));
    }, 750);

    if (!isAlreadyLiked) {
      await handleLike(postId);
    }
  };

  const toggleOptionsMenu = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveOptionsPostId(prev => prev === postId ? null : postId);
  };

  const toggleEmojiTray = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveEmojiPostId(prev => prev === postId ? null : postId);
  };

  const handleEmojiClick = (postId: string, emoji: string) => {
    setCommentInputs(prev => ({
      ...prev,
      [postId]: (prev[postId] || '') + emoji
    }));
    setActiveEmojiPostId(null);
  };

  const toggleCaption = (postId: string) => {
    setExpandedCaptions(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCommentChange = (postId: string, val: string) => {
    setCommentInputs(prev => ({ ...prev, [postId]: val }));
  };

  const handleCreateComment = async (postId: string, e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const commentText = commentInputs[postId];
    if (!commentText || !commentText.trim()) return;

    try {
      await apiFetch(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText.trim() })
      });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      loadFeed();
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const formatTimeAgo = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getDomainName = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch (e) {
      return 'external link';
    }
  };

  // Compile / Run code mock simulation
  const handleRunCode = (postId: string, code: string, lang: string) => {
    setSimulatedConsoleOutput(prev => ({
      ...prev,
      [postId]: `Compiling on Vidyapith Node Server...\nRunning ${lang} sandbox compiler...\n\n[STDOUT]\nSolving test cases...\nTest Case 1 Passed (Time: 4ms)\nTest Case 2 Passed (Time: 8ms)\n\n🚀 Program executed successfully with exit status 0.`
    }));
  };

  // Multiple Image Composer helpers
  const handleAddImageToComposer = () => {
    if (tempImageInput.trim()) {
      setMediaImages(prev => [...prev, tempImageInput.trim()]);
      setTempImageInput('');
    }
  };

  const handleRemoveImageFromComposer = (idx: number) => {
    setMediaImages(prev => prev.filter((_, i) => i !== idx));
  };

  // Filter posts based on screen mode and search
  const filteredPosts = posts.filter(post => {
    // Mode-level prefilters
    if (screenMode === 'notes') {
      if (post.post_type !== 'notes' && post.post_type !== 'article') return false;
    } else if (screenMode === 'reels') {
      if (post.post_type !== 'video') return false;
    } else if (screenMode === 'pyqs') {
      if (post.post_type !== 'notes' && !post.content.toLowerCase().includes('pyq')) return false;
    } else if (screenMode === 'resources') {
      if (post.post_type !== 'link') return false;
    } else if (screenMode === 'placements') {
      if (post.post_type !== 'placement') return false;
    } else if (screenMode === 'saved') {
      if (!bookmarks.includes(post.id)) return false;
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (post.content || '').toLowerCase().includes(q) ||
                        (post.post_type || '').toLowerCase().includes(q);
      if (!matchText) return false;
    }

    // Chip match
    if (filterChip !== 'All') {
      if (filterChip === 'My Batch') {
        const authorBatch = (post as any).author?.batch_year || (post as any).author_batch_year;
        if (authorBatch !== currentUser?.batch_year) return false;
      } else if (filterChip === 'Memories') {
        const isMemory = post.post_type === 'photo' || post.post_type === 'story' || post.content.toLowerCase().includes('memory') || post.content.toLowerCase().includes('nostalg');
        if (!isMemory) return false;
      } else if (filterChip === 'Achievements') {
        const isAchievement = post.post_type === 'achievement' || post.content.toLowerCase().includes('achieve') || post.content.toLowerCase().includes('proud');
        if (!isAchievement) return false;
      } else if (filterChip === 'Career Updates') {
        const isCareer = post.post_type === 'career' || post.content.toLowerCase().includes('career') || post.content.toLowerCase().includes('hiring') || post.content.toLowerCase().includes('job') || post.content.toLowerCase().includes('promotion');
        if (!isCareer) return false;
      } else if (filterChip === 'Reunions') {
        const isReunion = post.post_type === 'event' || post.content.toLowerCase().includes('reunion') || post.content.toLowerCase().includes('meetup');
        if (!isReunion) return false;
      } else if (filterChip === 'Mentorship') {
        const isMentorship = post.post_type === 'mentorship' || post.content.toLowerCase().includes('mentor') || post.content.toLowerCase().includes('guidance');
        if (!isMentorship) return false;
      } else if (filterChip === 'Business') {
        const isBusiness = post.content.toLowerCase().includes('business') || post.content.toLowerCase().includes('startup') || post.content.toLowerCase().includes('venture') || post.content.toLowerCase().includes('co-founder');
        if (!isBusiness) return false;
      } else if (filterChip === 'Events') {
        const isEvent = post.post_type === 'event' || post.content.toLowerCase().includes('event') || post.content.toLowerCase().includes('meetup');
        if (!isEvent) return false;
      } else if (filterChip === 'School Stories') {
        const isStory = post.post_type === 'story' || post.content.toLowerCase().includes('story') || post.content.toLowerCase().includes('teacher') || post.content.toLowerCase().includes('classmaster');
        if (!isStory) return false;
      } else if (filterChip === 'Announcements') {
        const isAnnouncement = post.post_type === 'announcement' || post.content.toLowerCase().includes('announc');
        if (!isAnnouncement) return false;
      } else {
        const chipLower = filterChip.toLowerCase();
        const matchSubject = post.content.toLowerCase().includes(chipLower) ||
                             (post.media_urls && post.media_urls.join(' ').toLowerCase().includes(chipLower));
        if (!matchSubject) return false;
      }
    }

    return true;
  });

  // Slide Deck indexing helper
  const handleSlideChange = (postId: string, direction: 'next' | 'prev', totalSlides: number) => {
    const currentIndex = carouselActiveIndexes[postId] || 0;
    let nextIndex = currentIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % totalSlides;
    } else {
      nextIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    }
    setCarouselActiveIndexes(prev => ({ ...prev, [postId]: nextIndex }));
  };

  const spotlightPeople = [
    { name: 'Dr. Marcus Adeyemi', batch: '1998', role: 'Chief Innovation Officer, NovaTech Global', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&h=520&fit=crop&q=80', story: 'The values I learned within these century-old halls shaped every breakthrough I have led.' },
    { name: 'Sophia Patel', batch: '2005', role: 'UN Goodwill Ambassador for Education', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=180&h=180&fit=crop&q=80', story: 'Appointed UN Goodwill Ambassador for Education.' },
    { name: 'Diego Morales', batch: '2011', role: 'Founder, Fintech Startup', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=180&h=180&fit=crop&q=80', story: 'Founded a unicorn fintech startup in Latin America.' },
    { name: 'Dr. Elena Wong', batch: '1992', role: 'Cancer Researcher', image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=180&h=180&fit=crop&q=80', story: 'Pioneered breakthrough cancer immunotherapy research.' },
    { name: 'Boris Kovac', batch: '2014', role: 'Documentary Filmmaker', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=180&h=180&fit=crop&q=80', story: 'National award-winning documentary filmmaker.' },
    { name: 'Dr. Amara Tesfaye', batch: '2001', role: 'Healthcare Leader', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=180&h=180&fit=crop&q=80', story: 'Leading rural healthcare access across the region.' }
  ];

  const mockMemories = [
    { name: 'Meera Iyer', batch: '2005', image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=520&h=700&fit=crop&q=80', text: 'Late nights at the old library before finals - we practically lived here!', likes: 128, comments: 24 },
    { name: 'Ananya Roy', batch: '2010', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=520&h=520&fit=crop&q=80', text: 'Annual reunion picnic 2024 - some friendships never fade.', likes: 212, comments: 41 },
    { name: 'Nisha Patel', batch: '2015', image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=520&h=760&fit=crop&q=80', text: 'Graduation day - throwing those caps will never get old!', likes: 405, comments: 72 },
    { name: 'Sameer Khan', batch: '1985', image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=520&h=760&fit=crop&q=80', text: 'Our old chemistry lab - found this gem in the archives!', likes: 97, comments: 19 }
  ];

  if (screenMode === 'feed') {
    const firstPost = filteredPosts[0];
    const firstAuthor = (firstPost as any)?.author || currentUser;
    const secondPost = filteredPosts[1];
    const secondAuthor = (secondPost as any)?.author || currentUser;

    return (
      <div className="ig-feed-layout">
        {/* Center: post composer + feed */}
        <main className="ig-feed-main">
          <form className="feed-composer-card" onSubmit={handleCreatePost}>
            <div>
              <img src={currentUser.profile_photo} alt={currentUser.full_name} />
              <input value={newPostText} onChange={(event) => setNewPostText(event.target.value)} placeholder="Share a memory, update, or milestone..." />
            </div>
            <footer>
              <button type="button" onClick={() => setPostMediaType('photo')}><Image size={20} /> Photo</button>
              <button type="button" onClick={() => setPostToGroup(`grp-${currentUser.batch_year}`)}><Tag size={20} /> Tag Batch</button>
              <button type="submit"><Send size={20} /> Post</button>
            </footer>
          </form>

          {[firstPost, secondPost].filter(Boolean).map((post: any, index) => {
            const author = index === 0 ? firstAuthor : secondAuthor;
            const imageUrl = post.media_urls?.[0] && post.media_urls[0].startsWith('http')
              ? post.media_urls[0]
              : index === 0
                ? 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=900&h=520&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=900&h=520&fit=crop&q=80';
            return (
              <article key={post.id} className="feed-story-card">
                <header>
                  <img src={author.profile_photo} alt={author.full_name} onClick={() => onViewProfile(author.id)} />
                  <div><h3>{author.full_name}</h3><p>{formatTimeAgo(post.created_at)} · Class of {author.batch_year}</p></div>
                  <MoreHorizontal size={24} />
                </header>
                <p>{post.content || (index === 0 ? 'Just walked back into the old assembly hall after years - and it still feels exactly the same.' : 'Proud milestone to share with my school family.')}</p>
                {index === 0 ? <img className="story-media" src={imageUrl} alt="memory" /> : <div className="milestone-box"><Award size={32} /><strong>Career Milestone</strong><span>Published Author · 2026</span></div>}
                <footer>
                  <button onClick={() => handleLike(post.id)}><Heart size={22} /> {(post.likes || []).length || (index === 0 ? 124 : 89)}</button>
                  <button><MessageCircle size={22} /> {((post as any).comments || []).length || (index === 0 ? 38 : 21)}</button>
                  <button><Share2 size={22} /> Share</button>
                </footer>
              </article>
            );
          })}
        </main>

        {/* Right panel */}
        <aside className="ig-feed-right">
          <section className="heritage-widget reunion-widget">
            <h3><Calendar size={18} /> Upcoming Reunions</h3>
            {['Centenary Grand Gala', 'Batch 2012 Meetup', "Founders' Day Sports Meet"].map((title, index) => (
              <div key={title} style={{ marginBottom: '14px' }}>
                <strong style={{ fontSize: '0.88rem' }}>{title}</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--heritage-muted)', margin: '2px 0 6px' }}>
                  {index === 0 ? 'Dec 14, 2026 · 6:00 PM' : index === 1 ? 'Jan 20, 2027 · 4:00 PM' : 'Feb 08, 2027 · 9:00 AM'}
                </p>
                <button onClick={() => showToast(`RSVP noted for ${title}.`, 'success')} style={{ fontSize: '0.78rem', padding: '4px 12px' }}>RSVP</button>
              </div>
            ))}
          </section>
          <section className="spotlight-widget" style={{ marginTop: '20px' }}>
            <h3><Star size={18} /> Alumni Spotlight</h3>
            <img src="https://images.unsplash.com/photo-1556157382-97eda2d62296?w=220&h=220&fit=crop&q=80" alt="Dr. Edward Whitman" />
            <h2>Dr. Edward Whitman</h2>
            <span>Class of 1968</span>
            <p>A pioneering neurosurgeon and recipient of national honors.</p>
            <button onClick={() => showToast('Opening full spotlight story.', 'info')}>Read More ›</button>
          </section>
        </aside>
      </div>
    );
  }


  if (screenMode === 'discover') {
    return (
      <div className="heritage-page spotlight-redesign">
        <main>
          <div className="spotlight-heading">
            <div><h1>Alumni Spotlight</h1><p>Celebrating the achievements of our community</p></div>
            <span><Star size={17} /> Featured</span>
          </div>
          <section className="featured-spotlight">
            <div style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.72)), url(${spotlightPeople[0].image})` }}>
              <span>Alumnus of the Month</span>
              <h2>{spotlightPeople[0].name}</h2>
              <p>Class of {spotlightPeople[0].batch} · {spotlightPeople[0].role}</p>
            </div>
            <blockquote>"{spotlightPeople[0].story} This school taught me that legacy is built one bold idea at a time."</blockquote>
            <footer><p><span>Awards</span><strong>12 Global Honors</strong></p><p><span>Patents</span><strong>34 Filed</strong></p><button><BookOpen size={20} /> Read Full Story</button></footer>
          </section>
          <div className="spotlight-grid-head"><h2>More Spotlights</h2><button>View all <span aria-hidden="true">›</span></button></div>
          <section className="spotlight-card-grid">
            {spotlightPeople.slice(1).map(person => (
              <article key={person.name}>
                <img src={person.image} alt={person.name} />
                <h3>{person.name}</h3>
                <span>Batch of {person.batch}</span>
                <p>{person.story}</p>
                <button onClick={() => showToast(`Viewing ${person.name}'s profile.`, 'info')}>View Profile <span aria-hidden="true">›</span></button>
              </article>
            ))}
          </section>
          <section className="nominate-band">
            <Award size={38} />
            <div><h2>Know an inspiring alumnus?</h2><p>Nominate a fellow graduate to be featured in our next spotlight.</p></div>
            <button onClick={() => showToast('Nomination form opened.', 'info')}><UserPlus size={20} /> Nominate an Alumnus</button>
          </section>
        </main>
        <aside className="notifications-panel">
          <h2><Bell size={22} /> Notifications <span>7 new</span></h2>
          {['Sophia Patel sent you a connection request.', 'Diego Morales and 12 others liked your post.', 'Dr. Amara Tesfaye commented: Great to reconnect after all these years!', 'Reminder: The Centennial Gala Reunion starts in 2 days.', 'Batch of 1998 group has 8 new posts today.'].map((item, index) => (
            <p key={item}><strong>{item.split(' ')[0]} {item.split(' ')[1]}</strong>{item.replace(`${item.split(' ')[0]} ${item.split(' ')[1]}`, '')}<small>{index + 1}h ago</small></p>
          ))}
          <button>View all notifications</button>
        </aside>
      </div>
    );
  }

  if (screenMode === 'batch' || screenMode === 'memories') {
    return (
      <div className="heritage-page batch-redesign">
        <aside>
          <section className="your-batch-card">
            <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=520&h=300&fit=crop&q=80" alt="Your batch" />
            <div><span>Your Batch</span><h2>Class of {currentUser.batch_year}</h2></div>
            <p><Users size={18} /> 186 members</p>
            <div><Calendar size={18} /><strong>20-Year Gala</strong><small>Dec 14, 2026 · Main Hall</small></div>
            <h3>Batchmates</h3>
            {['Arjun Mehta', 'Priya Sharma', 'Rohan Das'].map((name, index) => <p key={name}><img src={`https://images.unsplash.com/photo-${index === 0 ? '1500648767791-00dcc994a43e' : index === 1 ? '1494790108377-be9c29b29330' : '1506794778202-cad84cf45f1d'}?w=60&h=60&fit=crop&q=80`} alt={name} /> {name}</p>)}
          </section>
          <section className="heritage-widget"><h3><Sparkles size={18} /> Batch Stats</h3><p>Memories shared <strong>412</strong></p><p>Active this week <strong>57</strong></p></section>
        </aside>

        <main>
          <section className="batch-carousel-section">
            <div><h1>Explore Your Batch</h1><p>Connect with alumni from every graduating class</p></div>
            <button>View all <span aria-hidden="true">›</span></button>
            <div className="batch-class-row">
              {[1980, 1990, 2000, 2005].map((year, index) => (
                <article key={year}>
                  <img src={['https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=420&h=210&fit=crop&q=80', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=420&h=210&fit=crop&q=80', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=420&h=210&fit=crop&q=80', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=420&h=210&fit=crop&q=80'][index]} alt={`Class of ${year}`} />
                  <h2>Class of {year}</h2>
                  <p><Users size={16} /> {[94, 138, 205, 186][index]} members</p>
                  <button onClick={() => showToast(`Opened Class of ${year}.`, 'info')}>Join / View</button>
                </article>
              ))}
            </div>
          </section>

          <section className="memory-lane-section">
            <div className="memory-head"><div><h1>Memory Lane</h1><p>Cherished moments shared by our alumni community</p></div><div><button>All</button><button>Photos</button><button>Stories</button></div></div>
            <div className="memory-masonry">
              {mockMemories.map((memory, index) => (
                <article key={memory.name} className={index === 0 || index === 2 ? 'tall' : ''} onClick={() => setActiveMemoryLightbox({ media_urls: [memory.image], content: memory.text, author: { full_name: memory.name, batch_year: memory.batch, profile_photo: currentUser.profile_photo }, comments: [] })}>
                  <img src={memory.image} alt={memory.text} />
                  <div><strong>{memory.name}</strong><span>Class of {memory.batch}</span><p>{memory.text}</p><small><Heart size={18} /> {memory.likes} <MessageCircle size={18} /> {memory.comments}</small></div>
                </article>
              ))}
              <article className="quote-memory"><Quote size={30} /><strong>Class of 1978</strong><p>100 years of legacy, and every batch carries a piece of it forward.</p><span>- Harish Kumar, Alumni President</span></article>
            </div>
          </section>
        </main>
        <button className="share-memory-fab" onClick={() => { setPostMediaType('photo'); showToast('Photo memory composer is ready on Home.', 'info'); }}><Image size={22} /> Share a Memory</button>
      </div>
    );
  }

  if (screenMode === 'profile' && profileUser) {
    const person = profileUser.profile || profileUser;
    return (
      <div className="heritage-page profile-redesign">
        <section className="profile-cover-hero">
          <img src="https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1500&h=380&fit=crop&q=80" alt="Campus" />
        </section>
        <section className="profile-head-card">
          <img src={person.profile_photo || currentUser.profile_photo} alt={person.full_name} />
          <div><h1>{person.full_name || currentUser.full_name}</h1><p><Briefcase size={17} /> {person.profession || currentUser.profession} <MapPin size={17} /> {person.city || currentUser.city}, {person.country || currentUser.country}</p></div>
          <span>Class of {person.batch_year || currentUser.batch_year}</span>
          <button><UserPlus size={18} /> Connect</button><button><MessageCircle size={18} /> Message</button><button><Plus size={18} /> Follow</button>
        </section>
        <nav className="profile-tabs"><button>Posts</button><button className="active">About</button><button>Batch Mates</button><button>Photos</button><button>Memories</button></nav>
        <div className="profile-content-grid">
          <aside>
            <section className="heritage-widget about-card">
              <h2>About</h2><p>Alumni profile details</p>
              {[['Education', 'Heritage High School', `Attended 1991 - ${person.batch_year || currentUser.batch_year}`], ['Current Work', person.profession || currentUser.profession, `${person.company || currentUser.company} · Since 2014`], ['Location', `${person.city || currentUser.city}, ${person.country || currentUser.country}`, '']].map(([label, value, meta]) => (
                <div key={label}><BookOpen size={22} /><p><span>{label}</span><strong>{value}</strong><small>{meta}</small></p></div>
              ))}
            </section>
            <section className="heritage-widget social-card"><h2>Social Links</h2><p>linkedin.com/in/rajatmehra</p><p>rajatmehra.design</p><p>@rajat.builds</p></section>
          </aside>
          <main>
            {profilePosts.slice(0, 3).concat(profilePosts.length ? [] : posts.slice(0, 2)).map((post: any, index) => (
              <article key={post.id || index} className="profile-post-card">
                <header><img src={person.profile_photo || currentUser.profile_photo} alt={person.full_name} /><div><h3>{person.full_name || currentUser.full_name}</h3><p>{post.created_at ? formatTimeAgo(post.created_at) : '2 hours ago'} · Class of {person.batch_year || currentUser.batch_year}</p></div></header>
                <p>{post.content || "Wonderful catching up with the batch at the centenary reunion this weekend. The bonds still feel like yesterday."}</p>
                <img src={post.media_urls?.[0] || (index === 0 ? 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&h=520&fit=crop&q=80' : 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&h=520&fit=crop&q=80')} alt="Profile post" />
                <footer><span><Heart size={19} /> {(post.likes || []).length || 128}</span><span><MessageSquare size={19} /> 34 Comments</span><span><Share2 size={19} /> Share</span></footer>
              </article>
            ))}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="forums-layout">
      {/* Feed Column / Left Section */}
      <div className="forums-feed-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Top Sticky Feed Search & Filter Bar */}
        {(screenMode === 'feed' || screenMode === 'explore' || screenMode === 'notes' || screenMode === 'resources' || screenMode === 'placements') && (
          <div className="glass-panel" style={{ padding: '16px 20px', position: 'sticky', top: '0', zIndex: '90', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="header-search-bar" style={{ width: '100%', maxWidth: 'none' }}>
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Search alumni, classmates, batches, memories, reunions, careers, and events..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            
            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {['All', 'My Batch', 'Memories', 'Achievements', 'Career Updates', 'Reunions', 'Mentorship', 'Business', 'Events', 'School Stories', 'Announcements'].map(chip => (
                <button
                  key={chip}
                  onClick={() => setFilterChip(chip)}
                  style={{
                    background: filterChip === chip ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid ' + (filterChip === chip ? 'var(--primary-color)' : 'var(--border-color)'),
                    color: filterChip === chip ? 'white' : 'var(--text-secondary)',
                    borderRadius: '30px', padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* -------------------- PROFILE SCREEN MODE -------------------- */}
        {screenMode === 'profile' && profileUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Instagram-style cover card */}
            <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
              <div style={{ 
                height: '140px', 
                background: `linear-gradient(135deg, var(--secondary-color) 0%, var(--primary-color) 100%)`,
                position: 'relative' 
              }}>
                <div style={{ position: 'absolute', bottom: '-40px', left: '32px' }} className="post-avatar-ring">
                  <img 
                    src={profileUser.profile?.profile_photo || profileUser.profile_photo} 
                    alt="avatar" 
                    style={{ width: '84px', height: '84px', borderRadius: '50%', border: '4px solid var(--bg-dark)', objectFit: 'cover' }}
                  />
                </div>
              </div>

              <div style={{ padding: '54px 32px 24px 32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{profileUser.profile?.full_name || profileUser.full_name}</h2>
                    <p style={{ color: 'var(--accent-gold)', fontSize: '0.88rem', fontWeight: 600, marginTop: '4px' }}>
                      Batch of {profileUser.profile?.batch_year || 2008} • {profileUser.profile?.house || "Vivekananda House"}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
                      {profileUser.profile?.profession_category || profileUser.profession} at {profileUser.profile?.company || profileUser.company}
                    </p>
                  </div>

                  <span className="badge badge-role" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    {profileUser.role}
                  </span>
                </div>

                <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <h4 style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>Alumni Bio & Scholastic Memories</h4>
                  <p style={{ lineHeight: 1.5 }}>{profileUser.profile?.bio || profileUser.bio || "No biography added yet. Update via Settings."}</p>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '32px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{profilePosts.length}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Posts Published</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>142</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Followers</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>890</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Learning Points</span>
                  </div>
                </div>

                {/* Achievements row */}
                <div style={{ marginTop: '16px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Earned Badges</span>
                  <div className="gamified-badges-row">
                    <div className="gamified-badge-item"><span className="gamified-badge-icon">🔥</span> Consistency Master</div>
                    <div className="gamified-badge-item"><span className="gamified-badge-icon">🎓</span> Top Mentor</div>
                    <div className="gamified-badge-item"><span className="gamified-badge-icon">💻</span> DSA Expert</div>
                    <div className="gamified-badge-item"><span className="gamified-badge-icon">🏅</span> 30-Day Streak</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Grid Tabs */}
            <div className="glass-panel" style={{ padding: '8px' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                {(['posts', 'notes', 'reels', 'saved'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setProfileTab(tab)}
                    style={{
                      flex: 1, padding: '12px', background: 'none', border: 'none', color: profileTab === tab ? 'var(--primary-color)' : 'var(--text-secondary)',
                      fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', borderBottom: profileTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                      transition: 'all 0.2s ease', textTransform: 'capitalize'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div style={{ padding: '16px 8px' }}>
                {profilePosts.filter(p => {
                  if (profileTab === 'notes') return p.post_type === 'notes';
                  if (profileTab === 'reels') return p.post_type === 'video';
                  return true;
                }).length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px' }}>No items found in this category.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Render profile items */}
                    {profilePosts.map(p => (
                      <div key={p.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 700 }}>{p.post_type} post</span>
                        <p style={{ margin: '8px 0', fontSize: '0.88rem' }}>{p.content}</p>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{formatTimeAgo(p.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- SETTINGS SCREEN MODE -------------------- */}
        {screenMode === 'settings' && (
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', color: 'white', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Profile & Visibility Settings</h3>
            
            <form onSubmit={handleUpdateSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Profile Image URL</label>
                <input type="text" value={settingsPhotoUrl} onChange={(e) => setSettingsPhotoUrl(e.target.value)} style={{ padding: '10px 14px', width: '100%' }} />
              </div>

              <div className="form-group">
                <label>Alumni Biography</label>
                <textarea rows={3} value={settingsBio} onChange={(e) => setSettingsBio(e.target.value)} style={{ padding: '10px 14px', width: '100%' }} />
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Current Designation</label>
                  <input type="text" value={settingsProfession} onChange={(e) => setSettingsProfession(e.target.value)} style={{ padding: '10px 14px', width: '100%' }} />
                </div>
                <div className="form-group">
                  <label>Company Name</label>
                  <input type="text" value={settingsCompany} onChange={(e) => setSettingsCompany(e.target.value)} style={{ padding: '10px 14px', width: '100%' }} />
                </div>
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>City Location</label>
                  <input type="text" value={settingsCity} onChange={(e) => setSettingsCity(e.target.value)} style={{ padding: '10px 14px', width: '100%' }} />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input type="text" value={settingsCountry} onChange={(e) => setSettingsCountry(e.target.value)} style={{ padding: '10px 14px', width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, textTransform: 'none' }}>
                  <input type="checkbox" checked={settingsShowEmail} onChange={(e) => setSettingsShowEmail(e.target.checked)} />
                  <span>Show Email to approved Alumni</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, textTransform: 'none' }}>
                  <input type="checkbox" checked={settingsShowMobile} onChange={(e) => setSettingsShowMobile(e.target.checked)} />
                  <span>Show Mobile to classmates</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '10px 24px' }}>
                Update Info
              </button>
            </form>
          </div>
        )}

        {/* -------------------- FEED COMPOSER (Home / Notes / Resources Views) -------------------- */}
        {(screenMode === 'feed' || screenMode === 'batch') && (
          <div className="glass-panel post-composer" style={{ padding: '24px', borderRadius: '20px', background: 'rgba(13, 35, 69, 0.75)', backdropFilter: 'blur(16px)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Title, Subtitle, and Top Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-title)', color: 'white', letterSpacing: '-0.02em' }}>
                  Share with the Alumni Community
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Memory Assistant Trigger (relative for absolute dropdown positioning) */}
                  <div style={{ position: 'relative' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowMemoryAssistantMenu(!showMemoryAssistantMenu)}
                      className="ai-badge" 
                      style={{ 
                        background: 'rgba(255, 122, 26, 0.1)', 
                        color: 'var(--primary-color)', 
                        border: '1px solid rgba(255, 122, 26, 0.2)', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        cursor: 'pointer', 
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.18)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.1)'}
                    >
                      <Sparkles size={11} /> Memory Assistant <ChevronDown size={10} />
                    </button>
                    
                    {showMemoryAssistantMenu && (
                      <div style={{ position: 'absolute', right: 0, top: '28px', background: 'rgba(8, 26, 54, 0.95)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', width: '220px', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Select Template Prompt</div>
                        <button type="button" onClick={() => handleMemoryAssistantClick('caption')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>✨ Suggest Nostalgic Caption</button>
                        <button type="button" onClick={() => handleMemoryAssistantClick('story')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>✍️ Improve School Story</button>
                        <button type="button" onClick={() => handleMemoryAssistantClick('idea')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>💡 Generate Post Idea</button>
                        <button type="button" onClick={() => handleMemoryAssistantClick('reunion')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>✉️ Draft Reunion Invitation</button>
                        <button type="button" onClick={() => handleMemoryAssistantClick('event')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>📅 Generate Event Desc</button>
                        <button type="button" onClick={() => handleMemoryAssistantClick('announcement')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>📢 Polishing Announcement</button>
                      </div>
                    )}
                  </div>
                  
                  {/* Visibility Select */}
                  <select 
                    className="visibility-select"
                    value={postVisibility}
                    onChange={(e) => setPostVisibility(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', padding: '4px 8px', fontSize: '0.74rem' }}
                  >
                    <option value="Public">🌍 Public Alumni Network</option>
                    <option value="Batch Only">👥 My Batch Only</option>
                    <option value="School Community">🏫 School Community</option>
                    <option value="Mentors Only">🤝 Mentors Only</option>
                    <option value="Alumni Committee">🛡️ Alumni Committee</option>
                    <option value="Private Draft">📝 Private Draft</option>
                  </select>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Reconnect, share memories, celebrate achievements, and stay connected with fellow alumni.
              </p>
            </div>

            {/* Profile Row */}
            <div className="composer-profile-box" style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '0 4px' }}>
              <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                <div className="post-avatar-ring" style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '2.5px solid #FF7A1A', boxShadow: '0 0 8px rgba(255, 122, 26, 0.3)' }}>
                  <img src={currentUser.profile_photo} alt="Avatar" className="post-author-avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'linear-gradient(135deg, #FF7A1A 0%, #FFC72C 100%)', color: 'white', border: '1.5px solid #081A36', borderRadius: '10px', padding: '1px 5px', fontSize: '0.62rem', fontWeight: 800, whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                  Class of {currentUser.batch_year}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.92rem' }}>{currentUser.full_name}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                  {currentUser.profession || 'Alumnus'} {currentUser.company ? `• ${currentUser.company}` : ''}
                </span>
              </div>
            </div>

            {/* Main Textarea Area */}
            <div className="composer-text-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <textarea 
                ref={composerTextareaRef}
                className="composer-text" 
                placeholder="What's new in your journey?&#10;&#10;Share a school memory, career milestone, life update, reunion moment, achievement, business venture, mentorship opportunity, or reconnect with old friends."
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                style={{ width: '100%', minHeight: '120px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 14px', color: 'white', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.5' }}
              />
              
              {/* Suggester Helper pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingLeft: '4px' }}>
                <button type="button" onClick={() => appendSuggestion('@' + (currentUser.full_name.split(' ')[0] || 'Alumni'))} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  👤 @Mention Alumni
                </button>
                <button type="button" onClick={() => appendSuggestion('#ClassOf' + currentUser.batch_year)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  👥 #BatchTag
                </button>
                <button type="button" onClick={() => appendSuggestion('#SchoolMemories')} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  🏫 #SchoolMemories
                </button>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Actions</span>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                <button type="button" onClick={() => { setPostMediaType('photo'); showToast("Memory photo mode active!", "info"); }} style={{ background: 'rgba(255, 122, 26, 0.08)', border: '1px solid rgba(255, 122, 26, 0.2)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.15)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.08)'}>
                  📸 Add School Memory
                </button>
                <button type="button" onClick={() => { setShowNostalgiaPanel(true); showToast("Targeting options expanded!", "info"); }} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}>
                  👥 Tag Batchmates
                </button>
                <button type="button" onClick={() => { setPostMediaType('event'); showToast("Reunion event creation active!", "info"); }} style={{ background: 'rgba(255, 122, 26, 0.08)', border: '1px solid rgba(255, 122, 26, 0.2)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.15)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.08)'}>
                  📅 Create Reunion
                </button>
                <button type="button" onClick={() => { setPostMediaType('achievement'); showToast("Achievement celebration active!", "info"); }} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}>
                  🎉 Celebrate Achievement
                </button>
                <button type="button" onClick={() => { setPostMediaType('mentorship'); showToast("Mentorship pairing active!", "info"); }} style={{ background: 'rgba(255, 122, 26, 0.08)', border: '1px solid rgba(255, 122, 26, 0.2)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.15)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.08)'}>
                  🤝 Offer Mentorship
                </button>
                <button type="button" onClick={() => { setPostMediaType('career'); showToast("Career milestone opportunity active!", "info"); }} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}>
                  💼 Share Opportunity
                </button>
              </div>
            </div>

            {/* Segmented Media Selector (Upgraded pills) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Post Category</span>
              <div className="composer-media-tabs" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'text', label: 'Update', icon: '📝' },
                  { id: 'photo', label: 'School Memory', icon: '📸' },
                  { id: 'video', label: 'Video Clip', icon: '🎥' },
                  { id: 'achievement', label: 'Achievement', icon: '🎉' },
                  { id: 'career', label: 'Career Update', icon: '💼' },
                  { id: 'mentorship', label: 'Mentorship', icon: '🤝' },
                  { id: 'event', label: 'Reunion Event', icon: '📅' },
                  { id: 'story', label: 'School Story', icon: '🏫' },
                  { id: 'announcement', label: 'Announcement', icon: '📢' },
                  { id: 'spotlight', label: 'Alumni Spotlight', icon: '💡' },
                  { id: 'tribute', label: 'Tribute Post', icon: '❤️' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    type="button"
                    className={`composer-media-tab-btn ${postMediaType === tab.id ? 'active' : ''}`}
                    onClick={() => setPostMediaType(tab.id as any)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '30px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
                      background: postMediaType === tab.id ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.04)',
                      border: '1px solid ' + (postMediaType === tab.id ? 'var(--primary-color)' : 'var(--border-color)'),
                      color: postMediaType === tab.id ? 'white' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{tab.icon} {tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Media Inputs */}
            {postMediaType === 'photo' && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Memory Photos (Drag & Drop or click below to upload)</span>
                
                {/* Drag and Drop Zone */}
                <div 
                  className={`drag-drop-zone ${dragOverActive ? 'active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverActive(true); }}
                  onDragLeave={() => setDragOverActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverActive(false);
                    const mockPics = [
                      'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&fit=crop&q=80'
                    ];
                    setMediaImages(prev => [...prev, mockPics[Math.floor(Math.random() * mockPics.length)]]);
                    showToast("Simulated drop: memory image uploaded successfully!", "success");
                  }}
                  onClick={() => {
                    const mockPics = [
                      'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1460518451285-cd7af74a2c16?w=600&fit=crop&q=80'
                    ];
                    setMediaImages(prev => [...prev, mockPics[Math.floor(Math.random() * mockPics.length)]]);
                    showToast("Photo added successfully!", "success");
                  }}
                  style={{
                    border: '2px dashed ' + (dragOverActive ? 'var(--primary-color)' : 'var(--border-color)'),
                    padding: '20px', borderRadius: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.15)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '1.6rem', display: 'block', marginBottom: '4px' }}>📤</span>
                  <span>Drag & Drop photos here, or click to add a school memory picture.</span>
                </div>

                {/* Crop & Reorder display */}
                {mediaImages.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--accent-gold)', fontWeight: 600 }}>Preview Carousel (Simulated Crop rectangle active):</span>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {mediaImages.map((imgUrl, i) => (
                        <div key={i} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--primary-color)' }}>
                          <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumb" />
                          <div style={{ position: 'absolute', inset: '8px', border: '1.5px dashed rgba(255,255,255,0.7)', pointerEvents: 'none' }} />
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); setMediaImages(prev => prev.filter((_, idx) => idx !== i)); }} 
                            style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location and tags */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Location (e.g. Cricket Ground)</label>
                    <input type="text" value={memoryLocation} onChange={(e) => setMemoryLocation(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Event Tag (e.g. Farewell 2016)</label>
                    <input type="text" value={memoryTags} onChange={(e) => setMemoryTags(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                  </div>
                </div>
              </div>
            )}

            {postMediaType === 'video' && (
              <div className="form-group" style={{ marginTop: '4px' }}>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Video URL (YouTube link or direct MP4 URL)</label>
                <input 
                  type="text" 
                  placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ" 
                  value={newPostVideoUrl}
                  onChange={(e) => setNewPostVideoUrl(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
                />
              </div>
            )}

            {postMediaType === 'achievement' && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Achievement Title</label>
                    <input type="text" placeholder="E.g., Secured All India Rank 14 in UPSC" value={achievementTitle} onChange={(e) => setAchievementTitle(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Awarded Badge</label>
                    <select value={achievementBadge} onChange={(e) => setAchievementBadge(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}>
                      <option value="School Ambassador">🏵️ School Ambassador</option>
                      <option value="Top Mentor">🤝 Top Mentor</option>
                      <option value="Community Builder">🏗️ Community Builder</option>
                      <option value="Career Guide">💼 Career Guide</option>
                      <option value="Event Organizer">🎉 Event Organizer</option>
                      <option value="Memory Keeper">📸 Memory Keeper</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {postMediaType === 'career' && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Job Title / Designation</label>
                    <input type="text" placeholder="E.g., Director of Product" value={careerTitle} onChange={(e) => setCareerTitle(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Company</label>
                    <input type="text" placeholder="E.g., Microsoft" value={careerCompany} onChange={(e) => setCareerCompany(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>City / Location</label>
                    <input type="text" placeholder="E.g., Seattle, USA" value={careerLocation} onChange={(e) => setCareerLocation(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input type="checkbox" id="referralCheck" checked={careerReferral} onChange={(e) => setCareerReferral(e.target.checked)} />
                  <label htmlFor="referralCheck" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>I am hiring/can provide referrals for our alumni</label>
                </div>
              </div>
            )}

            {postMediaType === 'mentorship' && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Expertise Domain</label>
                    <select value={mentorshipExpertise} onChange={(e) => setMentorshipExpertise(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}>
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Healthcare & Medicine">Healthcare & Medicine</option>
                      <option value="Civil Services">Civil Services</option>
                      <option value="Entrepreneurship">Entrepreneurship & VCs</option>
                      <option value="Finance & Consulting">Finance & Consulting</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Mentorship Scope / Guidance Offering</label>
                    <textarea rows={2} placeholder="Explain how you can help current students or young grads (e.g. resume reviews, mock interviews, advice)..." value={mentorshipOffer} onChange={(e) => setMentorshipOffer(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.82rem', fontFamily: 'inherit' }} />
                  </div>
                </div>
              </div>
            )}

            {postMediaType === 'event' && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Event Title</label>
                    <input type="text" placeholder="E.g., West Coast Alumni Meet" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Date & Time</label>
                    <input type="text" placeholder="E.g., Oct 18, 2026 5:00 PM" value={eventDateStr} onChange={(e) => setEventDateStr(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Location / Link</label>
                    <input type="text" placeholder="E.g., San Francisco Cafe or Zoom" value={eventLocationStr} onChange={(e) => setEventLocationStr(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>
            )}

            {postMediaType === 'story' && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Guide / Teacher Name</label>
                    <input type="text" placeholder="E.g., Swami Brahmananda-ji" value={storyTeacher} onChange={(e) => setStoryTeacher(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Approximate Year of story</label>
                    <input type="number" min="1950" max="2026" value={storyYear} onChange={(e) => setStoryYear(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>
            )}

            {postMediaType === 'announcement' && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Urgency Priority</label>
                  <select value={announcementUrgency} onChange={(e) => setAnnouncementUrgency(e.target.value)} style={{ width: '120px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}>
                    <option value="Urgent">🚨 Urgent</option>
                    <option value="Important">🌟 Important</option>
                    <option value="Standard">📌 Standard</option>
                  </select>
                </div>
              </div>
            )}

            {postMediaType === 'spotlight' && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Spotlight Alumnus Name</label>
                    <input type="text" placeholder="E.g., Dr. Shubhendu Roy" value={spotlightName} onChange={(e) => setSpotlightName(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Alumnus Batch Year</label>
                    <input type="number" placeholder="E.g., 1998" value={spotlightBatch} onChange={(e) => setSpotlightBatch(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Key Achievement / Milestone</label>
                  <input type="text" placeholder="E.g., Appointed Chief Medical Officer at State Health Ministry" value={spotlightAchievement} onChange={(e) => setSpotlightAchievement(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                </div>
              </div>
            )}

            {postMediaType === 'tribute' && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Honoree Name</label>
                    <input type="text" placeholder="E.g., Swami Asangananda-ji" value={tributePerson} onChange={(e) => setTributePerson(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Role / Affiliation</label>
                    <input type="text" placeholder="E.g., Former Headmaster (1990-2005)" value={tributeRole} onChange={(e) => setTributeRole(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Nostalgic Metadata targeting options panel */}
            <div style={{ marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowNostalgiaPanel(!showNostalgiaPanel)}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: 0
                }}
              >
                <span>{showNostalgiaPanel ? '▼' : '▶'} Nostalgic Targeting & Extra Details</span>
              </button>
              
              {showNostalgiaPanel && (
                <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Targeting Options</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tag Classmates (e.g. Rahul, Shubhendu)</label>
                      <input type="text" placeholder="Separate with commas" value={tagClassmates} onChange={(e) => setTagClassmates(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Target Batch Year (e.g. 2016)</label>
                      <input type="text" placeholder="e.g. 2016" value={targetBatchYear} onChange={(e) => setTargetBatchYear(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Memory Location (e.g. Playground)</label>
                      <input type="text" placeholder="e.g. Hostel 3 Garden" value={memoryLocation} onChange={(e) => setMemoryLocation(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Nostalgic Photo URL</label>
                      <input type="text" placeholder="Paste image link" value={nostalgicPhotoUrl} onChange={(e) => setNostalgicPhotoUrl(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <input type="checkbox" id="reunionPostCheck" checked={isReunionPost} onChange={(e) => setIsReunionPost(e.target.checked)} />
                    <label htmlFor="reunionPostCheck" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>Mark this as an official Reunion meetup post</label>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Panel */}
            <div className="composer-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => showToast("Draft saved successfully!", "info")} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>Save Draft</button>
                <button type="button" onClick={() => showToast("Schedule set for 2 hours later.", "info")} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>Schedule</button>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select 
                  value={postToGroup}
                  onChange={(e) => setPostToGroup(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--border-radius-sm)', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '0.8rem'
                  }}
                >
                  <option value="grp-all">📢 Alumni Feed</option>
                  <option value={`grp-${currentUser.batch_year}`}>👥 Batch Community</option>
                  <option value="grp-career">💼 Career Network</option>
                  <option value="grp-mentorship">🤝 Mentorship Hub</option>
                  <option value="grp-reunion">📅 Reunion Planning</option>
                  <option value="grp-school">🏫 School Announcements</option>
                  <option value="grp-business">💰 Business Network</option>
                </select>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={handleCreatePost}
                  onMouseEnter={() => setPublishHovered(true)}
                  onMouseLeave={() => setPublishHovered(false)}
                  style={{ 
                    padding: '8px 20px', 
                    background: 'var(--primary-gradient)', 
                    border: 'none', 
                    borderRadius: '30px', 
                    color: 'white', 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    cursor: 'pointer',
                    boxShadow: publishHovered ? '0 0 15px rgba(255, 122, 26, 0.6)' : '0 4px 10px rgba(255, 122, 26, 0.3)',
                    transform: publishHovered ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Send size={14} />
                  <span>Publish Post</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- FEED POSTS LIST -------------------- */}
        {(screenMode === 'feed' || screenMode === 'explore' || screenMode === 'saved' || screenMode === 'notes' || screenMode === 'reels' || screenMode === 'pyqs' || screenMode === 'resources' || screenMode === 'placements') && (
          <div className="posts-feed">
            {loading ? (
              <div className="glass-panel loading-state" style={{ minHeight: '200px' }}>
                <div className="spinner"></div>
                <p>Loading Vidyapith feeds...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="glass-panel loading-state" style={{ minHeight: '200px' }}>
                <MessageCircle size={44} style={{ color: 'var(--text-muted)' }} />
                <p>No posts matching the selected search criteria.</p>
              </div>
            ) : (
              filteredPosts.map(post => {
                const author = (post as any).author;
                if (!author) return null;

                // Parse nostalgic metadata if present
                let extraNostalgia: any = null;
                if (post.media_urls && post.media_urls.length > 0) {
                  const lastItem = post.media_urls[post.media_urls.length - 1];
                  if (lastItem && lastItem.startsWith('{') && lastItem.includes('tagClassmates')) {
                    try {
                      extraNostalgia = JSON.parse(lastItem);
                    } catch (e) {}
                  }
                }
                
                const likesCount = (post.likes || []).length;
                const isLiked = (post.likes || []).includes(currentUser.id);
                const comments = (post as any).comments || [];
                const isBookmarked = bookmarks.includes(post.id);
                const isCaptionExpanded = expandedCaptions[post.id] || false;
                const isCommentsExpanded = expandedComments[post.id] || false;
                const isOptionsOpen = activeOptionsPostId === post.id;
                const isEmojiOpen = activeEmojiPostId === post.id;
                const isHeartAnimated = likedAnimationPostId[post.id] || false;

                // Truncate caption if > 120 chars and not expanded
                const shouldTruncate = post.content.length > 120;
                const displayedCaption = (shouldTruncate && !isCaptionExpanded) 
                  ? post.content.slice(0, 120) + '...' 
                  : post.content;

                // Instagram displays the last 2 comments by default, or all if expanded
                const commentsToShow = isCommentsExpanded 
                  ? comments 
                  : comments.slice(-2);

                return (
                  <div key={post.id} className="glass-panel post-card">
                    {/* Header */}
                    <div className="post-card-header">
                      <div className="post-author-info">
                        <div className="post-avatar-ring">
                          <img 
                            src={author.profile_photo} 
                            alt={author.full_name} 
                            className="post-author-avatar" 
                            onClick={() => onViewProfile(author.id)}
                          />
                        </div>
                        <div className="author-meta">
                          <span className="author-name" onClick={() => onViewProfile(author.id)}>
                            {author.full_name}
                          </span>
                          <span className="author-subline">
                            {author.role === 'admin' ? 'Administrative Committee' : `Batch of ${author.batch_year}`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="post-header-right">
                        {post.is_pinned && (
                          <div className="post-pin-btn" title="Pinned by Admin">
                            <Pin size={15} />
                          </div>
                        )}
                        
                        <div className="post-options-wrap">
                          <button 
                            className="post-options-trigger" 
                            onClick={(e) => toggleOptionsMenu(post.id, e)}
                            title="More options"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          
                          {isOptionsOpen && (
                            <div className="post-options-menu" onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="post-options-item" 
                                onClick={(e) => handleCopyLink(post.id, e)}
                              >
                                <Share2 size={14} />
                                <span>Copy Link</span>
                              </button>
                              <button 
                                className="post-options-item" 
                                onClick={() => {
                                  toggleBookmark(post.id);
                                  setActiveOptionsPostId(null);
                                }}
                              >
                                <Bookmark size={14} />
                                <span>{isBookmarked ? 'Remove Bookmark' : 'Bookmark'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 1. Media rendering layer (Supports Photo carousel, Video, PDF, Code, Link, Placement, Knowledge Carousel) */}
                    
                    {/* PHOTO CAROUSEL */}
                    {post.post_type === 'photo' && post.media_urls && post.media_urls.length > 0 && (
                      <div 
                        className="swipe-carousel-wrap"
                        onDoubleClick={() => handleDoubleLike(post.id, isLiked)}
                      >
                        <div className={`double-click-heart-overlay ${isHeartAnimated ? 'animate' : ''}`}>
                          <Heart size={64} fill="#ff3040" stroke="#ff3040" />
                        </div>
                        
                        {/* Slide Deck */}
                        <div className="swipe-card-deck" style={{
                          transform: `translateX(-${(carouselActiveIndexes[post.id] || 0) * 100}%)`
                        }}>
                          {post.media_urls.map((imgUrl, idx) => (
                            <img 
                              key={idx}
                              src={imgUrl} 
                              className="post-card-media-img" 
                              style={{ width: '100%', minWidth: '100%', objectFit: 'cover' }}
                              alt={`attachment-${idx}`} 
                            />
                          ))}
                        </div>

                        {/* Controls */}
                        {post.media_urls.length > 1 && (
                          <>
                            <button className="carousel-control-btn prev" onClick={() => handleSlideChange(post.id, 'prev', post.media_urls.length)}>
                              <ChevronLeft size={18} />
                            </button>
                            <button className="carousel-control-btn next" onClick={() => handleSlideChange(post.id, 'next', post.media_urls.length)}>
                              <ChevronRight size={18} />
                            </button>
                            <div className="carousel-progress-dots">
                              {post.media_urls.map((_, i) => (
                                <div key={i} className={`carousel-dot ${(carouselActiveIndexes[post.id] || 0) === i ? 'active' : ''}`} />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* VIDEO PLAYER */}
                    {post.post_type === 'video' && post.media_urls && post.media_urls.length > 0 && (
                      <div className="video-post-player" onDoubleClick={() => handleDoubleLike(post.id, isLiked)}>
                        <div className={`double-click-heart-overlay ${isHeartAnimated ? 'animate' : ''}`}>
                          <Heart size={64} fill="#ff3040" stroke="#ff3040" />
                        </div>
                        {getYouTubeId(post.media_urls[0]) ? (
                          <iframe
                            className="video-post-iframe"
                            src={`https://www.youtube.com/embed/${getYouTubeId(post.media_urls[0])}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="YouTube video player"
                          />
                        ) : (
                          <video 
                            src={post.media_urls[0]} 
                            controls 
                            className="post-card-media-img" 
                            style={{ maxHeight: '450px' }} 
                          />
                        )}
                      </div>
                    )}

                    {/* PDF NOTES */}
                    {post.post_type === 'notes' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <div className="pdf-preview-box">
                          <div className="pdf-icon-wrap">📄</div>
                          <div className="pdf-details-col">
                            <span className="pdf-title-text">{post.media_urls[1] || 'Lecture notes'}</span>
                            <div className="pdf-meta-row">
                              <span className="pdf-meta-pill">{post.media_urls[2] || 'DSA'}</span>
                              <span className="pdf-meta-pill">Sem {post.media_urls[3] || '3'}</span>
                              <span className="pdf-meta-pill">{post.media_urls[4] || '12'} Pages</span>
                              <span className="pdf-meta-pill">{post.media_urls[5] || '3.5 MB'}</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              setActivePdfPreviewUrl(post.media_urls[0]);
                              showToast("Injected notes visual viewer mock", "info");
                            }}
                            className="editor-btn run-btn"
                          >
                            <Play size={14} /> Preview Notes
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CODE EDITOR BLOCK */}
                    {post.post_type === 'code' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <div className="code-editor-block">
                          <div className="editor-header-bar">
                            <div className="editor-dot-row">
                              <div className="editor-dot red" />
                              <div className="editor-dot yellow" />
                              <div className="editor-dot green" />
                            </div>
                            <span className="editor-lang-badge">{post.media_urls[1] || 'javascript'}</span>
                            <div className="editor-actions-row">
                              <button 
                                className="editor-btn" 
                                onClick={() => {
                                  navigator.clipboard.writeText(post.media_urls[0]);
                                  showToast("Code copied to clipboard!", "success");
                                }}
                              >
                                <Clipboard size={12} /> Copy
                              </button>
                              <button 
                                className="editor-btn run-btn"
                                onClick={() => handleRunCode(post.id, post.media_urls[0], post.media_urls[1])}
                              >
                                <Play size={12} /> Run Code
                              </button>
                            </div>
                          </div>
                          
                          <div className="editor-body">
                            <div className="editor-linenums">
                              {post.media_urls[0].split('\n').map((_, i) => (
                                <div key={i}>{i + 1}</div>
                              ))}
                            </div>
                            <code className="editor-content-area">{post.media_urls[0]}</code>
                          </div>

                          {simulatedConsoleOutput[post.id] && (
                            <div className="editor-console-output">
                              <span className="console-label">Compilation Console</span>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{simulatedConsoleOutput[post.id]}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* RESOURCE LINK */}
                    {post.post_type === 'link' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <a 
                          href={post.media_urls[0]} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="article-preview-card"
                        >
                          <div className="article-thumbnail">
                            <Link size={32} style={{ color: 'var(--accent-gold)' }} />
                          </div>
                          <div className="article-meta-box">
                            <div className="article-meta-domain">{getDomainName(post.media_urls[0])}</div>
                            <div className="article-meta-title">
                              {post.media_urls[1] || 'Resource Link'}
                            </div>
                            <div className="article-meta-desc">
                              {post.media_urls[2] || 'Click to access this external educational asset.'}
                            </div>
                          </div>
                        </a>
                      </div>
                    )}

                    {/* ARTICLE BLOCK */}
                    {post.post_type === 'article' && post.media_urls && post.media_urls.length > 0 && (
                      <div className="article-post-block" style={{ padding: '0 20px 10px 20px' }}>
                        <div className="glass-panel" style={{ overflow: 'hidden', borderRadius: '12px', padding: 0 }}>
                          {post.media_urls[0] && (
                            <img 
                              src={post.media_urls[0]} 
                              alt={post.media_urls[1] || 'Article Cover'} 
                              style={{ width: '100%', maxHeight: '250px', objectFit: 'cover' }} 
                            />
                          )}
                          <div style={{ padding: '20px' }}>
                            {post.media_urls[2] && (
                              <span className="badge badge-role" style={{ background: 'rgba(255, 122, 26, 0.1)', color: 'var(--primary-color)', border: '1px solid rgba(255,122,26,0.25)', fontSize: '0.7rem', padding: '2px 8px', marginBottom: '10px' }}>
                                {post.media_urls[2]}
                              </span>
                            )}
                            <h3 style={{ fontSize: '1.25rem', color: 'white', marginTop: '6px', marginBottom: '12px', lineHeight: '1.4' }}>
                              {post.media_urls[1] || 'Untitled Article'}
                            </h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                              {post.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PLACEMENT STORY */}
                    {post.post_type === 'placement' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <div style={{ background: 'rgba(255, 122, 26, 0.04)', border: '1px solid rgba(255, 122, 26, 0.2)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Briefcase size={18} style={{ color: 'var(--primary-color)' }} />
                              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'white' }}>{post.media_urls[0]}</span>
                            </div>
                            <span className="badge badge-role" style={{ background: 'rgba(255, 122, 26, 0.15)', color: 'var(--primary-color)', border: '1px solid rgba(255,122,26,0.3)', textTransform: 'none' }}>
                              Package: {post.media_urls[2] || 'N/A'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>
                            Designation: {post.media_urls[1]}
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', borderLeft: '2px solid var(--border-color)', paddingLeft: '10px' }}>
                            "{post.media_urls[3]}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ALUMNI ACHIEVEMENT CARD */}
                    {post.post_type === 'achievement' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(255, 122, 26, 0.1) 0%, rgba(212, 175, 55, 0.1) 100%)', border: '1.5px solid var(--accent-gold)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: 'var(--shadow-glow)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.25rem' }}>🏆</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>{post.media_urls[0]}</span>
                            </div>
                            <span className="badge badge-admin" style={{ fontSize: '0.68rem', border: '1px solid var(--accent-gold)' }}>
                              {post.media_urls[1] || 'School Ambassador'}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                            Congratulations to our brother for this proud milestone! Let us celebrate this alumni achievement together.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ALUMNI CAREER UPDATE CARD */}
                    {post.post_type === 'career' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <div style={{ background: 'rgba(13, 35, 69, 0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.2rem' }}>💼</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>{post.media_urls[0]}</span>
                            </div>
                            {post.media_urls[3] === 'yes' && (
                              <span className="badge badge-role" style={{ fontSize: '0.68rem', background: 'rgba(104,211,145,0.15)', borderColor: 'var(--text-success)', color: 'var(--text-success)' }}>
                                🟢 Referral Available
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                            Company: {post.media_urls[1]} {post.media_urls[2] ? `• ${post.media_urls[2]}` : ''}
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                            Ex-student career milestone update. Click 'Connect' to request a referral or ask for guidance.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ALUMNI MENTORSHIP OFFER CARD */}
                    {post.post_type === 'mentorship' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <div style={{ background: 'rgba(255, 122, 26, 0.05)', border: '1px solid rgba(255, 122, 26, 0.3)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.2rem' }}>🤝</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>Available for Mentorship</span>
                            </div>
                            <span className="badge" style={{ fontSize: '0.68rem', color: 'var(--accent-gold)' }}>
                              {post.media_urls[0]}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
                            "{post.media_urls[1]}"
                          </p>
                          <button className="btn btn-primary btn-sm" onClick={() => showToast("Mentorship pairing requested!", "success")} style={{ marginTop: '8px', alignSelf: 'flex-start', fontSize: '0.74rem', padding: '4px 12px' }}>
                            Request Mentorship Pairing
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ALUMNI EVENT CARD */}
                    {post.post_type === 'event' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <div style={{ background: 'rgba(13, 35, 69, 0.7)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.25rem' }}>📅</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>{post.media_urls[0]}</span>
                            </div>
                            <span className="badge" style={{ fontSize: '0.68rem', background: 'var(--primary-gradient)', color: 'white' }}>
                              Alumni Event
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', display: 'flex', gap: '12px' }}>
                            <span>🕒 {post.media_urls[1]}</span>
                            {post.media_urls[2] && <span>📍 {post.media_urls[2]}</span>}
                          </div>
                          <button className="btn btn-secondary btn-sm" onClick={() => showToast("RSVP Confirmed!", "success")} style={{ marginTop: '8px', alignSelf: 'flex-start', fontSize: '0.74rem', padding: '4px 12px' }}>
                            RSVP to Event
                          </button>
                        </div>
                      </div>
                    )}

                    {/* RETRO SCHOOL STORY CARD */}
                    {post.post_type === 'story' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <div style={{ background: 'rgba(12, 30, 54, 0.8)', border: '1px solid rgba(255, 122, 26, 0.25)', borderLeft: '4px solid var(--primary-color)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.2rem' }}>🏫</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-gold)' }}>Vidyapith Legacy Story</span>
                            </div>
                            <span className="badge" style={{ fontSize: '0.68rem' }}>
                              Class of {post.media_urls[1]}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>
                            Monastic / Teacher Guide: {post.media_urls[0]}
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                            "{post.content}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ALUMNI URGENT ANNOUNCEMENT CARD */}
                    {post.post_type === 'announcement' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <div style={{ background: 'rgba(252, 129, 129, 0.05)', border: '1.5px solid var(--text-danger)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.2rem' }}>📢</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-danger)' }}>Alumni Announcement</span>
                            </div>
                            <span className="badge" style={{ fontSize: '0.68rem', background: 'rgba(252, 129, 129, 0.15)', color: 'var(--text-danger)' }}>
                              🚨 {post.media_urls[0]} Priority
                            </span>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'white', margin: 0 }}>
                            {post.content}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ALUMNI SPOTLIGHT CARD */}
                    {post.post_type === 'spotlight' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(255, 122, 26, 0.15) 0%, rgba(255, 199, 44, 0.15) 100%)', border: '1.5px solid var(--accent-gold)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 0 15px rgba(255, 199, 44, 0.1)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.25rem' }}>💡</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>Alumni Spotlight</span>
                            </div>
                            <span className="badge" style={{ fontSize: '0.68rem', background: 'var(--accent-gold)', color: 'black', fontWeight: 700 }}>
                              Class of {post.media_urls[1] || 'N/A'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 800 }}>
                            Featured Alumnus: {post.media_urls[0]}
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600, margin: '4px 0 0 0' }}>
                            Achievement: {post.media_urls[2]}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* TRIBUTE POST CARD */}
                    {post.post_type === 'tribute' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(13, 35, 69, 0.9) 0%, rgba(8, 26, 54, 0.9) 100%)', border: '1px solid rgba(255,255,255,0.1)', borderTop: '4px solid #9B51E0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.25rem' }}>❤️</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#B19FFB' }}>Tribute & Condolence</span>
                            </div>
                            <span className="badge" style={{ fontSize: '0.68rem', background: 'rgba(155, 81, 224, 0.2)', color: '#B19FFB', border: '1px solid rgba(155, 81, 224, 0.3)' }}>
                              In Remembrance
                            </span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 800 }}>
                            Honoring: {post.media_urls[0]}
                          </div>
                          {post.media_urls[1] && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Role: {post.media_urls[1]}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* KNOWLEDGE SLIDE CAROUSEL */}
                    {post.post_type === 'carousel' && post.media_urls && post.media_urls.length > 0 && (
                      <div style={{ padding: '0 20px 10px 20px' }}>
                        {(() => {
                          let slides = [];
                          try { slides = JSON.parse(post.media_urls[0]); } catch (e) {}
                          if (slides.length === 0) return null;
                          const activeIndex = carouselActiveIndexes[post.id] || 0;
                          return (
                            <div className="glass-panel" style={{ overflow: 'hidden', padding: 0, position: 'relative' }}>
                              <div className="swipe-carousel-wrap" style={{ aspectRatio: '16/8' }}>
                                <div className="swipe-card-deck" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
                                  {slides.map((slide: any, sIdx: number) => (
                                    <div key={sIdx} className="swipe-card-item">
                                      <h4 className="carousel-slide-title">{slide.title}</h4>
                                      <p className="carousel-slide-text">{slide.text}</p>
                                    </div>
                                  ))}
                                </div>

                                {slides.length > 1 && (
                                  <>
                                    <button className="carousel-control-btn prev" onClick={() => handleSlideChange(post.id, 'prev', slides.length)}>
                                      <ChevronLeft size={16} />
                                    </button>
                                    <button className="carousel-control-btn next" onClick={() => handleSlideChange(post.id, 'next', slides.length)}>
                                      <ChevronRight size={16} />
                                    </button>
                                    <div className="carousel-progress-dots">
                                      {slides.map((_: any, i: number) => (
                                        <div key={i} className={`carousel-dot ${activeIndex === i ? 'active' : ''}`} />
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* 2. Text-only content layer (if no media post type) */}
                    {post.post_type !== 'photo' && post.post_type !== 'video' && post.post_type !== 'article' && post.post_type !== 'notes' && post.post_type !== 'code' && post.post_type !== 'link' && post.post_type !== 'placement' && post.post_type !== 'carousel' && (
                      <div className="post-card-text-content">
                        {post.content}
                      </div>
                    )}

                    {/* 3. Post card body */}
                    <div className="post-card-body" style={
                      post.post_type !== 'photo' && post.post_type !== 'video' && post.post_type !== 'article' && post.post_type !== 'notes' && post.post_type !== 'code' && post.post_type !== 'link' && post.post_type !== 'placement' && post.post_type !== 'carousel'
                        ? { borderTop: '1px solid rgba(255, 255, 255, 0.03)', paddingTop: '14px' }
                        : {}
                    }>
                      {/* Actions Row */}
                      <div className="post-actions-bar">
                        <div className="post-actions-left">
                          <button 
                            className={`post-action-icon like-btn ${isLiked ? 'like-active' : ''}`}
                            onClick={() => handleLike(post.id)}
                          >
                            <Heart size={22} fill={isLiked ? '#ff3040' : 'none'} />
                          </button>
                          <button 
                            className="post-action-icon"
                            onClick={() => {
                              const input = document.getElementById(`commentInput-${post.id}`);
                              if (input) input.focus();
                            }}
                          >
                            <MessageCircle size={22} />
                          </button>
                          <button 
                            className="post-action-icon"
                            onClick={(e) => handleCopyLink(post.id, e)}
                            title="Share post"
                          >
                            <Send size={20} />
                          </button>
                        </div>

                        <button 
                          className={`post-action-icon ${isBookmarked ? 'bookmark-active' : ''}`}
                          onClick={() => toggleBookmark(post.id)}
                          title="Save post"
                        >
                          <Bookmark size={22} fill={isBookmarked ? 'var(--accent-gold)' : 'none'} />
                        </button>
                      </div>

                      {/* Nostalgic Targeting & Metadata Row */}
                      {extraNostalgia && (
                        <div style={{ 
                          background: 'rgba(255, 122, 26, 0.04)', 
                          border: '1px solid rgba(255, 122, 26, 0.12)', 
                          borderRadius: '8px', 
                          padding: '10px 14px', 
                          margin: '8px 0', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '6px',
                          fontSize: '0.78rem' 
                        }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                            {extraNostalgia.memoryLocation && (
                              <span style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                📍 {extraNostalgia.memoryLocation}
                              </span>
                            )}
                            {extraNostalgia.targetBatchYear && (
                              <span style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                👥 Batch: Class of {extraNostalgia.targetBatchYear}
                              </span>
                            )}
                            {extraNostalgia.isReunionPost && (
                              <span style={{ background: 'rgba(255, 122, 26, 0.15)', color: 'var(--primary-color)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 700 }}>
                                🎉 Reunion meetup
                              </span>
                            )}
                          </div>
                          {extraNostalgia.tagClassmates && (
                            <div style={{ color: 'var(--text-secondary)' }}>
                              🏷️ Tagged Classmates: <span style={{ color: '#FF7A1A', fontWeight: 500 }}>{extraNostalgia.tagClassmates}</span>
                            </div>
                          )}
                          {extraNostalgia.nostalgicPhotoUrl && !post.media_urls.includes(extraNostalgia.nostalgicPhotoUrl) && (
                            <div style={{ marginTop: '6px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <img src={extraNostalgia.nostalgicPhotoUrl} alt="Nostalgic Memory" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover' }} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Likes Count */}
                      <div className="post-likes-text">
                        {likesCount === 0 ? (
                          <span>Be the first to like this</span>
                        ) : likesCount === 1 ? (
                          <span>1 like</span>
                        ) : (
                          <span>{likesCount} likes</span>
                        )}
                      </div>

                      {/* Caption (Render for media posts only since text posts show full content above) */}
                      {(post.post_type === 'photo' || post.post_type === 'video' || post.post_type === 'article' || post.post_type === 'notes' || post.post_type === 'code' || post.post_type === 'link' || post.post_type === 'placement' || post.post_type === 'carousel') && (
                        <div className="post-caption">
                          <span 
                            className="post-caption-author"
                            onClick={() => onViewProfile(author.id)}
                          >
                            {author.full_name}
                          </span>
                          <span className="post-caption-text">
                            {displayedCaption}
                          </span>
                          {shouldTruncate && !isCaptionExpanded && (
                            <button 
                              className="caption-more-btn"
                              onClick={() => toggleCaption(post.id)}
                            >
                              more
                            </button>
                          )}
                        </div>
                      )}

                      {/* Time stamp */}
                      <span className="post-time-ago">
                        {formatTimeAgo(post.created_at)}
                      </span>

                      {/* Comments section */}
                      <div className="instagram-comments-box">
                        {comments.length > 2 && (
                          <button 
                            className="view-all-comments-btn"
                            onClick={() => toggleComments(post.id)}
                          >
                            {isCommentsExpanded 
                              ? 'Hide comments' 
                              : `View all ${comments.length} comments`
                            }
                          </button>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {commentsToShow.map((comment: any) => {
                            const commAuthor = comment.author;
                            if (!commAuthor) return null;
                            return (
                              <div key={comment.id} className="instagram-comment-item">
                                <div className="comment-item-content">
                                  <span 
                                    className="comment-item-author"
                                    onClick={() => onViewProfile(commAuthor.id)}
                                  >
                                    {commAuthor.full_name}
                                  </span>
                                  <span className="comment-item-text">
                                    {comment.content}
                                  </span>
                                  {isCommentsExpanded && (
                                    <span className="comment-item-time">
                                      {formatTimeAgo(comment.created_at)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Comment Input Composer */}
                      <div className="instagram-comment-composer">
                        <button 
                          className="emoji-trigger-btn"
                          onClick={(e) => toggleEmojiTray(post.id, e)}
                          title="Add emoji"
                        >
                          <Smile size={20} />
                        </button>

                        {/* Quick Emoji Popover Tray */}
                        {isEmojiOpen && (
                          <div className="emoji-tray-popover" onClick={(e) => e.stopPropagation()}>
                            {['❤️', '🙌', '🔥', '👏', '😂', '😮', '😢', '😍'].map(emoji => (
                              <button
                                  key={emoji}
                                  type="button"
                                  className="emoji-tray-item"
                                  onClick={() => handleEmojiClick(post.id, emoji)}
                                >
                                  {emoji}
                                </button>
                            ))}
                          </div>
                        )}

                        <input 
                          type="text" 
                          id={`commentInput-${post.id}`}
                          className="instagram-comment-input" 
                          placeholder="Add a comment..." 
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => handleCommentChange(post.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateComment(post.id, e);
                          }}
                          autoComplete="off"
                        />

                        <button 
                          className="instagram-comment-post-btn"
                          disabled={!(commentInputs[post.id] || '').trim()}
                          onClick={(e) => handleCreateComment(post.id, e)}
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* -------------------- DISCOVER ALUMNI SCREEN -------------------- */}
        {screenMode === 'discover' && (
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700 }}>Discover Alumni</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Search and connect with ex-students by batch, profession, and interests.</p>
            </div>
            
            {/* Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Profession / Role</label>
                <input type="text" placeholder="e.g. Software Engineer" value={discoverProfession} onChange={(e) => setDiscoverProfession(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Company</label>
                <input type="text" placeholder="e.g. Google" value={discoverCompany} onChange={(e) => setDiscoverCompany(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Current City</label>
                <input type="text" placeholder="e.g. San Francisco" value={discoverCity} onChange={(e) => setDiscoverCity(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Country</label>
                <input type="text" placeholder="e.g. USA" value={discoverCountry} onChange={(e) => setDiscoverCountry(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Skills & Interests</label>
                <input type="text" placeholder="e.g. React, Python" value={discoverSkills} onChange={(e) => setDiscoverSkills(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Higher Education</label>
                <input type="text" placeholder="e.g. IIT, Stanford" value={discoverHigherEdu} onChange={(e) => setDiscoverHigherEdu(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
              </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginTop: '10px' }}>
              {discoverAlumni.filter(user => {
                if (discoverCity && !user.city?.toLowerCase().includes(discoverCity.toLowerCase())) return false;
                if (discoverProfession && !user.profession?.toLowerCase().includes(discoverProfession.toLowerCase())) return false;
                if (discoverCompany && !user.company?.toLowerCase().includes(discoverCompany.toLowerCase())) return false;
                if (discoverCountry && !user.country?.toLowerCase().includes(discoverCountry.toLowerCase())) return false;
                if (discoverSkills && !user.bio?.toLowerCase().includes(discoverSkills.toLowerCase())) return false;
                if (discoverHigherEdu && !user.bio?.toLowerCase().includes(discoverHigherEdu.toLowerCase())) return false;
                return true;
              }).map(alumnus => (
                <div key={alumnus.id} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', transition: 'all 0.2s ease', position: 'relative' }}>
                  <img src={alumnus.profile_photo} alt={alumnus.full_name} style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px solid var(--primary-color)', objectFit: 'cover' }} />
                  <div>
                    <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700 }} onClick={() => onViewProfile(alumnus.id)} className="clickable-name">{alumnus.full_name}</h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 600 }}>Batch of {alumnus.batch_year} • {alumnus.house}</span>
                  </div>
                  {alumnus.profession && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>{alumnus.profession} at <strong style={{ color: 'white' }}>{alumnus.company || 'N/A'}</strong></p>
                  )}
                  {alumnus.city && (
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                      <MapPin size={12} /> {alumnus.city}, {alumnus.country}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
                    <button 
                      onClick={() => handleConnectRequest(alumnus.id, alumnus.full_name)}
                      className={`btn ${connectionSentIds.includes(alumnus.id) ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ flex: 1, padding: '6px 0', fontSize: '0.78rem', borderRadius: '30px', fontWeight: 600 }}
                      disabled={connectionSentIds.includes(alumnus.id)}
                    >
                      {connectionSentIds.includes(alumnus.id) ? 'Pending' : 'Connect'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------- MY BATCH LOUNGE SCREEN -------------------- */}
        {screenMode === 'batch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Lounge Banner */}
            <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(255, 122, 26, 0.1) 0%, rgba(8, 26, 54, 0.8) 100%)', border: '1px solid rgba(255, 122, 26, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="badge" style={{ background: 'var(--primary-color)', color: 'white', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Private Lounge</span>
                  <h2 style={{ fontSize: '1.5rem', color: 'white', fontWeight: 800, marginTop: '6px' }}>Class of {currentUser.batch_year} Space</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>An exclusive, private digital sanctuary for alumni of the {currentUser.batch_year} batch.</p>
                </div>
                <Users size={48} style={{ color: 'var(--primary-color)', opacity: 0.8 }} />
              </div>
            </div>

            {/* Batch Announcements & Polls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Batch Polls Widget */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} style={{ color: 'var(--accent-gold)' }} />
                  <span>Batch Polls</span>
                </h3>
                
                {/* Active Polls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {batchPolls.map((poll) => {
                    const totalVotes = poll.votes.reduce((a: number, b: number) => a + b, 0);
                    return (
                      <div key={poll.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600, marginBottom: '10px' }}>{poll.question}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {poll.options.map((opt: string, idx: number) => {
                            const isVoted = poll.votedIndex === idx;
                            const voteCount = poll.votes[idx];
                            const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                            return (
                              <button 
                                key={idx}
                                onClick={() => {
                                  if (poll.votedIndex !== null) return;
                                  const updatedPolls = batchPolls.map(p => {
                                    if (p.id === poll.id) {
                                      const newVotes = [...p.votes];
                                      newVotes[idx] += 1;
                                      return { ...p, votedIndex: idx, votes: newVotes };
                                    }
                                    return p;
                                  });
                                  setBatchPolls(updatedPolls);
                                  showToast("Vote recorded!", "success");
                                }}
                                style={{
                                  background: isVoted ? 'rgba(255,122,26,0.15)' : 'rgba(255,255,255,0.03)',
                                  border: '1px solid ' + (isVoted ? 'var(--primary-color)' : 'var(--border-color)'),
                                  borderRadius: '6px', color: 'white', padding: '10px', fontSize: '0.8rem', textAlign: 'left',
                                  cursor: poll.votedIndex !== null ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between',
                                  alignItems: 'center', position: 'relative', overflow: 'hidden', width: '100%'
                                }}
                              >
                                <div style={{
                                  position: 'absolute', top: 0, left: 0, bottom: 0, 
                                  width: `${percent}%`, background: isVoted ? 'rgba(255,122,26,0.2)' : 'rgba(255,255,255,0.04)',
                                  zIndex: 1, transition: 'width 0.6s ease'
                                }}></div>
                                <span style={{ zIndex: 2, position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {isVoted && <Check size={14} style={{ color: 'var(--primary-color)' }} />}
                                  {opt}
                                </span>
                                <span style={{ zIndex: 2, position: 'relative', fontWeight: 700, color: isVoted ? 'var(--primary-color)' : 'var(--text-secondary)' }}>{percent}% ({voteCount})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Create Poll Box */}
                <div style={{ marginTop: '18px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Launch a Batch Poll</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Ask your batchmates..."
                      value={batchPollQuestion}
                      onChange={(e) => setBatchPollQuestion(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} 
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Option 1"
                        value={batchPollOpts[0]}
                        onChange={(e) => setBatchPollOpts([e.target.value, batchPollOpts[1]])}
                        style={{ flex: 1, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', width: '50%', boxSizing: 'border-box' }} 
                      />
                      <input 
                        type="text" 
                        placeholder="Option 2"
                        value={batchPollOpts[1]}
                        onChange={(e) => setBatchPollOpts([batchPollOpts[0], e.target.value])}
                        style={{ flex: 1, padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', width: '50%', boxSizing: 'border-box' }} 
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (!batchPollQuestion.trim() || !batchPollOpts[0].trim() || !batchPollOpts[1].trim()) {
                          showToast("Please fill the poll question and both options.", "danger");
                          return;
                        }
                        const newPoll = {
                          id: 'poll-' + Math.random().toString(36).substr(2, 9),
                          question: batchPollQuestion,
                          options: [batchPollOpts[0], batchPollOpts[1]],
                          votes: [0, 0],
                          votedIndex: null
                        };
                        setBatchPolls(prev => [...prev, newPoll]);
                        setBatchPollQuestion('');
                        setBatchPollOpts(['', '']);
                        showToast("Poll launched successfully!", "success");
                      }}
                      className="btn btn-primary btn-sm" 
                      style={{ marginTop: '4px', alignSelf: 'flex-end', padding: '6px 16px', borderRadius: '30px' }}
                    >
                      Launch Poll
                    </button>
                  </div>
                </div>
              </div>

              {/* Batch Announcements Box */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={18} style={{ color: 'var(--primary-color)' }} />
                  <span>Batch Bulletins & Updates</span>
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'rgba(255, 122, 26, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 122, 26, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>25th Anniversary Meetup Planning</span>
                      <span style={{ color: 'var(--text-muted)' }}>1d ago</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'white', marginTop: '4px' }}>Please vote on the meetup location poll so the organising committee can book rooms.</p>
                  </div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                      <span style={{ fontWeight: 700, color: 'white' }}>Centenary Silver Cup Fundraiser</span>
                      <span style={{ color: 'var(--text-muted)' }}>3d ago</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Our batch has set a target of ₹10,00,000 for the computer lab upgrade. Click Donations in the sidebar to contribute.</p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                      <span style={{ fontWeight: 700, color: 'white' }}>Condolence Message</span>
                      <span style={{ color: 'var(--text-muted)' }}>1w ago</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>We are deeply saddened by the passing of our class master, Revered Swami Asanganandaji. Let us keep him in our prayers.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Batch Posts list */}
            <div>
              <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} style={{ color: 'var(--primary-color)' }} />
                <span>Classroom Discussions</span>
              </h3>
              
              {posts.filter(p => (p as any).author?.batch_year === currentUser.batch_year).length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No batch discussions yet. Use the composer at the top to publish a post to the class space!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {posts.filter(p => (p as any).author?.batch_year === currentUser.batch_year).map(post => {
                    const author = (post as any).author || {};
                    return (
                      <div key={post.id} className="glass-panel" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <img src={author.profile_photo || currentUser.profile_photo} alt={author.full_name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <h4 style={{ color: 'white', fontSize: '0.88rem', fontWeight: 700 }}>{author.full_name || currentUser.full_name}</h4>
                            <span style={{ fontSize: '0.74rem', color: 'var(--accent-gold)' }}>Batch of {author.batch_year || currentUser.batch_year}</span>
                          </div>
                        </div>
                        <p style={{ marginTop: '12px', fontSize: '0.88rem', color: 'white', lineHeight: 1.5 }}>{post.content}</p>
                        <div style={{ marginTop: '12px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>{formatTimeAgo(post.created_at)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- MEMORIES LANE SCREEN -------------------- */}
        {screenMode === 'memories' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(255, 122, 26, 0.08) 0%, rgba(8, 26, 54, 0.8) 100%)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.4rem', color: 'white', fontWeight: 800 }}>Vidyapith Memory Lane</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>Relive and share historic captures, classroom candids, sports day trophies, and monastic archives.</p>
            </div>

            {/* Drag & Drop Simulator */}
            <div 
              className={`glass-panel dropzone ${dragOverActive ? 'dragover' : ''}`}
              style={{
                border: '2px dashed ' + (dragOverActive ? 'var(--primary-color)' : 'var(--border-color)'),
                padding: '24px', textAlign: 'center', borderRadius: '12px', background: dragOverActive ? 'rgba(255,122,26,0.05)' : 'rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease', cursor: 'pointer'
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOverActive(true); }}
              onDragLeave={() => setDragOverActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverActive(false);
                setMemoryImage('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&fit=crop&q=80');
                showToast("Photo dropped successfully!", "success");
              }}
              onClick={() => {
                if (!memoryImage) {
                  setMemoryImage('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&fit=crop&q=80');
                  showToast("Simulated upload: selected school building memory photo.", "info");
                }
              }}
            >
              {!memoryImage ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Camera size={36} style={{ color: 'var(--text-muted)' }} />
                  <p style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>Drag & Drop an old photo here or click to select</p>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Supports JPG, PNG, WEBP (Max 10MB)</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.88rem', color: 'white' }}>Crop and Align Photo</h4>
                  <div style={{ position: 'relative', width: '260px', height: '260px', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--primary-color)' }}>
                    <img 
                      src={memoryImage} 
                      alt="Crop preview" 
                      style={{ 
                        width: '100%', height: '100%', objectFit: 'cover',
                        transform: `scale(${zoomScale})`, transition: 'transform 0.1s ease' 
                      }} 
                    />
                    <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', bottom: '20px', border: '1px dashed rgba(255,255,255,0.7)', pointerEvents: 'none', borderRadius: '4px' }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '200px' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Zoom</span>
                    <input 
                      type="range" min="1" max="2.5" step="0.1" value={zoomScale} 
                      onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: 'var(--primary-color)' }}
                    />
                    <span style={{ fontSize: '0.74rem', color: 'white' }}>{zoomScale}x</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', maxWidth: '500px', textAlign: 'left' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Location</label>
                      <input type="text" placeholder="e.g. Vidyapith Playground" value={memoryLocation} onChange={(e) => setMemoryLocation(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} onClick={(e) => e.stopPropagation()} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Memory Tags</label>
                      <input type="text" placeholder="e.g. Annual Day 2014" value={memoryTags} onChange={(e) => setMemoryTags(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} onClick={(e) => e.stopPropagation()} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMemoryImage(null); }}
                      className="btn btn-secondary btn-sm"
                      style={{ borderRadius: '30px' }}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async (e) => { 
                        e.stopPropagation();
                        if (!memoryImage) return;
                        
                        try {
                          const payload = {
                            content: `Memory from ${memoryLocation}: #${memoryTags.replace(/\s+/g, '')}`,
                            post_type: 'photo',
                            media_urls: [memoryImage],
                            groupId: 'grp-all'
                          };
                          
                          await apiFetch('/posts', {
                            method: 'POST',
                            body: JSON.stringify(payload)
                          });
                          
                          showToast("Memory published to the Lane!", "success");
                          setMemoryImage(null);
                          loadFeed();
                        } catch (err: any) {
                          showToast(err.message, 'danger');
                        }
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ borderRadius: '30px', background: 'var(--primary-gradient)', border: 'none' }}
                    >
                      Post Memory
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Photo Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
              {posts.filter(p => p.post_type === 'photo' || (p.media_urls && p.media_urls.length > 0 && p.content.toLowerCase().includes('memory'))).map(post => {
                const imgUrl = (post.media_urls && post.media_urls[0]) || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&fit=crop&q=80';
                return (
                  <div 
                    key={post.id} 
                    onClick={() => setActiveMemoryLightbox(post)}
                    style={{ position: 'relative', paddingBottom: '100%', overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                    className="memory-grid-card"
                  >
                    <img 
                      src={imgUrl} 
                      alt="memory" 
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                      className="memory-grid-img"
                    />
                    <div 
                      className="memory-grid-overlay"
                      style={{ 
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                        background: 'rgba(8, 26, 54, 0.85)', display: 'flex', justifyContent: 'center', 
                        alignItems: 'center', gap: '16px', opacity: 0, transition: 'opacity 0.2s ease', color: 'white'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Heart size={18} fill="white" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{(post.likes || []).length}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MessageSquare size={18} fill="white" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{((post as any).comments || []).length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* -------------------- REUNIONS SCREEN -------------------- */}
        {screenMode === 'reunions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(255, 122, 26, 0.1) 0%, rgba(8, 26, 54, 0.8) 100%)', border: '1px solid rgba(255, 122, 26, 0.2)' }}>
              <h2 style={{ fontSize: '1.4rem', color: 'white', fontWeight: 800 }}>Centennial Grand Reunion 2026</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>Marking 100 Years of Academic & Spiritual Excellence at Ramakrishna Mission Vidyapith, Deoghar.</p>
              
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', minWidth: '60px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)', display: 'block' }}>40</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Days</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', minWidth: '60px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)', display: 'block' }}>12</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hours</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', minWidth: '60px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)', display: 'block' }}>45</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Mins</span>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Your RSVP Status</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => { setRsvpStatus('going'); showToast("RSVP set: Going!", "success"); }}
                  style={{
                    padding: '8px 20px', borderRadius: '30px', border: '1px solid ' + (rsvpStatus === 'going' ? 'var(--primary-color)' : 'var(--border-color)'),
                    background: rsvpStatus === 'going' ? 'var(--primary-color)' : 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  ✓ Going
                </button>
                <button 
                  onClick={() => { setRsvpStatus('maybe'); showToast("RSVP set: Maybe.", "info"); }}
                  style={{
                    padding: '8px 20px', borderRadius: '30px', border: '1px solid ' + (rsvpStatus === 'maybe' ? 'var(--primary-color)' : 'var(--border-color)'),
                    background: rsvpStatus === 'maybe' ? 'var(--primary-color)' : 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  ? Maybe
                </button>
                <button 
                  onClick={() => { setRsvpStatus('no'); showToast("RSVP set: Cannot Attend.", "info"); }}
                  style={{
                    padding: '8px 20px', borderRadius: '30px', border: '1px solid ' + (rsvpStatus === 'no' ? 'var(--primary-color)' : 'var(--border-color)'),
                    background: rsvpStatus === 'no' ? 'var(--primary-color)' : 'rgba(255,255,255,0.03)', color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  ✕ Cannot Attend
                </button>

                <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Total RSVPs: <strong style={{ color: 'white' }}>{248 + (rsvpStatus === 'going' ? 1 : 0)} Attending</strong> • 42 Maybe
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Expense & Contribution Ledger</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)' }}>
                    Total: ₹{reunionExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
                  </span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {reunionExpenses.map(exp => (
                    <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                      <div>
                        <strong style={{ color: 'white', display: 'block' }}>{exp.title}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Payer: {exp.payer}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>₹{exp.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '4px' }}>
                  <h4 style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Log a Contribution / Expense</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                      type="text" placeholder="Expense Title (e.g. Stage Sound System)" 
                      value={expTitleInput} onChange={(e) => setExpTitleInput(e.target.value)}
                      style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="number" placeholder="Amount (₹)" 
                        value={expAmountInput} onChange={(e) => setExpAmountInput(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', width: '60%', boxSizing: 'border-box' }}
                      />
                      <button 
                        onClick={() => {
                          if (!expTitleInput.trim() || !expAmountInput || parseInt(expAmountInput) <= 0) {
                            showToast("Please enter valid expense details.", "danger");
                            return;
                          }
                          const newExp = {
                            id: 'exp-' + Math.random().toString(36).substr(2, 9),
                            title: expTitleInput.trim(),
                            amount: parseInt(expAmountInput),
                            payer: currentUser.full_name
                          };
                          setReunionExpenses(prev => [...prev, newExp]);
                          setExpTitleInput('');
                          setExpAmountInput('');
                          showToast("Contribution ledger updated successfully!", "success");
                        }}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '6px', width: '40%' }}
                      >
                        Add Entry
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  Shared Photo Gallery
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                  {reunionPhotos.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', paddingBottom: '100%', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <img src={url} alt="Reunion Capture" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
                
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" placeholder="Paste Photo Image URL..." 
                      value={tempReunionPhotoInput} onChange={(e) => setTempReunionPhotoInput(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', width: '70%', boxSizing: 'border-box' }}
                    />
                    <button 
                      onClick={() => {
                        if (!tempReunionPhotoInput.trim()) return;
                        setReunionPhotos(prev => [...prev, tempReunionPhotoInput.trim()]);
                        setTempReunionPhotoInput('');
                        showToast("Reunion photo uploaded!", "success");
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ borderRadius: '6px', width: '30%' }}
                    >
                      Upload
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- SCHOOL ARCHIVES TIMELINE -------------------- */}
        {screenMode === 'archives' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(8,26,54,0.9) 0%, rgba(255, 122, 26, 0.05) 100%)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.4rem', color: 'white', fontWeight: 800 }}>RKMV Deoghar School Archives</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '2px' }}>A curated visual journey through the heritage, history, and spiritual legacy of Vidyapith since inception.</p>
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
              {['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'].map(dec => (
                <button
                  key={dec}
                  onClick={() => setArchiveDecade(dec)}
                  style={{
                    background: archiveDecade === dec ? 'var(--primary-color)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid ' + (archiveDecade === dec ? 'var(--primary-color)' : 'var(--border-color)'),
                    color: 'white', borderRadius: '30px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s ease', whiteSpace: 'nowrap'
                  }}
                >
                  {dec}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              {['All', 'Sports', 'Academics', 'Campus', 'Monks & Faculty'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setArchiveCategory(cat)}
                  style={{
                    background: 'none', border: 'none', color: archiveCategory === cat ? 'var(--primary-color)' : 'var(--text-secondary)',
                    padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    borderBottom: archiveCategory === cat ? '2px solid var(--primary-color)' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {[
                { id: 'arc-1', decade: '1960s', category: 'Campus', title: 'Vintage Temple Building View', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&fit=crop&q=80', desc: 'An early morning capture of the main temple shrine shortly after construction.' },
                { id: 'arc-2', decade: '1970s', category: 'Sports', title: 'Annual Football Meet Champions', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&fit=crop&q=80', desc: 'The historic Vivekananda House football squad posing with the Centenary Shield.' },
                { id: 'arc-3', decade: '1980s', category: 'Monks & Faculty', title: 'Auditorium Lecture by Swami-ji', url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&fit=crop&q=80', desc: 'Swami Brahmanandaji delivering his iconic lecture on youth character-building.' },
                { id: 'arc-4', decade: '1990s', category: 'Academics', title: 'Inauguration of the Old Science Labs', url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&fit=crop&q=80', desc: 'Chief Guest lighting the inaugural lamp in the presence of monastic teachers.' },
                { id: 'arc-5', decade: '2000s', category: 'Campus', title: 'Centenary Gate Foundation', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&fit=crop&q=80', desc: 'Laying the foundation stone of the grand entrance gateway on centenary year.' },
                { id: 'arc-6', decade: '2010s', category: 'Sports', title: 'Cricket Finals Winners Trophy', url: 'https://images.unsplash.com/photo-1531415080290-bc985479bc65?w=600&fit=crop&q=80', desc: 'Celebrations following our win in the Inter-School Athletics Championship.' }
              ].filter(item => {
                if (item.decade !== archiveDecade) return false;
                if (archiveCategory !== 'All' && item.category !== archiveCategory) return false;
                return true;
              }).length === 0 ? (
                <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No archival documents logged for {archiveDecade} ({archiveCategory}).</p>
                </div>
              ) : (
                [
                  { id: 'arc-1', decade: '1960s', category: 'Campus', title: 'Vintage Temple Building View', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&fit=crop&q=80', desc: 'An early morning capture of the main temple shrine shortly after construction.' },
                  { id: 'arc-2', decade: '1970s', category: 'Sports', title: 'Annual Football Meet Champions', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&fit=crop&q=80', desc: 'The historic Vivekananda House football squad posing with the Centenary Shield.' },
                  { id: 'arc-3', decade: '1980s', category: 'Monks & Faculty', title: 'Auditorium Lecture by Swami-ji', url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&fit=crop&q=80', desc: 'Swami Brahmanandaji delivering his iconic lecture on youth character-building.' },
                  { id: 'arc-4', decade: '1990s', category: 'Academics', title: 'Inauguration of the Old Science Labs', url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&fit=crop&q=80', desc: 'Chief Guest lighting the inaugural lamp in the presence of monastic teachers.' },
                  { id: 'arc-5', decade: '2000s', category: 'Campus', title: 'Centenary Gate Foundation', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&fit=crop&q=80', desc: 'Laying the foundation stone of the grand entrance gateway on centenary year.' },
                  { id: 'arc-6', decade: '2010s', category: 'Sports', title: 'Cricket Finals Winners Trophy', url: 'https://images.unsplash.com/photo-1531415080290-bc985479bc65?w=600&fit=crop&q=80', desc: 'Celebrations following our win in the Inter-School Athletics Championship.' }
                ].filter(item => {
                  if (item.decade !== archiveDecade) return false;
                  if (archiveCategory !== 'All' && item.category !== archiveCategory) return false;
                  return true;
                }).map(item => (
                  <div key={item.id} className="glass-panel archive-vintage-card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => showToast(`Archival Detail: ${item.title} - ${item.desc}`, 'info')}>
                    <div style={{ position: 'relative', paddingBottom: '60%' }}>
                      <img src={item.url} alt={item.title} className="archive-vintage-img" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ padding: '16px' }}>
                      <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--accent-gold)', fontSize: '0.68rem' }}>{item.category}</span>
                      <h4 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 700, marginTop: '8px' }}>{item.title}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '4px', lineHeight: 1.4 }}>{item.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* -------------------- RIGHT SIDEBAR UTILITY PANEL -------------------- */}
      {(screenMode === 'feed' || screenMode === 'explore' || screenMode === 'batch') && (
        <div className="forums-sidebar">
          <div className="utility-right-panel">
            {/* Upcoming Reunions Countdowns */}
            <div className="glass-panel sidebar-widget" style={{ padding: '16px' }}>
              <h3 className="widget-title" style={{ fontSize: '0.88rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} />
                <span>Upcoming Reunions</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div style={{ background: 'rgba(255, 122, 26, 0.04)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 122, 26, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: 'white' }}>Centennial Meet 2026</span>
                    <span style={{ color: 'var(--primary-color)', fontWeight: 700 }}>40d left</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Deoghar Campus Grand Centenary Celebration.</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: 'white' }}>Kolkata Chapter Meet</span>
                    <span style={{ color: 'var(--text-muted)' }}>Dec 2026</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Belur Math Annual Alumni Assembly.</p>
                </div>
              </div>
            </div>

            {/* Birthdays & Recently Joined */}
            <div className="glass-panel sidebar-widget" style={{ padding: '16px' }}>
              <h3 className="widget-title" style={{ fontSize: '0.88rem', color: 'var(--accent-gold)' }}>Birthdays & Arrivals</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🎂</span>
                  <div>
                    <span style={{ fontWeight: 700, color: 'white', display: 'block' }}>Dr. Shubhendu Roy (Batch '85)</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Celebrating today! Send wishes</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&q=80" style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="user" />
                  <div>
                    <span style={{ fontWeight: 700, color: 'white', display: 'block' }}>Vivek Kumar (Batch '18)</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Joined RKMV Alumni Network today</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard contributors */}
            <div className="glass-panel sidebar-widget" style={{ padding: '16px' }}>
              <h3 className="widget-title" style={{ fontSize: '0.88rem', color: 'var(--accent-gold)' }}>Top Contributors</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-gold)', fontWeight: 800 }}>1</span>
                    <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&q=80" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} alt="contrib" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Aurobindo Ghosh</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent-gold)', fontWeight: 700 }}>240 pts</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 800 }}>2</span>
                    <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=80&h=80&fit=crop&q=80" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} alt="contrib" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Dr. Shubhendu Roy</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>195 pts</span>
                </div>
              </div>
            </div>

            {/* Career Opportunities */}
            <div className="glass-panel sidebar-widget" style={{ padding: '16px' }}>
              <h3 className="widget-title" style={{ fontSize: '0.88rem', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={16} style={{ color: 'var(--primary-color)' }} />
                <span>Job Referrals</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                  <strong style={{ color: 'white', display: 'block' }}>Senior SWE (React/Go)</strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Google • Bengaluru (Remote-friendly)</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                  <strong style={{ color: 'white', display: 'block' }}>Product Manager</strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Microsoft • Hyderabad</span>
                </div>
              </div>
            </div>

            {/* Available Mentors */}
            <div className="glass-panel sidebar-widget" style={{ padding: '16px' }}>
              <h3 className="widget-title" style={{ fontSize: '0.88rem', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HelpCircle size={16} style={{ color: 'var(--primary-color)' }} />
                <span>Mentors Available</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'space-between', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&q=80" style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="mentor" />
                    <div>
                      <strong style={{ color: 'white', display: 'block' }}>Rishi Kumar Sen</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Finance & Investment Banking</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Mock Modal Overlay */}
      {activePdfPreviewUrl && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '750px', background: '#070e17', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontWeight: 700, color: 'white' }}>Vidyapith PDF Document Viewer</span>
              <button 
                type="button" 
                onClick={() => setActivePdfPreviewUrl(null)} 
                className="icon-btn" 
                style={{ background: 'none', border: 'none', color: 'white' }}
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Mock PDF Content Area */}
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <BookOpen size={64} style={{ color: 'var(--primary-color)' }} />
              <div>
                <h4 style={{ color: 'white', fontSize: '1.1rem', marginBottom: '8px' }}>Visual PDF Viewer Integration</h4>
                <p style={{ fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
                  This mock notes repository connects to target: <span style={{ color: 'var(--accent-gold)' }}>{activePdfPreviewUrl}</span>. In production, this renders via PDF.js with text extraction and annotations.
                </p>
              </div>
              <a 
                href={activePdfPreviewUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', marginTop: '10px' }}
              >
                <Download size={16} /> Download Source PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MEMORY LIGHTBOX MODAL -------------------- */}
      {activeMemoryLightbox && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '900px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', overflow: 'hidden', background: '#070e17', border: '1px solid var(--border-color)', padding: 0 }}>
            {/* Left Image Panel */}
            <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <img 
                src={activeMemoryLightbox.media_urls?.[0] || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&fit=crop&q=80'} 
                alt="Memory Lightbox" 
                style={{ width: '100%', height: '100%', maxHeight: '550px', objectFit: 'contain' }} 
              />
            </div>
            
            {/* Right Comments / Detail Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '550px', borderLeft: '1px solid var(--border-color)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <img 
                    src={activeMemoryLightbox.author?.profile_photo || currentUser.profile_photo} 
                    alt="Author" 
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                  <div>
                    <h4 style={{ color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>{activeMemoryLightbox.author?.full_name || "Vidyapith Alumnus"}</h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)' }}>Batch of {activeMemoryLightbox.author?.batch_year || currentUser.batch_year}</span>
                  </div>
                </div>
                <button onClick={() => setActiveMemoryLightbox(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              {/* Description */}
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'white' }}>
                <p style={{ lineHeight: 1.4 }}>{activeMemoryLightbox.content}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <span style={{ background: 'rgba(255, 122, 26, 0.1)', color: 'var(--primary-color)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={10} /> Location Tag
                  </span>
                  <span style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--accent-gold)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem' }}>
                    #MemoryLane
                  </span>
                </div>
              </div>

              {/* Comments list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {((activeMemoryLightbox.comments || []) as any[]).length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', padding: '10px' }}>No comments yet. Share your thoughts!</p>
                ) : (
                  (activeMemoryLightbox.comments as any[]).map((cmt: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '0.78rem' }}>
                      <img src={cmt.author?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80'} style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="cmt author" />
                      <div>
                        <span style={{ color: 'white', fontWeight: 700, marginRight: '6px' }}>{cmt.author?.full_name || 'Alumnus'}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{cmt.content}</span>
                        <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{formatTimeAgo(cmt.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div style={{ borderTop: '1px solid var(--border-color)', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Add a comment..."
                  value={commentInputs[activeMemoryLightbox.id] || ''}
                  onChange={(e) => setCommentInputs({ ...commentInputs, [activeMemoryLightbox.id]: e.target.value })}
                  style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', width: '70%' }}
                />
                <button 
                  onClick={async () => {
                    const cText = commentInputs[activeMemoryLightbox.id];
                    if (!cText || !cText.trim()) return;
                    try {
                      const resComment = await apiFetch(`/posts/${activeMemoryLightbox.id}/comments`, {
                        method: 'POST',
                        body: JSON.stringify({ content: cText })
                      });
                      
                      const updatedComments = [...(activeMemoryLightbox.comments || []), {
                        ...resComment,
                        author: { id: currentUser.id, full_name: currentUser.full_name, profile_photo: currentUser.profile_photo }
                      }];
                      
                      const updatedLightbox = { ...activeMemoryLightbox, comments: updatedComments };
                      setActiveMemoryLightbox(updatedLightbox);
                      
                      setCommentInputs({ ...commentInputs, [activeMemoryLightbox.id]: '' });
                      showToast("Comment posted!", "success");
                      loadFeed();
                    } catch (err: any) {
                      showToast(err.message, 'danger');
                    }
                  }}
                  disabled={!(commentInputs[activeMemoryLightbox.id] || '').trim()}
                  className="btn btn-primary btn-sm"
                  style={{ borderRadius: '30px', width: '30%' }}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- FLOATING MESSAGING HUB -------------------- */}
      <div 
        style={{
          position: 'fixed', bottom: 0, right: '24px', width: messagingModalOpen ? '650px' : '260px',
          height: messagingModalOpen ? '450px' : '48px', background: 'rgba(13, 35, 69, 0.95)',
          backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 122, 26, 0.3)',
          borderBottom: 'none', borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
          boxShadow: '0 -4px 24px rgba(255, 122, 26, 0.15)', zIndex: 999, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        {/* Header bar */}
        <div 
          onClick={() => setMessagingModalOpen(!messagingModalOpen)}
          style={{
            height: '48px', padding: '0 16px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', borderBottom: messagingModalOpen ? '1px solid var(--border-color)' : 'none',
            cursor: 'pointer', background: 'rgba(255, 122, 26, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem' }}>💬</span>
            <span style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>Alumni Messaging Hub</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'var(--primary-color)', color: 'white', fontSize: '0.68rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>2</span>
            <ChevronDown size={16} style={{ color: 'white', transform: messagingModalOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
        </div>

        {/* Messaging Content (Only if expanded) */}
        {messagingModalOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', flex: 1, height: 'calc(100% - 48px)' }}>
            {/* Conversations list sidebar */}
            <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
              <div 
                onClick={() => setActiveChatId('chat-1')}
                style={{
                  padding: '12px', display: 'flex', gap: '8px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer', background: activeChatId === 'chat-1' ? 'rgba(255,122,26,0.1)' : 'none'
                }}
              >
                <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=80&h=80&fit=crop&q=80" style={{ width: '28px', height: '28px', borderRadius: '50%' }} alt="chat head" />
                <div style={{ overflow: 'hidden' }}>
                  <span style={{ fontWeight: 700, color: 'white', fontSize: '0.78rem', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Dr. Shubhendu Roy</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}> Puja tickets booked...</span>
                </div>
              </div>
              
              <div 
                onClick={() => setActiveChatId('chat-batch')}
                style={{
                  padding: '12px', display: 'flex', gap: '8px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer', background: activeChatId === 'chat-batch' ? 'rgba(255,122,26,0.1)' : 'none'
                }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>B</div>
                <div style={{ overflow: 'hidden' }}>
                  <span style={{ fontWeight: 700, color: 'white', fontSize: '0.78rem', display: 'block' }}>Class of {currentUser.batch_year} Chat</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Fundraiser updates...</span>
                </div>
              </div>
            </div>

            {/* Conversation detail page */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Messages list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(chatMessages[activeChatId] || []).map((msg: any) => {
                  const isMe = msg.senderId === 'usr-alumni-1' || msg.senderId === currentUser.id;
                  return (
                    <div 
                      key={msg.id} 
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        background: isMe ? 'var(--primary-color)' : 'rgba(255,255,255,0.08)',
                        borderRadius: '12px', padding: '8px 12px', maxWidth: '80%', color: 'white', fontSize: '0.8rem'
                      }}
                    >
                      <p style={{ margin: 0 }}>{msg.text}</p>
                      {msg.isVoice && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          {playingVoiceNoteId === msg.id ? (
                            <button onClick={() => setPlayingVoiceNoteId(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>⏸️</button>
                          ) : (
                            <button onClick={() => {
                              setPlayingVoiceNoteId(msg.id);
                              setTimeout(() => setPlayingVoiceNoteId(null), 3000);
                            }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>▶️</button>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} className="voice-waves">
                            {[2, 6, 4, 8, 3, 5, 2, 6].map((h, i) => (
                              <div 
                                key={i} 
                                style={{ 
                                  width: '2px', 
                                  height: `${playingVoiceNoteId === msg.id ? h * 2.5 : 4}px`, 
                                  background: 'white',
                                  transition: 'height 0.2s ease'
                                }}
                              ></div>
                            ))}
                          </div>
                          <span style={{ fontSize: '0.65rem' }}>0:08</span>
                        </div>
                      )}
                      <span style={{ display: 'block', fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px', textAlign: 'right' }}>
                        {msg.time} {isMe && '✓✓'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Message Composer */}
              <div style={{ borderTop: '1px solid var(--border-color)', padding: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    const newMsg = {
                      id: 'msg-' + Math.random().toString(36).substr(2, 9),
                      senderId: currentUser.id,
                      text: '🎤 Voice Note',
                      isVoice: true,
                      time: 'Just now'
                    };
                    setChatMessages(prev => ({
                      ...prev,
                      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
                    }));
                    showToast("Voice Note Simulation Sent!", "success");
                  }}
                  title="Record Voice Note"
                  style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  🎙️
                </button>
                <button 
                  type="button" 
                  onClick={() => showToast("Simulated: file explorer opened.", "info")}
                  title="Attach File"
                  style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  📎
                </button>
                <input 
                  type="text" 
                  placeholder="Write a message..."
                  value={messageInputText}
                  onChange={(e) => setMessageInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && messageInputText.trim()) {
                      const newMsg = {
                        id: 'msg-' + Math.random().toString(36).substr(2, 9),
                        senderId: currentUser.id,
                        text: messageInputText.trim(),
                        time: 'Just now'
                      };
                      setChatMessages(prev => ({
                        ...prev,
                        [activeChatId]: [...(prev[activeChatId] || []), newMsg]
                      }));
                      setMessageInputText('');
                    }
                  }}
                  style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '20px', color: 'white', fontSize: '0.8rem' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
