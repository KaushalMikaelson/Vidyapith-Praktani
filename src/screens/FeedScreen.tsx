"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Post, Comment } from '../database/database';
import { 
  Send, Image, MessageCircle, Heart, Bookmark, MoreHorizontal, Pin, Bell, Grid,
  Smile, Share2, Film, Link, FileText, Clipboard, Play, ExternalLink, 
  Sparkles, Check, ChevronLeft, ChevronRight, Download, BookOpen, Eye, 
  Flame, Trophy, Trash2, Plus, ShieldAlert, Award, Search, HelpCircle, 
  Briefcase, Star, Settings, CheckCircle2, AlertTriangle, BookMarked, User as UserIcon, X,
  Calendar, MapPin, Clock, Lock, Tag, MessageSquare, Paperclip, Volume2,
  Users, Camera, ChevronDown, Quote, UserPlus, Loader2, AlertCircle, Upload, Globe, GraduationCap
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { uploadMedia } from '../utils/upload';

interface FeedScreenProps {
  showToast: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewProfile: (userId: string) => void;
  screenMode?: string;
  forceProfileId?: string;
  refreshKey?: number;
  onNavigate?: (screen: string) => void;
}

export const FeedScreen: React.FC<FeedScreenProps> = ({ 
  showToast, onViewProfile, screenMode = 'feed', forceProfileId, refreshKey = 0, onNavigate 
}) => {
  const { currentUser } = useAuth();
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    const loadNotificationCount = async () => {
      try {
        const notifs = await apiFetch('/notifications');
        setUnreadNotifCount(notifs.filter((n: any) => !n.read).length);
      } catch {}
    };
    loadNotificationCount();
    const interval = setInterval(loadNotificationCount, 5000);
    return () => clearInterval(interval);
  }, []);
  // Stories Tray & Viewer States
  interface StoryItem {
    id: string;
    mediaUrl: string;
    text: string;
    timestamp: string;
    viewed: boolean;
    createdAt?: number;
  }

  interface StoryGroup {
    userId: string;
    userName: string;
    userAvatar: string;
    userBatch: string;
    hasUnviewed: boolean;
    stories: StoryItem[];
  }

  const [stories, setStories] = useState<StoryGroup[]>([]);

  const [currentUserStories, setCurrentUserStories] = useState<StoryItem[]>([]);
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null); // -1 = current user
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [storyProgress, setStoryProgress] = useState<number>(0);
  const [storyPaused, setStoryPaused] = useState<boolean>(false);
  const [storyReplyText, setStoryReplyText] = useState<string>('');

  // Story Creation states
  const [createStoryOpen, setCreateStoryOpen] = useState<boolean>(false);
  const [storyTextContent, setStoryTextContent] = useState<string>('');
  const [storyBgType, setStoryBgType] = useState<'gradient' | 'image'>('gradient');
  const [storyBgValue, setStoryBgValue] = useState<string>('linear-gradient(135deg, #FF7A1A 0%, #d4af37 100%)');
  const [storyCustomImageUrl, setStoryCustomImageUrl] = useState<string>('');

  // Story composer - full create screen feature parity
  type StoryPostType = 'text' | 'image' | 'video' | 'article';
  interface StoryImageItem { preview: string; url: string; uploading: boolean; error: string | null; file?: File; }
  const [storyPostType, setStoryPostType] = useState<StoryPostType>('text');
  const [storyImageItems, setStoryImageItems] = useState<StoryImageItem[]>([]);
  const [storyImageMethod, setStoryImageMethod] = useState<'device'|'url'>('device');
  const [storyTempImageUrl, setStoryTempImageUrl] = useState('');
  const [storyAspectRatio, setStoryAspectRatio] = useState<'original'|'1:1'|'4:5'|'4:3'|'16:9'>('original');
  const [storyFitMode, setStoryFitMode] = useState<'contain'|'cover'>('contain');
  const [storyTagClassmates, setStoryTagClassmates] = useState('');
  const [storyVideoUrl, setStoryVideoUrl] = useState('');
  const [storyVideoCloudUrl, setStoryVideoCloudUrl] = useState('');
  const [storyVideoPreviewSrc, setStoryVideoPreviewSrc] = useState('');
  const [storyVideoFileName, setStoryVideoFileName] = useState('');
  const [storyVideoUploading, setStoryVideoUploading] = useState(false);
  const [storyVideoUploadError, setStoryVideoUploadError] = useState<string|null>(null);
  const [storyVideoMethod, setStoryVideoMethod] = useState<'device'|'url'>('device');
  const [storyArticleTitle, setStoryArticleTitle] = useState('');
  const [storyArticleCategory, setStoryArticleCategory] = useState('Nostalgia & School Stories');
  const [storyCoverImageUrl, setStoryCoverImageUrl] = useState('');
  const [storyIsSubmitting, setStoryIsSubmitting] = useState(false);
  const storyImageInputRef = useRef<HTMLInputElement>(null);
  const storyVideoInputRef = useRef<HTMLInputElement>(null);

  // Core feed states (posts, loading, filters)
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterChip, setFilterChip] = useState<string>('All');
  const [activeGroupId, setActiveGroupId] = useState<string>('grp-all');

  // Load user stories from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('rkmv_user_stories');
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as StoryItem[];
          const now = Date.now();
          const oneDayMs = 24 * 60 * 60 * 1000;
          const activeStories = parsed.filter(story => {
            const createdTime = story.createdAt || parseInt(story.id.replace('story-user-', '')) || now;
            return now - createdTime < oneDayMs;
          });
          setCurrentUserStories(activeStories);
          if (activeStories.length !== parsed.length) {
            localStorage.setItem('rkmv_user_stories', JSON.stringify(activeStories));
          }
        } catch (e) {}
      }
    }
  }, [refreshKey]);

  // Auto-advance logic for stories
  useEffect(() => {
    if (activeStoryGroupIndex === null) {
      setStoryProgress(0);
      return;
    }

    let interval: NodeJS.Timeout;
    const duration = 5000; // 5000ms total
    const intervalTime = 50; // 50ms ticks
    const increment = 100 / (duration / intervalTime); // 1% per tick

    if (!storyPaused) {
      interval = setInterval(() => {
        setStoryProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            // Move to next story
            handleNextStory();
            return 0;
          }
          return prev + increment;
        });
      }, intervalTime);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeStoryGroupIndex, activeStoryIndex, storyPaused, currentUserStories, stories]);

  const getActiveStoriesList = (): StoryItem[] => {
    if (activeStoryGroupIndex === -1) {
      return currentUserStories;
    }
    if (activeStoryGroupIndex !== null && stories[activeStoryGroupIndex]) {
      return stories[activeStoryGroupIndex].stories;
    }
    return [];
  };

  const handleNextStory = () => {
    const currentList = getActiveStoriesList();
    if (activeStoryIndex < currentList.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
      setStoryProgress(0);
      if (activeStoryGroupIndex !== -1 && activeStoryGroupIndex !== null) {
        markStoryAsViewed(activeStoryGroupIndex, activeStoryIndex + 1);
      }
    } else {
      // End of this group
      if (activeStoryGroupIndex === -1) {
        // Move from own stories to first alumni stories
        if (stories.length > 0) {
          setActiveStoryGroupIndex(0);
          setActiveStoryIndex(0);
          setStoryProgress(0);
          markStoryAsViewed(0, 0);
        } else {
          closeStoryViewer();
        }
      } else if (activeStoryGroupIndex !== null && activeStoryGroupIndex < stories.length - 1) {
        // Move to next alumni group
        setActiveStoryGroupIndex(prev => (prev as number) + 1);
        setActiveStoryIndex(0);
        setStoryProgress(0);
        markStoryAsViewed((activeStoryGroupIndex as number) + 1, 0);
      } else {
        // End of all story groups
        closeStoryViewer();
      }
    }
  };

  const handlePrevStory = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
      setStoryProgress(0);
    } else {
      // Go to previous group
      if (activeStoryGroupIndex === 0) {
        if (currentUserStories.length > 0) {
          setActiveStoryGroupIndex(-1);
          setActiveStoryIndex(currentUserStories.length - 1);
          setStoryProgress(0);
        } else {
          closeStoryViewer();
        }
      } else if (activeStoryGroupIndex !== null && activeStoryGroupIndex > 0) {
        const prevGroupIdx = activeStoryGroupIndex - 1;
        setActiveStoryGroupIndex(prevGroupIdx);
        setActiveStoryIndex(stories[prevGroupIdx].stories.length - 1);
        setStoryProgress(0);
      } else {
        closeStoryViewer();
      }
    }
  };

  const markStoryAsViewed = (groupIdx: number, storyIdx: number) => {
    setStories(prev => {
      const updated = prev.map((group, gIdx) => {
        if (gIdx !== groupIdx) return group;
        const updatedStories = group.stories.map((story, sIdx) => {
          if (sIdx !== storyIdx) return story;
          return { ...story, viewed: true };
        });
        const hasUnviewed = updatedStories.some(s => !s.viewed);
        return { ...group, stories: updatedStories, hasUnviewed };
      });
      return updated;
    });
  };

  const closeStoryViewer = () => {
    setActiveStoryGroupIndex(null);
    setActiveStoryIndex(0);
    setStoryProgress(0);
    setStoryPaused(false);
  };

  const [profileUser, setProfileUser] = useState<any>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [profileTab, setProfileTab] = useState<'posts' | 'reels' | 'connections' | 'network' | 'career' | 'achievements' | 'saved' | 'notes'>('posts');
  const [selectedPostForModal, setSelectedPostForModal] = useState<any | null>(null);
  const [selectedHighlightForGallery, setSelectedHighlightForGallery] = useState<string | null>(null);
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
  const [connectedUserIds, setConnectedUserIds] = useState<string[]>([]);

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
  const [reunionExpenses, setReunionExpenses] = useState<any[]>([]);
  const [expTitleInput, setExpTitleInput] = useState('');
  const [expAmountInput, setExpAmountInput] = useState('');
  const [reunionPhotos, setReunionPhotos] = useState<string[]>([]);
  const [tempReunionPhotoInput, setTempReunionPhotoInput] = useState('');

  // School Archives decadal timeline selector
  const [archiveDecade, setArchiveDecade] = useState('1980s');
  const [archiveCategory, setArchiveCategory] = useState('All');

  // Messaging private chats
  const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({});
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
      const allAlumni = await apiFetch('/directory');
      setDiscoverAlumni(allAlumni);
    } catch (err: any) {
      showToast("Failed to load profile details", "danger");
    }
  };

  const loadSpotlights = async () => {
    try {
      const newsList = await apiFetch('/news');
      const spotlightItems = newsList.filter((n: any) => n.category === 'Alumni Spotlight');
      const mapped = spotlightItems.map((n: any) => {
        let name = n.title;
        let role = "Alumnus";
        if (n.title.startsWith("Alumni Spotlight:")) {
          const parts = n.title.replace("Alumni Spotlight:", "").trim().split(",");
          name = parts[0].trim();
          if (parts.length > 1) {
            role = parts.slice(1).join(",").trim();
          }
        }
        let batch = 2005;
        const batchMatch = n.body.match(/Batch of (\d{4})/i);
        if (batchMatch) {
          batch = parseInt(batchMatch[1]);
        }
        return {
          name,
          batch,
          role,
          image: n.media_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
          story: n.body
        };
      });
      setSpotlightPeople(mapped);
    } catch (err) {
      console.error("Failed to load spotlights:", err);
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
      loadSpotlights();
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
        text = "ðŸ“¢ Vidyapith Reunion Invite! Let's get together, catch up on old times, and share memories. Date: Oct 18, 2026. Venue: San Francisco Cafe. RSVP here! #Reunion2026 #RKMVAlumni";
      } else if (templateType === 'event') {
        text = "Join us for the Vidyapith Alumni Mentorship & Networking Meetup. An opportunity for young graduates and current students to connect with senior alumni in Tech, Medicine, and Public Services. #Mentorship #AlumniMeet";
      } else if (templateType === 'announcement') {
        text = "ðŸš¨ URGENT ANNOUNCEMENT: Swami Asangananda-ji Memorial and Prayer Meeting. We request all alumni to join the prayer service in memory of our beloved teacher. Venue: Temple Hall & Zoom. #Announcements #VidyapithCommunity";
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
      [postId]: `Compiling on Vidyapith Node Server...\nRunning ${lang} sandbox compiler...\n\n[STDOUT]\nSolving test cases...\nTest Case 1 Passed (Time: 4ms)\nTest Case 2 Passed (Time: 8ms)\n\nðŸš€ Program executed successfully with exit status 0.`
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

  // Aliases for the simplified feed render
  const handleBookmark = (postId: string) => toggleBookmark(postId);
  const handleCommentSubmit = (postId: string, text: string) => {
    if (!text.trim()) return;
    apiFetch(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: text.trim() })
    }).then(() => {
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      loadFeed();
    }).catch((err: any) => showToast(err.message, 'danger'));
  };

  const [spotlightPeople, setSpotlightPeople] = useState<any[]>([]);

  const derivedMemories = posts
    .filter((p: any) => p.post_type === 'photo' || p.content?.toLowerCase().includes('memory') || p.content?.toLowerCase().includes('nostalg'))
    .map((p: any) => ({
      id: p.id,
      name: p.author?.full_name || 'Alumnus',
      batch: p.author?.batch_year || '—',
      image: p.media_urls?.[0] || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=520&h=700&fit=crop&q=80',
      text: p.content || '',
      likes: (p.likes || []).length,
      comments: (p.comments || []).length,
      rawPost: p
    }));

  // Story click handlers
  const handleStoryGroupClick = (idx: number) => {
    setActiveStoryGroupIndex(idx);
    setActiveStoryIndex(0);
    setStoryProgress(0);
    setStoryPaused(false);
    markStoryAsViewed(idx, 0);
  };

  const handleUserStoryClick = () => {
    if (currentUserStories.length > 0) {
      setActiveStoryGroupIndex(-1);
      setActiveStoryIndex(0);
      setStoryProgress(0);
      setStoryPaused(false);
    } else {
      setCreateStoryOpen(true);
    }
  };

  const handlePublishStory = async () => {
    setStoryIsSubmitting(true);
    try {
      let mediaUrl = '';
      let storyText = storyTextContent.trim();

      if (storyPostType === 'text') {
        // Gradient/text story - no media required but text is
        if (!storyText) { showToast('Please add some text for your story.', 'danger'); return; }
        mediaUrl = '';
      } else if (storyPostType === 'image') {
        const ready = storyImageItems.filter(i => i.url && !i.uploading && !i.error);
        if (ready.length === 0) { showToast('Please add at least one image.', 'danger'); return; }
        mediaUrl = ready[0].url;
        if (!storyText) storyText = 'ðŸ“¸ ' + (storyTagClassmates ? `with ${storyTagClassmates}` : 'Shared a photo');
      } else if (storyPostType === 'video') {
        const finalVid = storyVideoMethod === 'device' ? storyVideoCloudUrl : storyVideoUrl.trim();
        if (!finalVid) { showToast('Please add a video.', 'danger'); return; }
        if (storyVideoUploading) { showToast('Video still uploading...', 'info'); return; }
        mediaUrl = finalVid;
        if (!storyText) storyText = 'ðŸŽ¬ Shared a video';
      } else if (storyPostType === 'article') {
        if (!storyArticleTitle.trim()) { showToast('Please add an article title.', 'danger'); return; }
        if (!storyText) { showToast('Article body cannot be empty.', 'danger'); return; }
        mediaUrl = storyCoverImageUrl.trim();
        storyText = `ðŸ“° ${storyArticleTitle.trim()}\n\n${storyText}`;
      }

      const newStory: StoryItem = {
        id: `story-user-${Date.now()}`,
        mediaUrl,
        text: storyText,
        timestamp: 'Just now',
        viewed: false,
        createdAt: Date.now()
      };
      const updated = [...currentUserStories, newStory];
      setCurrentUserStories(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('rkmv_user_stories', JSON.stringify(updated));
      }
      // Reset all story state
      setCreateStoryOpen(false);
      setStoryPostType('text');
      setStoryTextContent('');
      setStoryBgType('gradient');
      setStoryBgValue('linear-gradient(135deg, #FF7A1A 0%, #d4af37 100%)');
      setStoryCustomImageUrl('');
      setStoryImageItems([]);
      setStoryTempImageUrl('');
      setStoryVideoUrl('');
      setStoryVideoCloudUrl('');
      setStoryVideoPreviewSrc('');
      setStoryVideoFileName('');
      setStoryVideoUploadError(null);
      setStoryArticleTitle('');
      setStoryArticleCategory('Nostalgia & School Stories');
      setStoryCoverImageUrl('');
      setStoryTagClassmates('');
      showToast('Story posted! 🎉', 'success');
    } finally {
      setStoryIsSubmitting(false);
    }
  };

  // Story composer upload helpers
  const handleStoryImageFiles = async (files: File[]) => {
    const valid = files.filter(f => f.type.startsWith('image/'));
    if (!valid.length) { showToast('Please select image files.', 'danger'); return; }
    const placeholders = valid.map(file => ({ preview: URL.createObjectURL(file), url: '', uploading: true, error: null as string | null, file }));
    setStoryImageItems(prev => [...prev, ...placeholders]);
    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      const idx = storyImageItems.length + i;
      try {
        const result = await uploadMedia(file, 'posts/images');
        setStoryImageItems(prev => { const u = [...prev]; u[idx] = { ...u[idx], url: result.url, uploading: false, error: null, file: undefined }; return u; });
      } catch (err: any) {
        setStoryImageItems(prev => { const u = [...prev]; u[idx] = { ...u[idx], uploading: false, error: err.message || 'Upload failed' }; return u; });
      }
    }
  };
  const handleAddStoryImageUrl = () => {
    if (!storyTempImageUrl.trim()) return;
    setStoryImageItems(prev => [...prev, { preview: storyTempImageUrl.trim(), url: storyTempImageUrl.trim(), uploading: false, error: null }]);
    setStoryTempImageUrl('');
  };
  const handleStoryVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/')) { showToast('Please select a video file.', 'danger'); return; }
    if (file.size > 100 * 1024 * 1024) { showToast('Video must be under 100 MB.', 'danger'); return; }
    setStoryVideoPreviewSrc(URL.createObjectURL(file));
    setStoryVideoFileName(file.name);
    setStoryVideoCloudUrl('');
    setStoryVideoUploadError(null);
    setStoryVideoUploading(true);
    try {
      const result = await uploadMedia(file, 'posts/videos');
      setStoryVideoCloudUrl(result.url);
      setStoryVideoUploading(false);
      showToast('Video uploaded!', 'success');
    } catch (err: any) {
      setStoryVideoUploadError(err.message || 'Upload failed');
      setStoryVideoUploading(false);
    }
  };
  const clearStoryVideo = () => {
    if (storyVideoPreviewSrc.startsWith('blob:')) URL.revokeObjectURL(storyVideoPreviewSrc);
    setStoryVideoPreviewSrc('');
    setStoryVideoCloudUrl('');
    setStoryVideoFileName('');
    setStoryVideoUploadError(null);
    setStoryVideoUploading(false);
  };
  const storyYouTubeId = (url: string) => {
    const m = url.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
    return m ? m[1] : null;
  };

  if (screenMode === 'feed') {
    const sortedPosts = [...filteredPosts].sort((a, b) =>
      new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime()
    );

    return (
      <div className="ig-feed-layout">
        {/* Custom Instagram-style Feed Header */}
        <div className="feed-header-ig">
          <div>
            <h1>Vidyapith Alumni</h1>
            <p>Welcome back, {currentUser?.full_name?.split(' ')[0] || 'Rahul'} 👋</p>
          </div>
          <div className="feed-header-actions">
            <button className="header-action-btn" title="Search" onClick={() => showToast('Search panel is available in the sidebar.', 'info')}>
              <Search size={22} />
            </button>
            <button className="header-action-btn" title="Notifications" onClick={() => onNavigate && onNavigate('notifications')}>
              <Bell size={22} />
              {unreadNotifCount > 0 && <span className="notif-badge-dot" />}
            </button>
          </div>
        </div>

        {/* Center: post composer + feed */}
        <main className="ig-feed-main">
          {/* Instagram-style Stories Tray */}
          <div className="stories-tray-container">
            {/* Current User's Story */}
            <div className="story-item-wrap">
              <div 
                className={`story-avatar-ring ${currentUserStories.length > 0 ? 'has-unviewed' : 'viewed'}`}
                onClick={handleUserStoryClick}
              >
                <img 
                  src={currentUser?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80'} 
                  alt="Your Story" 
                  className="story-avatar" 
                />
                <button 
                  className="story-add-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateStoryOpen(true);
                  }}
                  title="Add to story"
                  type="button"
                >
                  <Plus size={12} />
                </button>
              </div>
              <span className="story-username">Your Story</span>
            </div>

            {/* Other Story Groups */}
            {stories.map((group, idx) => (
              <div 
                key={group.userId} 
                className="story-item-wrap"
                onClick={() => handleStoryGroupClick(idx)}
              >
                <div className={`story-avatar-ring ${group.hasUnviewed ? 'has-unviewed' : 'viewed'}`}>
                  <img 
                    src={group.userAvatar} 
                    alt={group.userName} 
                    className="story-avatar" 
                  />
                </div>
                <span className="story-username">{group.userName}</span>
              </div>
            ))}
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--heritage-muted)', fontSize: '0.9rem' }}>
              Loading posts...
            </div>
          )}

          {!loading && sortedPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--heritage-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🐒</div>
              <p style={{ fontWeight: 600, marginBottom: '6px' }}>No posts yet</p>
              <p style={{ fontSize: '0.85rem' }}>Be the first to share something with the Vidyapith family!</p>
            </div>
          )}

          {sortedPosts.map((post: any) => {
            const author = post.author || currentUser;
            const postImages: string[] = (post.media_urls || []).filter(
              (url: string) => url && url.startsWith('http') && !url.startsWith('{') && url !== 'Memory Photo'
            );
            let postMeta: any = {};
            if (post.media_urls && post.media_urls.length > 0) {
              const lastItem = post.media_urls[post.media_urls.length - 1];
              if (lastItem && lastItem.startsWith('{')) {
                try {
                  postMeta = JSON.parse(lastItem);
                } catch (e) {}
              }
            }
            const imageLayout = postMeta.imageLayout || { aspectRatio: 'original', objectFit: 'contain' };

            const isVideo = post.post_type === 'video';
            const isPhoto = post.post_type === 'photo';
            const isArticle = post.post_type === 'article';

            // For articles: mediaUrls[0]=coverImg, [1]=title, [2]=category
            const articleCoverImg = isArticle ? post.media_urls?.[0] : null;
            const articleTitle = isArticle ? post.media_urls?.[1] : null;
            const articleCategory = isArticle ? post.media_urls?.[2] : null;

            // For video: mediaUrls[0] = video URL
            const videoSrc = isVideo ? post.media_urls?.[0] : null;

            const isLiked = (post.likes || []).includes(currentUser.id);

            return (
              <article key={post.id} className="feed-story-card">
                {/* Post Header */}
                <header className="feed-card-header" onClick={() => author?.id && onViewProfile(author.id)}>
                  <div className="post-avatar-ring">
                    <img
                      src={author?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80'}
                      alt={author?.full_name}
                      className="post-avatar"
                    />
                  </div>
                  <div className="post-header-info">
                    <h3>{author?.full_name || 'Vidyapith Alumnus'}</h3>
                    <p>{formatTimeAgo(post.created_at)} · Class of {author?.batch_year || '—'}</p>
                  </div>
                  <button className="post-more-btn" type="button" aria-label="More options" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal size={20} />
                  </button>
                </header>

                {/* Caption */}
                {post.content && (
                  <p className="feed-card-caption">
                    {post.content}
                  </p>
                )}

                {/* Article card */}
                {isArticle && (
                  <div className="feed-card-article-preview">
                    {articleCoverImg && articleCoverImg.startsWith('http') && (
                      <img src={articleCoverImg} alt={articleTitle || ''} />
                    )}
                    <div className="article-details">
                      {articleCategory && <span className="article-category">{articleCategory}</span>}
                      {articleTitle && <p className="article-title">{articleTitle}</p>}
                    </div>
                  </div>
                )}

                {/* Photo grid */}
                {isPhoto && postImages.length > 0 && (
                  <div className={`feed-card-media-grid cols-${postImages.length === 1 ? '1' : postImages.length === 2 ? '2' : '3'}`}>
                    {postImages.slice(0, 9).map((url: string, imgIdx: number) => {
                      const finalAspectRatio = imageLayout.aspectRatio === 'original' 
                        ? 'auto' 
                        : (imageLayout.aspectRatio === '1:1' 
                          ? '1' 
                          : imageLayout.aspectRatio === '4:3' 
                            ? '4/3' 
                            : imageLayout.aspectRatio === '16:9' 
                              ? '16/9' 
                              : '4/5');

                      return (
                        <img
                          key={imgIdx}
                          src={url}
                          alt={`Photo ${imgIdx + 1}`}
                          style={{
                            width: '100%',
                            aspectRatio: postImages.length === 1 ? finalAspectRatio : '1',
                            objectFit: postImages.length === 1 ? (imageLayout.objectFit || 'contain') : 'cover',
                            display: 'block',
                            maxHeight: '550px',
                            background: (postImages.length === 1 && imageLayout.objectFit === 'contain') ? '#0f172a' : 'transparent',
                          }}
                        />
                      );
                    })}
                    {postImages.length > 9 && (
                      <div className="more-images-overlay">
                        <img src={postImages[8]} alt="" />
                        <span>+{postImages.length - 9}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Video */}
                {isVideo && videoSrc && (
                  <div className="feed-card-video">
                    {videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be') ? (
                      (() => {
                        const ytId = (() => { const m = videoSrc.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/); return m ? m[1] : null; })();
                        return ytId ? (
                          <iframe src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen title="Video" />
                        ) : null;
                      })()
                    ) : (
                      <video src={videoSrc} controls />
                    )}
                  </div>
                )}

                {/* Actions */}
                <footer className="feed-card-actions">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
                    type="button"
                  >
                    <Heart size={20} fill={isLiked ? '#e0245e' : 'none'} />
                    <span>{(post.likes || []).length || 0}</span>
                  </button>
                  <button
                    onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                    className="action-btn comment-btn"
                    type="button"
                  >
                    <MessageCircle size={20} />
                    <span>{((post as any).comments || []).length || 0}</span>
                  </button>
                  <button className="action-btn share-btn" type="button" onClick={() => showToast('Link copied to clipboard!', 'success')}>
                    <Share2 size={20} />
                    <span>Share</span>
                  </button>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => handleBookmark(post.id)}
                    className={`action-btn bookmark-btn ${bookmarks.includes(post.id) ? 'bookmarked' : ''}`}
                    type="button"
                    aria-label="Bookmark"
                  >
                    <Bookmark size={20} fill={bookmarks.includes(post.id) ? 'var(--primary-color)' : 'none'} />
                  </button>
                </footer>

                {/* Comments */}
                {expandedComments[post.id] && (
                  <div className="feed-card-comments">
                    {((post as any).comments || []).slice(0, 5).map((comment: any) => (
                      <div key={comment.id} className="comment-item">
                        <img src={comment.author?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&q=80'} alt="" />
                        <div className="comment-text-wrap">
                          <strong>{comment.author?.full_name || 'Alumnus'}</strong>
                          <p>{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    <div className="comment-input-wrap">
                      <img src={currentUser.profile_photo} alt="" />
                      <input
                        value={commentInputs[post.id] || ''}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleCommentSubmit(post.id, commentInputs[post.id] || ''); }}
                        placeholder="Add a comment..."
                        className="comment-input"
                      />
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {/* ============ STORY VIEWER OVERLAY ============ */}
          {activeStoryGroupIndex !== null && (() => {
            const isOwnStory = activeStoryGroupIndex === -1;
            const storyList = isOwnStory ? currentUserStories : (stories[activeStoryGroupIndex as number]?.stories || []);
            const currentStory = storyList[activeStoryIndex];
            const groupInfo = isOwnStory
              ? {
                  userName: currentUser?.full_name || 'You',
                  userAvatar: currentUser?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80',
                  userBatch: `Class of ${currentUser?.batch_year || 'â€”'}`
                }
              : {
                  userName: stories[activeStoryGroupIndex as number]?.userName || '',
                  userAvatar: stories[activeStoryGroupIndex as number]?.userAvatar || '',
                  userBatch: `Batch of ${stories[activeStoryGroupIndex as number]?.userBatch || ''}`
                };
            if (!currentStory) return null;
            const hasBg = currentStory.mediaUrl && currentStory.mediaUrl.startsWith('http');
            return (
              <div
                className="sv-overlay"
                onMouseDown={() => setStoryPaused(true)}
                onMouseUp={() => setStoryPaused(false)}
              >
                {/* Progress bars */}
                <div className="sv-progress-bar-row">
                  {storyList.map((_, i) => (
                    <div key={i} className="sv-progress-bar-track">
                      <div
                        className="sv-progress-bar-fill"
                        style={{
                          width: i < activeStoryIndex ? '100%'
                            : i === activeStoryIndex ? `${storyProgress}%`
                            : '0%'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Header */}
                <div className="sv-header">
                  <img src={groupInfo.userAvatar} alt={groupInfo.userName} className="sv-header-avatar" />
                  <div className="sv-header-info">
                    <span className="sv-header-name">{groupInfo.userName}</span>
                    <span className="sv-header-meta">{groupInfo.userBatch} Â· {currentStory.timestamp}</span>
                  </div>
                  <button className="sv-close-btn" onClick={(e) => { e.stopPropagation(); closeStoryViewer(); }}>
                    <X size={26} />
                  </button>
                </div>

                {/* Story content */}
                <div
                  className="sv-content"
                  style={
                    hasBg
                      ? { backgroundImage: `url(${currentStory.mediaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: 'linear-gradient(135deg, #FF7A1A 0%, #d4af37 100%)' }
                  }
                  onClick={(e) => {
                    const x = e.clientX;
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    if (x - rect.left < rect.width / 2) handlePrevStory();
                    else handleNextStory();
                  }}
                >
                  {currentStory.text && (
                    <div className="sv-text-overlay">{currentStory.text}</div>
                  )}
                </div>

                {/* Reply bar */}
                <div className="sv-reply-bar">
                  <input
                    className="sv-reply-input"
                    value={storyReplyText}
                    onChange={e => setStoryReplyText(e.target.value)}
                    placeholder={`Reply to ${groupInfo.userName.split(' ')[0]}...`}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && storyReplyText.trim()) {
                        showToast('Reply sent!', 'success');
                        setStoryReplyText('');
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                  <button
                    className="sv-reply-send"
                    onClick={e => {
                      e.stopPropagation();
                      if (storyReplyText.trim()) {
                        showToast('Reply sent!', 'success');
                        setStoryReplyText('');
                      }
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>

                {/* Nav arrows */}
                <button className="sv-nav sv-nav-left" onClick={e => { e.stopPropagation(); handlePrevStory(); }}>
                  <ChevronLeft size={28} />
                </button>
                <button className="sv-nav sv-nav-right" onClick={e => { e.stopPropagation(); handleNextStory(); }}>
                  <ChevronRight size={28} />
                </button>
              </div>
            );
          })()}

          {/* ============ STORY CREATION MODAL – FULL FEATURED ============ */}
          {createStoryOpen && (
            <div className="sc-overlay" onClick={() => setCreateStoryOpen(false)}>
              <div className="sc-modal" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="sc-modal-header">
                  <h3><Camera size={18} /> Create Story</h3>
                  <button onClick={() => setCreateStoryOpen(false)}><X size={20} /></button>
                </div>

                {/* Type Tabs */}
                <div style={{ display: 'flex', gap: '6px', padding: '12px 20px 0', borderBottom: '1px solid var(--heritage-line)' }}>
                  {([['text', '✏️ Text', 'Text/Gradient'], ['image', '🖼️ Image', 'Image'], ['video', '🎬 Video', 'Video'], ['article', '📰 Article', 'Article']] as [string,string,string][]).map(([type, icon, label]) => (
                    <button
                      key={type}
                      onClick={() => setStoryPostType(type as any)}
                      style={{
                        padding: '7px 14px', borderRadius: '8px 8px 0 0', fontSize: '0.82rem', fontWeight: 700,
                        border: '1px solid var(--heritage-line)', borderBottom: 'none', cursor: 'pointer',
                        background: storyPostType === type ? 'var(--heritage-card)' : 'transparent',
                        color: storyPostType === type ? 'var(--primary-color)' : 'var(--heritage-muted)',
                        marginBottom: '-1px', position: 'relative', zIndex: 1
                      }}
                    >{icon} {label}</button>
                  ))}
                </div>

                <div className="sc-controls" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

                  {/* ─── TEXT / GRADIENT ─── */}
                  {storyPostType === 'text' && (
                    <>
                      <div className="sc-control-row">
                        <label className="sc-label">Caption / Story Text</label>
                        <textarea className="sc-textarea" rows={3} value={storyTextContent}
                          onChange={e => setStoryTextContent(e.target.value)}
                          placeholder="Type something inspiring..." />
                      </div>
                      <div className="sc-control-row">
                        <label className="sc-label">Background Gradient</label>
                        <div className="sc-gradient-swatches">
                          {['linear-gradient(135deg,#FF7A1A 0%,#d4af37 100%)','linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
                            'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)','linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
                            'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)','linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
                            'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)','linear-gradient(135deg,#0f2027 0%,#2c5364 100%)'
                          ].map(g => (
                            <button key={g} className={`sc-swatch ${storyBgValue===g?'selected':''}`} style={{background:g}} onClick={()=>setStoryBgValue(g)} />
                          ))}
                        </div>
                      </div>
                      <div className="sc-preview" style={{background:storyBgValue}}>
                        {storyTextContent
                          ? <div className="sc-preview-text">{storyTextContent}</div>
                          : <div className="sc-preview-placeholder"><Camera size={28}/><span>Preview</span></div>}
                      </div>
                    </>
                  )}

                  {/* ─── IMAGE ─── */}
                  {storyPostType === 'image' && (
                    <>
                      <div className="sc-control-row">
                        <label className="sc-label">Upload Method</label>
                        <div className="sc-bg-tabs">
                          <button className={`sc-bg-tab ${storyImageMethod==='device'?'active':''}`} onClick={()=>setStoryImageMethod('device')}><Upload size={13}/> Device</button>
                          <button className={`sc-bg-tab ${storyImageMethod==='url'?'active':''}`} onClick={()=>setStoryImageMethod('url')}><Link size={13}/> URL</button>
                        </div>
                      </div>
                      {storyImageMethod === 'device' ? (
                        <div
                          onClick={() => storyImageInputRef.current?.click()}
                          style={{ border: '2px dashed var(--heritage-line)', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.02)' }}
                        >
                          <Upload size={24} style={{ color: 'var(--primary-color)', marginBottom: '6px' }} />
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>Click to browse or drag &amp; drop</p>
                          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--heritage-muted)' }}>JPG, PNG, GIF, WebP · max 10 images</p>
                          <input ref={storyImageInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                            onChange={e => { if (e.target.files) handleStoryImageFiles(Array.from(e.target.files)); e.target.value=''; }} />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input className="sc-url-input" value={storyTempImageUrl} onChange={e=>setStoryTempImageUrl(e.target.value)}
                            onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();handleAddStoryImageUrl();}}} placeholder="Paste image URL..." style={{flex:1}} />
                          <button onClick={handleAddStoryImageUrl} className="sc-publish-btn" style={{width:'auto',padding:'0 16px'}}>Add</button>
                        </div>
                      )}
                      {storyImageItems.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))', gap: '8px', marginTop: '8px' }}>
                          {storyImageItems.map((item, idx) => (
                            <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${item.error?'#fc8181':'var(--heritage-line)'}`, background: 'rgba(0,0,0,0.05)' }}>
                              <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: item.uploading?0.4:1 }} />
                              {item.uploading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}><Loader2 size={16} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} /></div>}
                              {!item.uploading && !item.error && item.url && <div style={{ position: 'absolute', top: 3, left: 3, background: 'rgba(72,187,120,0.9)', borderRadius: '50%', padding: '2px' }}><CheckCircle2 size={10} style={{ color: '#fff' }} /></div>}
                              {item.error && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}><AlertCircle size={14} style={{ color: '#fc8181' }} /></div>}
                              {!item.uploading && <button onClick={()=>setStoryImageItems(prev=>prev.filter((_,i)=>i!==idx))} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={10}/></button>}
                            </div>
                          ))}
                        </div>
                      )}
                      {storyImageItems.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                          {(['original','1:1','4:5','4:3','16:9'] as const).map(r => (
                            <button key={r} onClick={()=>setStoryAspectRatio(r)} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: storyAspectRatio===r?'var(--primary-color)':'rgba(0,0,0,0.04)', color: storyAspectRatio===r?'#fff':'var(--heritage-muted)', border: '1px solid var(--heritage-line)' }}>{r}</button>
                          ))}
                          <button onClick={()=>setStoryFitMode(m=>m==='contain'?'cover':'contain')} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,0,0,0.04)', border: '1px solid var(--heritage-line)', color: 'var(--heritage-muted)' }}>Fit: {storyFitMode}</button>
                        </div>
                      )}
                      <div className="sc-control-row">
                        <label className="sc-label">Tag Classmates (optional)</label>
                        <input className="sc-url-input" value={storyTagClassmates} onChange={e=>setStoryTagClassmates(e.target.value)} placeholder="e.g. Aurobindo, Priya" />
                      </div>
                      <div className="sc-control-row">
                        <label className="sc-label">Caption</label>
                        <textarea className="sc-textarea" rows={2} value={storyTextContent} onChange={e=>setStoryTextContent(e.target.value)} placeholder="Add a caption..." />
                      </div>
                    </>
                  )}

                  {/* ─── VIDEO ─── */}
                  {storyPostType === 'video' && (
                    <>
                      <div className="sc-control-row">
                        <label className="sc-label">Upload Method</label>
                        <div className="sc-bg-tabs">
                          <button className={`sc-bg-tab ${storyVideoMethod==='device'?'active':''}`} onClick={()=>{setStoryVideoMethod('device');clearStoryVideo();setStoryVideoUrl('');}}><Upload size={13}/> Device</button>
                          <button className={`sc-bg-tab ${storyVideoMethod==='url'?'active':''}`} onClick={()=>{setStoryVideoMethod('url');clearStoryVideo();}}><Link size={13}/> URL / YouTube</button>
                        </div>
                      </div>
                      {storyVideoMethod === 'device' ? (
                        !storyVideoPreviewSrc ? (
                          <div onClick={()=>storyVideoInputRef.current?.click()} style={{ border: '2px dashed var(--heritage-line)', borderRadius: '12px', padding: '28px', textAlign: 'center', cursor: 'pointer' }}>
                            <Play size={28} style={{ color: 'var(--primary-color)', marginBottom: '6px' }} />
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>Click to browse or drag &amp; drop a video</p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--heritage-muted)' }}>MP4, MOV, WebM · Max 100 MB</p>
                            <input ref={storyVideoInputRef} type="file" accept="video/*" style={{ display: 'none' }}
                              onChange={e=>{const f=e.target.files?.[0];if(f)handleStoryVideoFile(f);e.target.value='';}} />
                          </div>
                        ) : (
                          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--heritage-line)' }}>
                            <video src={storyVideoPreviewSrc} controls style={{ width: '100%', maxHeight: '220px', display: 'block', objectFit: 'contain', background: '#000' }} />
                            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--heritage-muted)' }}>
                                {storyVideoUploading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                                {!storyVideoUploading && storyVideoCloudUrl && <CheckCircle2 size={14} style={{ color: '#48bb78' }} />}
                                {!storyVideoUploading && storyVideoUploadError && <AlertCircle size={14} style={{ color: '#fc8181' }} />}
                                <span>{storyVideoUploading ? 'Uploading…' : storyVideoUploadError ? `Error: ${storyVideoUploadError}` : `✅ ${storyVideoFileName}`}</span>
                              </div>
                              <button onClick={clearStoryVideo} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--heritage-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><X size={12}/> Remove</button>
                            </div>
                          </div>
                        )
                      ) : (
                        <>
                          <input className="sc-url-input" value={storyVideoUrl} onChange={e=>setStoryVideoUrl(e.target.value)} placeholder="YouTube URL or direct MP4 URL..." />
                          {storyVideoUrl && storyYouTubeId(storyVideoUrl) && (
                            <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--heritage-line)' }}>
                              <iframe src={`https://www.youtube.com/embed/${storyYouTubeId(storyVideoUrl)}`} style={{ width: '100%', height: '180px', border: 'none' }} title="Preview" allowFullScreen />
                            </div>
                          )}
                        </>
                      )}
                      <div className="sc-control-row">
                        <label className="sc-label">Caption</label>
                        <textarea className="sc-textarea" rows={2} value={storyTextContent} onChange={e=>setStoryTextContent(e.target.value)} placeholder="Add a caption..." />
                      </div>
                    </>
                  )}

                  {/* ─── ARTICLE ─── */}
                  {storyPostType === 'article' && (
                    <>
                      <div className="sc-control-row">
                        <label className="sc-label">Article Title</label>
                        <input className="sc-url-input" value={storyArticleTitle} onChange={e=>setStoryArticleTitle(e.target.value)} placeholder="Enter a compelling title..." />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="sc-control-row">
                          <label className="sc-label">Category</label>
                          <select className="sc-url-input" value={storyArticleCategory} onChange={e=>setStoryArticleCategory(e.target.value)} style={{ height: '42px' }}>
                            {['Nostalgia & School Stories','Tech & Innovation','Monastery & Spirituality','Career & Jobs Advice','Centenary Celebrations','General Reflections','Achievements'].map(c=><option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="sc-control-row">
                          <label className="sc-label">Cover Image URL</label>
                          <input className="sc-url-input" value={storyCoverImageUrl} onChange={e=>setStoryCoverImageUrl(e.target.value)} placeholder="https://..." />
                        </div>
                      </div>
                      <div className="sc-control-row">
                        <label className="sc-label">Article Body</label>
                        <textarea className="sc-textarea" rows={5} value={storyTextContent} onChange={e=>setStoryTextContent(e.target.value)} placeholder="Write your article here..." />
                      </div>
                      {storyCoverImageUrl && (
                        <div className="sc-preview" style={{ backgroundImage: `url(${storyCoverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                          <div className="sc-preview-text" style={{ fontSize: '1rem' }}>📰 {storyArticleTitle || 'Article Preview'}</div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Post Story button */}
                  <button className="sc-publish-btn" onClick={handlePublishStory} disabled={storyIsSubmitting}>
                    {storyIsSubmitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Posting...</> : <><Send size={16} /> Post to Story</>}
                  </button>
                  <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                </div>
              </div>
            </div>
          )}
        </main>


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
          {spotlightPeople.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', margin: '20px 0' }}>
              <Star size={36} style={{ marginBottom: '12px', color: 'var(--accent-gold)' }} />
              <p style={{ fontWeight: 600, color: 'white', marginBottom: '8px' }}>No spotlights active yet</p>
              <p style={{ fontSize: '0.85rem' }}>Create an Alumni Spotlight under the news section or nominate an alumnus to showcase their achievements!</p>
            </div>
          ) : (
            <>
              <section className="featured-spotlight">
                <div style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.72)), url(${spotlightPeople[0].image})` }}>
                  <span>Alumnus of the Month</span>
                  <h2>{spotlightPeople[0].name}</h2>
                  <p>Class of {spotlightPeople[0].batch} Â· {spotlightPeople[0].role}</p>
                </div>
                <blockquote>"{spotlightPeople[0].story} This school taught me that legacy is built one bold idea at a time."</blockquote>
                <footer><p><span>Awards</span><strong>12 Global Honors</strong></p><p><span>Patents</span><strong>34 Filed</strong></p><button><BookOpen size={20} /> Read Full Story</button></footer>
              </section>
              <div className="spotlight-grid-head"><h2>More Spotlights</h2><button>View all <span aria-hidden="true">â€º</span></button></div>
              <section className="spotlight-card-grid">
                {spotlightPeople.slice(1).map(person => (
                  <article key={person.name}>
                    <img src={person.image} alt={person.name} />
                    <h3>{person.name}</h3>
                    <span>Batch of {person.batch}</span>
                    <p>{person.story}</p>
                    <button onClick={() => showToast(`Viewing ${person.name}'s profile.`, 'info')}>View Profile <span aria-hidden="true">â€º</span></button>
                  </article>
                ))}
              </section>
            </>
          )}
          <section className="nominate-band">
            <Award size={38} />
            <div><h2>Know an inspiring alumnus?</h2><p>Nominate a fellow graduate to be featured in our next spotlight.</p></div>
            <button onClick={() => showToast('Nomination form opened.', 'info')}><UserPlus size={20} /> Nominate an Alumnus</button>
          </section>
        </main>
        <aside className="notifications-panel">
          <h2><Bell size={22} /> Notifications <span>7 new</span></h2>
          {['Sophia Patel sent you a connection request.', 'Diego Morales and 12 others liked your post.', 'Dr. Amara Tesfaye commented: Great to reconnect after all these years!', 'Reminder: The Centennial Gala Reunion starts in 2 days.', 'Batch of 1998 group has 8 new posts today.'].map((item, index) => {
            const getSidebarRoute = (text: string) => {
              if (text.includes('connection')) return 'directory';
              if (text.includes('Reunion') || text.includes('Event')) return 'events';
              if (text.includes('liked') || text.includes('commented') || text.includes('posts')) return 'feed';
              return null;
            };
            const route = getSidebarRoute(item);
            return (
              <p 
                key={item} 
                onClick={() => route && onNavigate && onNavigate(route)}
                className="sidebar-notification-item"
              >
                <strong>{item.split(' ')[0]} {item.split(' ')[1]}</strong>
                {item.replace(`${item.split(' ')[0]} ${item.split(' ')[1]}`, '')}
                <small>{index + 1}h ago</small>
              </p>
            );
          })}
          <button onClick={() => onNavigate && onNavigate('notifications')}>View all notifications</button>
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
            <div><Calendar size={18} /><strong>20-Year Gala</strong><small>Dec 14, 2026 Â· Main Hall</small></div>
            <h3>Batchmates</h3>
            {['Arjun Mehta', 'Priya Sharma', 'Rohan Das'].map((name, index) => <p key={name}><img src={`https://images.unsplash.com/photo-${index === 0 ? '1500648767791-00dcc994a43e' : index === 1 ? '1494790108377-be9c29b29330' : '1506794778202-cad84cf45f1d'}?w=60&h=60&fit=crop&q=80`} alt={name} /> {name}</p>)}
          </section>
          <section className="heritage-widget"><h3><Sparkles size={18} /> Batch Stats</h3><p>Memories shared <strong>412</strong></p><p>Active this week <strong>57</strong></p></section>
        </aside>

        <main>
          <section className="batch-carousel-section">
            <div><h1>Explore Your Batch</h1><p>Connect with alumni from every graduating class</p></div>
            <button>View all <span aria-hidden="true">â€º</span></button>
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
              {derivedMemories.map((memory, index) => (
                <article key={memory.id || index} className={index === 0 || index === 2 ? 'tall' : ''} onClick={() => setActiveMemoryLightbox({ media_urls: [memory.image], content: memory.text, author: { full_name: memory.name, batch_year: typeof memory.batch === 'number' ? memory.batch : parseInt(memory.batch) || 0, profile_photo: memory.rawPost?.author?.profile_photo || currentUser.profile_photo }, comments: memory.rawPost?.comments || [] })}>
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

    // Helper states for follow and connection actions
    const isFollowed = followedUserIds.includes(profileUser.id);
    const isConnected = connectedUserIds.includes(profileUser.id) || connectionSentIds.includes(profileUser.id);

    const toggleFollow = () => {
      if (isFollowed) {
        setFollowedUserIds(prev => prev.filter(id => id !== profileUser.id));
        showToast(`Unfollowed ${person.full_name}`, 'info');
      } else {
        setFollowedUserIds(prev => [...prev, profileUser.id]);
        showToast(`Followed ${person.full_name}`, 'success');
      }
    };

    const handleConnectClick = () => {
      if (isConnected) {
        showToast(`Already requested/connected with ${person.full_name}`, 'info');
      } else {
        handleConnectRequest(profileUser.id, person.full_name);
        setConnectedUserIds(prev => [...prev, profileUser.id]);
      }
    };

    // Special badges helper
    const userBadges: { label: string; icon: string; color: string; border: string; textColor: string }[] = [];
    if (profileUser.role === 'admin') {
      userBadges.push({ label: 'Admin', icon: '🛡️', color: 'rgba(255, 122, 26, 0.1)', border: '1px solid rgba(255, 122, 26, 0.3)', textColor: 'var(--primary-color)' });
    }
    if (profileUser.verify_status === 'approved') {
      userBadges.push({ label: 'Verified Alumni', icon: '✓', color: 'rgba(0, 149, 246, 0.1)', border: '1px solid rgba(0, 149, 246, 0.3)', textColor: '#0095f6' });
    }
    if (person.batch_year && person.batch_year <= 2005) {
      userBadges.push({ label: 'Distinguished', icon: '🏆', color: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', textColor: '#b38b10' });
    }
    if (person.profession && (person.profession.includes('Architect') || person.profession.includes('Consultant') || person.profession.includes('Officer') || person.profession.includes('Doctor'))) {
      userBadges.push({ label: 'Mentor', icon: '💼', color: 'rgba(255, 122, 26, 0.15)', border: '1px solid rgba(255, 122, 26, 0.3)', textColor: '#FF7A1A' });
    }
    if (profileUser.email === 'aurobindo@google.com') {
      userBadges.push({ label: 'Founder', icon: '🚀', color: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', textColor: '#8b5cf6' });
      userBadges.push({ label: 'Speaker', icon: '🎤', color: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', textColor: '#3b82f6' });
      userBadges.push({ label: 'Contributor', icon: '❤️', color: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', textColor: '#ec4899' });
    }

    // Circular Highlights configuration
    const highlights = [
      { id: 'education', label: '🎓 Education', emoji: '🎓', labelShort: 'Education' },
      { id: 'achievements', label: '🏆 Achievements', emoji: '🏆', labelShort: 'Achievements' },
      { id: 'reunion', label: '📸 Reunion', emoji: '📸', labelShort: 'Reunion' },
      { id: 'career', label: '💼 Career', emoji: '💼', labelShort: 'Career' },
      { id: 'events', label: '🎤 Events', emoji: '🎤', labelShort: 'Events' },
      { id: 'travel', label: '🌍 Travel', emoji: '🌍', labelShort: 'Travel' },
      { id: 'mentorship', label: '🤝 Mentorship', emoji: '🤝', labelShort: 'Mentorship' },
    ];

    const highlightGalleries = {
      education: {
        title: "🎓 Academic Journey",
        desc: "Scholastic memories, high school years, and graduation events.",
        images: [
          "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=600&fit=crop&q=80"
        ]
      },
      achievements: {
        title: "🏆 Honors & Trophies",
        desc: "Special awards, competitions, and scholastic achievements.",
        images: [
          "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1496469888073-80de7e9527c6?w=600&h=600&fit=crop&q=80"
        ]
      },
      reunion: {
        title: "📸 Campus Reunions",
        desc: "Durga Puja gatherings, silver jubilee meetups, and batch dinners.",
        images: [
          "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&h=600&fit=crop&q=80"
        ]
      },
      career: {
        title: "💼 Professional Path",
        desc: "Work milestones, office spaces, developer talks, and tech teams.",
        images: [
          "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=600&fit=crop&q=80"
        ]
      },
      events: {
        title: "🎤 Events & Keynotes",
        desc: "Panel discussions, tech conferences, guest lectures, and webinars.",
        images: [
          "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&h=600&fit=crop&q=80"
        ]
      },
      travel: {
        title: "🌍 Global Journeys",
        desc: "Travel, exploration, and alumni chapters across the globe.",
        images: [
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=600&fit=crop&q=80"
        ]
      },
      mentorship: {
        title: "🤝 Mentorship & Guidance",
        desc: "Helping students, career advice sessions, mock interview prep.",
        images: [
          "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=600&h=600&fit=crop&q=80",
          "https://images.unsplash.com/photo-1521791136368-1a869372658b?w=600&h=600&fit=crop&q=80"
        ]
      }
    };

    // Filter posts for Saved tab (from bookmarks stored in localStorage)
    const savedPosts = posts.filter(p => bookmarks.includes(p.id));

    // Connected users (connections tab mock data)
    const activeConnections = discoverAlumni.filter(u => u.id !== profileUser.id).slice(0, 4);

    return (
      <div className="profile-ig-layout" style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* 1. TOP CARD: Header, details, and stats */}
        <div className="profile-card">
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Avatar with colorful story gradient ring */}
            <div className="profile-avatar-gradient-ring">
              <img 
                src={person.profile_photo || currentUser.profile_photo} 
                alt={person.full_name} 
                style={{ width: '130px', height: '130px' }}
              />
            </div>

            {/* Profile Info Details */}
            <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {person.full_name || currentUser.full_name}
                </h2>
                
                {/* Badge pills */}
                {userBadges.map((badge, idx) => (
                  <span key={idx} className="profile-header-badge" title={badge.label}>
                    <span style={{ fontSize: '0.9rem' }}>{badge.icon}</span> {badge.label}
                  </span>
                ))}

                <span className="profile-header-badge">
                  Class of {person.batch_year || currentUser.batch_year}
                </span>
              </div>

              <div style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 500 }}>
                {person.profession || currentUser.profession} at {person.company || currentUser.company || 'Not specified'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', color: '#64748b' }}>
                <MapPin size={14} style={{ color: '#f43f5e' }} /> 
                {person.city || currentUser.city || 'Not specified'}, {person.country || currentUser.country || 'India'}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                {profileUser.id !== currentUser.id && (
                  <>
                    <button 
                      onClick={toggleFollow} 
                      className={isFollowed ? "btn-ig-grey" : "btn-ig-black"}
                    >
                      {isFollowed ? '✓ Following' : 'Follow'}
                    </button>
                    <button 
                      onClick={handleConnectClick} 
                      className="btn-ig-grey"
                    >
                      {isConnected ? (
                        <>
                          <Check size={16} /> Connected
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} /> Connect
                        </>
                      )}
                    </button>
                  </>
                )}
                <button 
                  onClick={() => showToast(`Opening chat with ${person.full_name}`, 'info')} 
                  className="btn-ig-grey"
                >
                  <MessageCircle size={16} /> Message
                </button>
              </div>
            </div>
          </div>

          {/* Metrics/Stats Row at the bottom of the top card */}
          <div className="profile-stats-grid">
            <div className="profile-stat-box">
              <span className="profile-stat-number">{profilePosts.length}</span>
              <span className="profile-stat-label">Posts</span>
            </div>
            <div className="profile-stat-box">
              <span className="profile-stat-number">{142 + (isFollowed ? 1 : 0)}</span>
              <span className="profile-stat-label">Followers</span>
            </div>
            <div className="profile-stat-box">
              <span className="profile-stat-number">312</span>
              <span className="profile-stat-label">Following</span>
            </div>
            <div className="profile-stat-box">
              <span className="profile-stat-number">{45 + (isConnected ? 1 : 0)}</span>
              <span className="profile-stat-label">Connections</span>
            </div>
            <div className="profile-stat-box">
              <span className="profile-stat-number">{person.batch_year && person.batch_year <= 2005 ? 12 : 3}</span>
              <span className="profile-stat-label">Mentorships</span>
            </div>
          </div>
        </div>

        {/* 2. MIDDLE ROW: About & Highlights Cards side-by-side */}
        <div className="profile-middle-grid">
          {/* About Card */}
          <div className="profile-card profile-middle-left" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: '#a855f7' }} /> About
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              {person.bio || "Proud alumnus of RKMV Deoghar, joining the Vidyapith Connect network to share experiences, support students, and stay connected with the community."}
            </p>
            <div>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); showToast("Opening alumni portfolio website...", "info"); }} 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}
              >
                <Globe size={14} style={{ color: '#3b82f6' }} /> {person.full_name ? person.full_name.toLowerCase().replace(/\s+/g, '') + '.dev' : 'portfolio.dev'}
              </a>
            </div>
          </div>

          {/* Highlights Card */}
          <div className="profile-card profile-middle-right" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} style={{ color: '#22c55e' }} /> Highlights
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {highlights.map(h => (
                <div 
                  key={h.id} 
                  onClick={() => setSelectedHighlightForGallery(h.id)}
                  style={{
                    background: '#f1f5f9',
                    color: '#0f172a',
                    borderRadius: '9999px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = '#e2e8f0';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
                  }}
                >
                  {h.emoji} {h.labelShort}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. BOTTOM CARD: Profile Tabs Navigation */}
        <div className="profile-card" style={{ padding: '24px 32px' }}>
          <div className="profile-tabs-header">
            <span className="profile-tabs-title">
              <Grid size={16} /> Profile Tabs
            </span>
            <span className="profile-tabs-selected-label">
              {profileTab.charAt(0).toUpperCase() + profileTab.slice(1)} selected
            </span>
          </div>

          <div className="profile-tabs-pills-row">
            <button 
              onClick={() => setProfileTab('posts')} 
              className={`profile-tab-pill ${profileTab === 'posts' ? 'active' : ''}`}
            >
              <Grid size={14} /> Posts
            </button>
            <button 
              onClick={() => setProfileTab('reels')} 
              className={`profile-tab-pill ${profileTab === 'reels' ? 'active' : ''}`}
            >
              <Film size={14} /> Reels
            </button>
            <button 
              onClick={() => setProfileTab('connections')} 
              className={`profile-tab-pill ${profileTab === 'connections' ? 'active' : ''}`}
            >
              <Users size={14} /> Connections
            </button>
            <button 
              onClick={() => setProfileTab('network')} 
              className={`profile-tab-pill ${profileTab === 'network' ? 'active' : ''}`}
            >
              <GraduationCap size={14} /> Network
            </button>
            <button 
              onClick={() => setProfileTab('career')} 
              className={`profile-tab-pill ${profileTab === 'career' ? 'active' : ''}`}
            >
              <Briefcase size={14} /> Career
            </button>
            <button 
              onClick={() => setProfileTab('achievements')} 
              className={`profile-tab-pill ${profileTab === 'achievements' ? 'active' : ''}`}
            >
              <Trophy size={14} /> Badges
            </button>
            <button 
              onClick={() => setProfileTab('saved')} 
              className={`profile-tab-pill ${profileTab === 'saved' ? 'active' : ''}`}
            >
              <Bookmark size={14} /> Saved
            </button>
          </div>

          {/* DYNAMIC TAB CONTENT */}
          <div style={{ minHeight: '300px' }}>
            
            {/* Posts Tab */}
            {profileTab === 'posts' && (
              profilePosts.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', padding: '40px 0' }}>No posts published yet.</p>
              ) : (
                <div className="profile-ig-post-grid">
                  {profilePosts.map((post: any) => {
                    const postImages = (post.media_urls || []).filter((url: string) => url && url.startsWith('http') && !url.startsWith('{'));
                    const hasImage = postImages.length > 0;
                    return (
                      <div 
                        key={post.id} 
                        className="profile-ig-post-card" 
                        onClick={() => setSelectedPostForModal(post)}
                      >
                        {hasImage ? (
                          <img src={postImages[0]} alt="Post media" className="profile-ig-post-card-img" />
                        ) : (
                          <div className="profile-ig-post-card-text">
                            <div className="profile-ig-post-card-text-header">
                              <span>📝 Text Share</span>
                              <span style={{ fontSize: '0.65rem', color: '#999' }}>{formatTimeAgo(post.created_at)}</span>
                            </div>
                            <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', margin: '8px 0 0 0', fontWeight: 500 }}>
                              {post.content}
                            </p>
                            <span style={{ fontSize: '0.72rem', color: 'var(--primary-color)', fontWeight: 700 }}>Read full post ›</span>
                          </div>
                        )}
                        <div className="profile-ig-post-card-overlay">
                          <span className="profile-ig-post-card-overlay-item">
                            <Heart size={18} fill="white" /> {(post.likes || []).length || 0}
                          </span>
                          <span className="profile-ig-post-card-overlay-item">
                            <MessageSquare size={18} fill="white" /> {((post as any).comments || []).length || 0}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Reels Tab */}
            {profileTab === 'reels' && (
              (() => {
                const reels = profilePosts.filter(p => p.post_type === 'video');
                return reels.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', padding: '40px 0' }}>No video reels uploaded yet.</p>
                ) : (
                  <div className="profile-ig-post-grid">
                    {reels.map((post: any) => {
                      const videoSrc = post.media_urls?.[0];
                      return (
                        <div 
                          key={post.id} 
                          className="profile-ig-post-card" 
                          onClick={() => setSelectedPostForModal(post)}
                        >
                          <div className="profile-ig-post-card-text" style={{ background: '#000', color: '#fff', justifyContent: 'center', alignItems: 'center' }}>
                            <Play size={40} style={{ color: 'var(--primary-color)', opacity: 0.8 }} />
                            <span style={{ position: 'absolute', bottom: '12px', left: '12px', fontSize: '0.75rem', fontWeight: 600 }}>📹 Video Reel</span>
                          </div>
                          <div className="profile-ig-post-card-overlay">
                            <span className="profile-ig-post-card-overlay-item">
                              <Heart size={18} fill="white" /> {(post.likes || []).length || 0}
                            </span>
                            <span className="profile-ig-post-card-overlay-item">
                              <MessageSquare size={18} fill="white" /> {((post as any).comments || []).length || 0}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}

            {/* Connections Tab */}
            {profileTab === 'connections' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {activeConnections.map(cUser => (
                  <div 
                    key={cUser.id} 
                    className="profile-ig-widget" 
                    style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => onViewProfile(cUser.id)}
                  >
                    <img src={cUser.profile_photo} alt={cUser.full_name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>{cUser.full_name}</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>Class of {cUser.batch_year} · {cUser.profession}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); showToast(`Opening chat with ${cUser.full_name}`, 'info'); }}
                      className="btn-ig-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      Chat
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Network Tab */}
            {profileTab === 'network' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="profile-ig-widget">
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700 }}>Monastic and School Leadership</h4>
                  <p style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#4a5568' }}>
                    Connected directly via Ramakrishna Mission Vidyapith, Deoghar administration team. Verified members can request academic logs and support services.
                  </p>
                  <div style={{ borderTop: '1px solid #efefef', paddingTop: '10px', marginTop: '10px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Principal Secretary Office</span>
                    <a href="mailto:deoghar@rkmm.org" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>deoghar@rkmm.org</a>
                  </div>
                </div>
                <div className="profile-ig-widget">
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700 }}>Global RKMV Alumni Committee</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
                    <span>President (Dr. E. Whitman)</span>
                    <strong style={{ color: '#4a5568' }}>Class of 1968</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span>Secretary (A. Ghosh)</span>
                    <strong style={{ color: '#4a5568' }}>Class of 1995</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Career Tab */}
            {profileTab === 'career' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="profile-ig-widget">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--primary-color)', fontWeight: 700 }}>Career referral posting</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Active</span>
                  </div>
                  <h4 style={{ margin: '8px 0 4px 0', fontSize: '1rem', fontWeight: 700 }}>Senior Software Architect - Google Cloud</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#4a5568', lineHeight: 1.45 }}>
                    Referring junior alumni developers for Kubernetes & distributed platforms teams. Mentoring eligible applicants who have 2+ years experience.
                  </p>
                  <button onClick={() => showToast("Job referral guidelines copied to message window.", "success")} className="btn-ig-secondary" style={{ marginTop: '12px', width: '100%', fontSize: '0.78rem' }}>Request Referral</button>
                </div>
              </div>
            )}

            {/* Achievements Tab */}
            {profileTab === 'achievements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="profile-ig-widget" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <span style={{ fontSize: '2rem' }}>🏆</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Centenary Valedictorian Honor</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Awarded for dedication towards building the Vidyapith Connect digital portal.</p>
                  </div>
                </div>
                <div className="profile-ig-widget" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <span style={{ fontSize: '2rem' }}>🎓</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Ramakrishna Order Scholarship Award</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Received for scholastic excellence during high school boarding years.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Saved Tab */}
            {profileTab === 'saved' && (
              savedPosts.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', padding: '40px 0' }}>No bookmarked posts found.</p>
              ) : (
                <div className="profile-ig-post-grid">
                  {savedPosts.map((post: any) => {
                    const postImages = (post.media_urls || []).filter((url: string) => url && url.startsWith('http') && !url.startsWith('{'));
                    const hasImage = postImages.length > 0;
                    return (
                      <div 
                        key={post.id} 
                        className="profile-ig-post-card" 
                        onClick={() => setSelectedPostForModal(post)}
                      >
                        {hasImage ? (
                          <img src={postImages[0]} alt="Post media" className="profile-ig-post-card-img" />
                        ) : (
                          <div className="profile-ig-post-card-text">
                            <div className="profile-ig-post-card-text-header">
                              <span>📝 Text Share</span>
                            </div>
                            <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', margin: '8px 0 0 0', fontSize: '0.8rem' }}>
                              {post.content}
                            </p>
                          </div>
                        )}
                        <div className="profile-ig-post-card-overlay">
                          <span className="profile-ig-post-card-overlay-item">
                            <Heart size={18} fill="white" /> {(post.likes || []).length || 0}
                          </span>
                          <span className="profile-ig-post-card-overlay-item">
                            <MessageSquare size={18} fill="white" /> {((post as any).comments || []).length || 0}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>



        {/* POST MODAL OVERLAY */}
        {selectedPostForModal && (
          (() => {
            const author = selectedPostForModal.author || profileUser;
            const postImages = (selectedPostForModal.media_urls || []).filter((url: string) => url && url.startsWith('http') && !url.startsWith('{'));
            const isTextOnly = postImages.length === 0;
            return (
              <div 
                className="modal-overlay" 
                onClick={() => setSelectedPostForModal(null)}
                style={{ zIndex: 1100 }}
              >
                <div 
                  className="modal-card" 
                  onClick={(e) => e.stopPropagation()}
                  style={{ 
                    maxWidth: '960px', 
                    width: '90%', 
                    padding: 0, 
                    display: 'flex', 
                    flexDirection: 'row', 
                    borderRadius: '16px',
                    height: '80vh',
                    maxHeight: '650px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Left Column: Media */}
                  <div style={{ 
                    flex: '1.2', 
                    background: '#000', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%',
                    position: 'relative'
                  }}>
                    {!isTextOnly ? (
                      <img 
                        src={postImages[0]} 
                        alt="Post media" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                      />
                    ) : (
                      <div style={{
                        padding: '40px',
                        color: 'white',
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, #FF7A1A 0%, #d4af37 100%)',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        lineHeight: 1.6
                      }}>
                        "{selectedPostForModal.content}"
                      </div>
                    )}
                  </div>

                  {/* Right Column: Author, comments, input */}
                  <div style={{ 
                    flex: '1', 
                    background: '#fff', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%',
                    color: '#111',
                    borderLeft: '1px solid #efefef'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderBottom: '1px solid #efefef' }}>
                      <img src={author.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80'} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>{author.full_name || 'Vidyapith Alumnus'}</h4>
                        <span style={{ fontSize: '0.74rem', color: '#8e8e8e' }}>Class of {author.batch_year || '—'}</span>
                      </div>
                      <button onClick={handleConnectClick} className="btn-ig-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                        {isConnected ? "✓ Connected" : "Connect"}
                      </button>
                    </div>

                    {/* Scrollable Comments/Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                      {/* Caption */}
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <img src={author.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80'} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.45 }}>
                            <strong style={{ marginRight: '6px' }}>{author.full_name}</strong>
                            {selectedPostForModal.content}
                          </p>
                          <span style={{ fontSize: '0.72rem', color: '#8e8e8e', display: 'block', marginTop: '4px' }}>
                            {formatTimeAgo(selectedPostForModal.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div style={{ height: '1px', background: '#efefef', margin: '14px 0' }} />

                      {/* Comments list */}
                      {((selectedPostForModal as any).comments || []).length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#8e8e8e', fontSize: '0.8rem', marginTop: '20px' }}>No comments yet. Be the first to share your thoughts!</p>
                      ) : (
                        (selectedPostForModal as any).comments.map((comment: any, cIdx: number) => {
                          const commentAuthor = comment.author || { full_name: "Alumnus", profile_photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80", batch_year: 2012 };
                          return (
                            <div key={cIdx} style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                              <img src={commentAuthor.profile_photo} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                              <div>
                                <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.4 }}>
                                  <strong style={{ marginRight: '6px' }}>{commentAuthor.full_name}</strong>
                                  {comment.content}
                                </p>
                                <span style={{ fontSize: '0.68rem', color: '#8e8e8e', display: 'block', marginTop: '2px' }}>
                                  {formatTimeAgo(comment.created_at || new Date().toISOString())}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer stats & Actions */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #efefef', background: '#fafafa' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <Heart 
                            size={20} 
                            style={{ cursor: 'pointer', color: (selectedPostForModal.likes || []).includes(currentUser.id) ? '#e0245e' : 'inherit' }}
                            fill={(selectedPostForModal.likes || []).includes(currentUser.id) ? '#e0245e' : 'none'}
                            onClick={() => {
                              handleLike(selectedPostForModal.id);
                              // Simple update in local modal state too
                              const isLiked = (selectedPostForModal.likes || []).includes(currentUser.id);
                              const newLikes = isLiked 
                                ? selectedPostForModal.likes.filter((id: string) => id !== currentUser.id)
                                : [...(selectedPostForModal.likes || []), currentUser.id];
                              setSelectedPostForModal({ ...selectedPostForModal, likes: newLikes });
                            }} 
                          />
                          <MessageSquare size={20} style={{ cursor: 'pointer' }} />
                          <Share2 size={20} style={{ cursor: 'pointer' }} onClick={() => showToast("Link copied to clipboard!", "success")} />
                        </div>
                        <Bookmark 
                          size={20} 
                          style={{ cursor: 'pointer', color: bookmarks.includes(selectedPostForModal.id) ? 'var(--primary-color)' : 'inherit' }}
                          fill={bookmarks.includes(selectedPostForModal.id) ? 'var(--primary-color)' : 'none'}
                          onClick={() => {
                            toggleBookmark(selectedPostForModal.id);
                          }}
                        />
                      </div>
                      <strong style={{ fontSize: '0.85rem' }}>{(selectedPostForModal.likes || []).length || 0} likes</strong>
                    </div>

                    {/* Comment Form */}
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const inputEl = e.currentTarget.elements.namedItem('commentInput') as HTMLInputElement;
                        const content = inputEl.value.trim();
                        if (!content) return;
                        
                        try {
                          const newComment = await apiFetch(`/posts/${selectedPostForModal.id}/comments`, {
                            method: 'POST',
                            body: JSON.stringify({ content })
                          });
                          
                          // Update comments local list inside modal
                          const updatedComments = [...(selectedPostForModal.comments || []), {
                            ...newComment,
                            author: currentUser
                          }];
                          setSelectedPostForModal({ ...selectedPostForModal, comments: updatedComments });
                          inputEl.value = '';
                          showToast("Comment published!", "success");
                        } catch (err: any) {
                          showToast(err.message, "danger");
                        }
                      }}
                      style={{ display: 'flex', borderTop: '1px solid #efefef' }}
                    >
                      <input 
                        type="text" 
                        name="commentInput" 
                        placeholder="Add a comment..." 
                        autoComplete="off"
                        style={{ flex: 1, padding: '16px', border: 'none', outline: 'none', fontSize: '0.85rem' }} 
                      />
                      <button 
                        type="submit" 
                        style={{ padding: '0 16px', background: 'none', border: 'none', color: '#0095f6', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        Post
                      </button>
                    </form>

                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* HIGHLIGHT STORY LIGHTBOX MODAL */}
        {selectedHighlightForGallery && (
          (() => {
            const gallery = (highlightGalleries as any)[selectedHighlightForGallery];
            return (
              <div 
                className="modal-overlay" 
                onClick={() => setSelectedHighlightForGallery(null)}
                style={{ zIndex: 1100, background: 'rgba(0, 0, 0, 0.95)' }}
              >
                <div 
                  className="modal-card" 
                  onClick={(e) => e.stopPropagation()}
                  style={{ 
                    maxWidth: '480px', 
                    width: '90%', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    background: '#1a1a1a', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  <button 
                    onClick={() => setSelectedHighlightForGallery(null)}
                    style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>

                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-color)' }}>{gallery.title}</h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: '#aaa', textAlign: 'center' }}>{gallery.desc}</p>
                  
                  {/* Carousel of images */}
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                    <img src={gallery.images[0]} alt="Gallery image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    {gallery.images.map((imgUrl: string, imgIdx: number) => (
                      <div 
                        key={imgIdx} 
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: imgIdx === 0 ? 'var(--primary-color)' : '#555' 
                        }} 
                      />
                    ))}
                  </div>

                  <button 
                    onClick={() => {
                      showToast("Opened full gallery inside archives tab.", "info");
                      setSelectedHighlightForGallery(null);
                    }}
                    className="btn-ig-primary" 
                    style={{ width: '100%', marginTop: '24px' }}
                  >
                    View Full Gallery
                  </button>
                </div>
              </div>
            );
          })()
        )}

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
                      Batch of {profileUser.profile?.batch_year || 2008} â€¢ {profileUser.profile?.house || "Vivekananda House"}
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
                    <div className="gamified-badge-item"><span className="gamified-badge-icon">ðŸ”¥</span> Consistency Master</div>
                    <div className="gamified-badge-item"><span className="gamified-badge-icon">ðŸŽ“</span> Top Mentor</div>
                    <div className="gamified-badge-item"><span className="gamified-badge-icon">ðŸ’»</span> DSA Expert</div>
                    <div className="gamified-badge-item"><span className="gamified-badge-icon">ðŸ…</span> 30-Day Streak</div>
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
                        <button type="button" onClick={() => handleMemoryAssistantClick('caption')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>âœ¨ Suggest Nostalgic Caption</button>
                        <button type="button" onClick={() => handleMemoryAssistantClick('story')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>âœï¸ Improve School Story</button>
                        <button type="button" onClick={() => handleMemoryAssistantClick('idea')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>ðŸ’¡ Generate Post Idea</button>
                        <button type="button" onClick={() => handleMemoryAssistantClick('reunion')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>âœ‰ï¸ Draft Reunion Invitation</button>
                        <button type="button" onClick={() => handleMemoryAssistantClick('event')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>ðŸ“… Generate Event Desc</button>
                        <button type="button" onClick={() => handleMemoryAssistantClick('announcement')} style={{ background: 'none', border: 'none', color: 'white', textAlign: 'left', padding: '6px 8px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '6px', width: '100%', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,26,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>ðŸ“¢ Polishing Announcement</button>
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
                    <option value="Public">ðŸŒ Public Alumni Network</option>
                    <option value="Batch Only">ðŸ‘¥ My Batch Only</option>
                    <option value="School Community">ðŸ« School Community</option>
                    <option value="Mentors Only">ðŸ¤ Mentors Only</option>
                    <option value="Alumni Committee">ðŸ›¡ï¸ Alumni Committee</option>
                    <option value="Private Draft">ðŸ“ Private Draft</option>
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
                  {currentUser.profession || 'Alumnus'} {currentUser.company ? `â€¢ ${currentUser.company}` : ''}
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
                  ðŸ‘¤ @Mention Alumni
                </button>
                <button type="button" onClick={() => appendSuggestion('#ClassOf' + currentUser.batch_year)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  ðŸ‘¥ #BatchTag
                </button>
                <button type="button" onClick={() => appendSuggestion('#SchoolMemories')} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  ðŸ« #SchoolMemories
                </button>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Actions</span>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                <button type="button" onClick={() => { setPostMediaType('photo'); showToast("Memory photo mode active!", "info"); }} style={{ background: 'rgba(255, 122, 26, 0.08)', border: '1px solid rgba(255, 122, 26, 0.2)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.15)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.08)'}>
                  ðŸ“¸ Add School Memory
                </button>
                <button type="button" onClick={() => { setShowNostalgiaPanel(true); showToast("Targeting options expanded!", "info"); }} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}>
                  ðŸ‘¥ Tag Batchmates
                </button>
                <button type="button" onClick={() => { setPostMediaType('event'); showToast("Reunion event creation active!", "info"); }} style={{ background: 'rgba(255, 122, 26, 0.08)', border: '1px solid rgba(255, 122, 26, 0.2)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.15)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.08)'}>
                  ðŸ“… Create Reunion
                </button>
                <button type="button" onClick={() => { setPostMediaType('achievement'); showToast("Achievement celebration active!", "info"); }} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}>
                  ðŸŽ‰ Celebrate Achievement
                </button>
                <button type="button" onClick={() => { setPostMediaType('mentorship'); showToast("Mentorship pairing active!", "info"); }} style={{ background: 'rgba(255, 122, 26, 0.08)', border: '1px solid rgba(255, 122, 26, 0.2)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.15)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 122, 26, 0.08)'}>
                  ðŸ¤ Offer Mentorship
                </button>
                <button type="button" onClick={() => { setPostMediaType('career'); showToast("Career milestone opportunity active!", "info"); }} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}>
                  ðŸ’¼ Share Opportunity
                </button>
              </div>
            </div>

            {/* Segmented Media Selector (Upgraded pills) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Post Category</span>
              <div className="composer-media-tabs" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'text', label: 'Update', icon: 'ðŸ“' },
                  { id: 'photo', label: 'School Memory', icon: 'ðŸ“¸' },
                  { id: 'video', label: 'Video Clip', icon: 'ðŸŽ¥' },
                  { id: 'achievement', label: 'Achievement', icon: 'ðŸŽ‰' },
                  { id: 'career', label: 'Career Update', icon: 'ðŸ’¼' },
                  { id: 'mentorship', label: 'Mentorship', icon: 'ðŸ¤' },
                  { id: 'event', label: 'Reunion Event', icon: 'ðŸ“…' },
                  { id: 'story', label: 'School Story', icon: 'ðŸ«' },
                  { id: 'announcement', label: 'Announcement', icon: 'ðŸ“¢' },
                  { id: 'spotlight', label: 'Alumni Spotlight', icon: 'ðŸ’¡' },
                  { id: 'tribute', label: 'Tribute Post', icon: 'â¤ï¸' }
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
                  <span style={{ fontSize: '1.6rem', display: 'block', marginBottom: '4px' }}>ðŸ“¤</span>
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
                          >âœ•</button>
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
                      <option value="School Ambassador">ðŸµï¸ School Ambassador</option>
                      <option value="Top Mentor">ðŸ¤ Top Mentor</option>
                      <option value="Community Builder">ðŸ—ï¸ Community Builder</option>
                      <option value="Career Guide">ðŸ’¼ Career Guide</option>
                      <option value="Event Organizer">ðŸŽ‰ Event Organizer</option>
                      <option value="Memory Keeper">ðŸ“¸ Memory Keeper</option>
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
                    <option value="Urgent">ðŸš¨ Urgent</option>
                    <option value="Important">ðŸŒŸ Important</option>
                    <option value="Standard">ðŸ“Œ Standard</option>
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
                <span>{showNostalgiaPanel ? 'â–¼' : 'â–¶'} Nostalgic Targeting & Extra Details</span>
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
                  <option value="grp-all">ðŸ“¢ Alumni Feed</option>
                  <option value={`grp-${currentUser.batch_year}`}>ðŸ‘¥ Batch Community</option>
                  <option value="grp-career">ðŸ’¼ Career Network</option>
                  <option value="grp-mentorship">ðŸ¤ Mentorship Hub</option>
                  <option value="grp-reunion">ðŸ“… Reunion Planning</option>
                  <option value="grp-school">ðŸ« School Announcements</option>
                  <option value="grp-business">ðŸ’° Business Network</option>
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
                      (() => {
                        const carouselImages = (post.media_urls || []).filter(
                          (url: string) => url && url.startsWith('http') && !url.startsWith('{') && url !== 'Memory Photo'
                        );
                        if (carouselImages.length === 0) return null;

                        const imageLayout = extraNostalgia?.imageLayout || { aspectRatio: 'original', objectFit: 'contain' };
                        const finalAspectRatio = imageLayout.aspectRatio === 'original' 
                          ? 'auto' 
                          : (imageLayout.aspectRatio === '1:1' 
                            ? '1' 
                            : imageLayout.aspectRatio === '4:3' 
                              ? '4/3' 
                              : imageLayout.aspectRatio === '16:9' 
                                ? '16/9' 
                                : '4/5');

                        return (
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
                              {carouselImages.map((imgUrl, idx) => (
                                <img 
                                  key={idx}
                                  src={imgUrl} 
                                  className="post-card-media-img" 
                                  style={{ 
                                    width: '100%', 
                                    minWidth: '100%', 
                                    aspectRatio: carouselImages.length === 1 ? finalAspectRatio : '1',
                                    objectFit: carouselImages.length === 1 ? (imageLayout.objectFit || 'contain') : 'cover',
                                    maxHeight: '500px',
                                    background: (carouselImages.length === 1 && imageLayout.objectFit === 'contain') ? '#0f172a' : 'transparent',
                                  }}
                                  alt={`attachment-${idx}`} 
                                />
                              ))}
                            </div>

                            {/* Controls */}
                            {carouselImages.length > 1 && (
                              <>
                                <button className="carousel-control-btn prev" onClick={() => handleSlideChange(post.id, 'prev', carouselImages.length)}>
                                  <ChevronLeft size={18} />
                                </button>
                                <button className="carousel-control-btn next" onClick={() => handleSlideChange(post.id, 'next', carouselImages.length)}>
                                  <ChevronRight size={18} />
                                </button>
                                <div className="carousel-progress-dots">
                                  {carouselImages.map((_, i) => (
                                    <div key={i} className={`carousel-dot ${(carouselActiveIndexes[post.id] || 0) === i ? 'active' : ''}`} />
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()
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
                          <div className="pdf-icon-wrap">ðŸ“„</div>
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
                              <span style={{ fontSize: '1.25rem' }}>ðŸ†</span>
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
                              <span style={{ fontSize: '1.2rem' }}>ðŸ’¼</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>{post.media_urls[0]}</span>
                            </div>
                            {post.media_urls[3] === 'yes' && (
                              <span className="badge badge-role" style={{ fontSize: '0.68rem', background: 'rgba(104,211,145,0.15)', borderColor: 'var(--text-success)', color: 'var(--text-success)' }}>
                                ðŸŸ¢ Referral Available
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                            Company: {post.media_urls[1]} {post.media_urls[2] ? `â€¢ ${post.media_urls[2]}` : ''}
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
                              <span style={{ fontSize: '1.2rem' }}>ðŸ¤</span>
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
                              <span style={{ fontSize: '1.25rem' }}>ðŸ“…</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>{post.media_urls[0]}</span>
                            </div>
                            <span className="badge" style={{ fontSize: '0.68rem', background: 'var(--primary-gradient)', color: 'white' }}>
                              Alumni Event
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', display: 'flex', gap: '12px' }}>
                            <span>ðŸ•’ {post.media_urls[1]}</span>
                            {post.media_urls[2] && <span>ðŸ“ {post.media_urls[2]}</span>}
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
                              <span style={{ fontSize: '1.2rem' }}>ðŸ«</span>
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
                              <span style={{ fontSize: '1.2rem' }}>ðŸ“¢</span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-danger)' }}>Alumni Announcement</span>
                            </div>
                            <span className="badge" style={{ fontSize: '0.68rem', background: 'rgba(252, 129, 129, 0.15)', color: 'var(--text-danger)' }}>
                              ðŸš¨ {post.media_urls[0]} Priority
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
                              <span style={{ fontSize: '1.25rem' }}>ðŸ’¡</span>
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
                              <span style={{ fontSize: '1.25rem' }}>â¤ï¸</span>
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
                                ðŸ“ {extraNostalgia.memoryLocation}
                              </span>
                            )}
                            {extraNostalgia.targetBatchYear && (
                              <span style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                ðŸ‘¥ Batch: Class of {extraNostalgia.targetBatchYear}
                              </span>
                            )}
                            {extraNostalgia.isReunionPost && (
                              <span style={{ background: 'rgba(255, 122, 26, 0.15)', color: 'var(--primary-color)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 700 }}>
                                ðŸŽ‰ Reunion meetup
                              </span>
                            )}
                          </div>
                          {extraNostalgia.tagClassmates && (
                            <div style={{ color: 'var(--text-secondary)' }}>
                              ðŸ·ï¸ Tagged Classmates: <span style={{ color: '#FF7A1A', fontWeight: 500 }}>{extraNostalgia.tagClassmates}</span>
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
                            {['â¤ï¸', 'ðŸ™Œ', 'ðŸ”¥', 'ðŸ‘', 'ðŸ˜‚', 'ðŸ˜®', 'ðŸ˜¢', 'ðŸ˜'].map(emoji => (
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
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 600 }}>Batch of {alumnus.batch_year} â€¢ {alumnus.house}</span>
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
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Our batch has set a target of â‚¹10,00,000 for the computer lab upgrade. Click Donations in the sidebar to contribute.</p>
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
                  âœ“ Going
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
                  âœ• Cannot Attend
                </button>

                <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Total RSVPs: <strong style={{ color: 'white' }}>{248 + (rsvpStatus === 'going' ? 1 : 0)} Attending</strong> â€¢ 42 Maybe
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Expense & Contribution Ledger</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)' }}>
                    Total: â‚¹{reunionExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
                  </span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {reunionExpenses.map(exp => (
                    <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                      <div>
                        <strong style={{ color: 'white', display: 'block' }}>{exp.title}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Payer: {exp.payer}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>â‚¹{exp.amount.toLocaleString()}</span>
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
                        type="number" placeholder="Amount (â‚¹)" 
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
                  <span style={{ fontSize: '1.2rem' }}>ðŸŽ‚</span>
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
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Google â€¢ Bengaluru (Remote-friendly)</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
                  <strong style={{ color: 'white', display: 'block' }}>Product Manager</strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Microsoft â€¢ Hyderabad</span>
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

      {/* -------------------- INSTAGRAM STORIES VIEWER OVERLAY -------------------- */}
      {activeStoryGroupIndex !== null && (
        <div className="story-viewer-overlay">
          {/* Previous Button (for desktop nav) */}
          <button 
            className="story-nav-chevron prev" 
            onClick={(e) => { e.stopPropagation(); handlePrevStory(); }}
            title="Previous Story"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="story-viewer-container" tabIndex={0} onKeyDown={(e) => {
            if (e.key === 'Escape') closeStoryViewer();
            if (e.key === 'ArrowRight') handleNextStory();
            if (e.key === 'ArrowLeft') handlePrevStory();
          }}>
            {/* Segmented Progress Bars at the top */}
            <div className="story-progress-bar-wrap">
              {getActiveStoriesList().map((item, idx) => {
                let fillWidth = '0%';
                if (idx < activeStoryIndex) fillWidth = '100%';
                else if (idx === activeStoryIndex) fillWidth = `${storyProgress}%`;
                
                return (
                  <div key={item.id} className="story-progress-track">
                    <div 
                      className={`story-progress-fill ${idx === activeStoryIndex ? 'active' : idx < activeStoryIndex ? 'filled' : ''}`} 
                      style={{ width: fillWidth }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Header info */}
            <div className="story-viewer-header">
              <img 
                src={activeStoryGroupIndex === -1 ? currentUser.profile_photo : stories[activeStoryGroupIndex].userAvatar} 
                alt="Avatar" 
              />
              <div className="story-viewer-user-info">
                <span className="story-viewer-name">
                  {activeStoryGroupIndex === -1 ? currentUser.full_name : stories[activeStoryGroupIndex].userName}
                </span>
                <span className="story-viewer-batch-time">
                  Class of {activeStoryGroupIndex === -1 ? currentUser.batch_year : stories[activeStoryGroupIndex].userBatch} Â· {getActiveStoriesList()[activeStoryIndex]?.timestamp}
                </span>
              </div>
              
              <button className="story-close-btn" onClick={closeStoryViewer} title="Close">
                <X size={20} />
              </button>
            </div>

            {/* Interactive content section (pauses on click/hold, advances on click release) */}
            <div 
              className="story-viewer-content" 
              onMouseDown={() => setStoryPaused(true)}
              onMouseUp={() => setStoryPaused(false)}
              onTouchStart={() => setStoryPaused(true)}
              onTouchEnd={() => setStoryPaused(false)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                if (clickX < rect.width * 0.3) {
                  handlePrevStory();
                } else {
                  handleNextStory();
                }
              }}
            >
              {(() => {
                const activeStory = getActiveStoriesList()[activeStoryIndex];
                if (!activeStory) return null;

                if (activeStory.mediaUrl.startsWith('linear-gradient')) {
                  return (
                    <div className="story-text-only-bg" style={{ background: activeStory.mediaUrl }}>
                      <p className="story-text-only-content">{activeStory.text}</p>
                    </div>
                  );
                }

                return (
                  <>
                    <img src={activeStory.mediaUrl} className="story-media-image" alt="Story content" />
                    {activeStory.text && (
                      <div className="story-overlay-text">{activeStory.text}</div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Reply footer */}
            <form className="story-viewer-footer" onSubmit={(e) => { e.preventDefault(); if (storyReplyText.trim()) { showToast('Reply sent!', 'success'); setStoryReplyText(''); } }} onClick={(e) => e.stopPropagation()}>
              <input 
                type="text" 
                placeholder={`Reply to ${activeStoryGroupIndex === -1 ? 'yourself' : stories[activeStoryGroupIndex].userName.split(' ')[0]}...`}
                value={storyReplyText}
                onChange={(e) => setStoryReplyText(e.target.value)}
                onFocus={() => setStoryPaused(true)}
                onBlur={() => setStoryPaused(false)}
                className="story-reply-input"
              />
              <button type="submit" className="story-send-btn" title="Send Reply">
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* Next Button (for desktop nav) */}
          <button 
            className="story-nav-chevron next" 
            onClick={(e) => { e.stopPropagation(); handleNextStory(); }}
            title="Next Story"
          >
            <ChevronRight size={24} />
          </button>
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
            <span style={{ fontSize: '1rem' }}>ðŸ’¬</span>
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
                            <button onClick={() => setPlayingVoiceNoteId(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>â¸ï¸</button>
                          ) : (
                            <button onClick={() => {
                              setPlayingVoiceNoteId(msg.id);
                              setTimeout(() => setPlayingVoiceNoteId(null), 3000);
                            }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>â–¶ï¸</button>
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
                        {msg.time} {isMe && 'âœ“âœ“'}
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
                      text: 'ðŸŽ¤ Voice Note',
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
                  ðŸŽ™ï¸
                </button>
                <button 
                  type="button" 
                  onClick={() => showToast("Simulated: file explorer opened.", "info")}
                  title="Attach File"
                  style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  ðŸ“Ž
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

