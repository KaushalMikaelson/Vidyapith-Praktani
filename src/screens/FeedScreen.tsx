"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Post, Comment } from '../database/database';
import { 
  Send, Image as ImageIcon, MessageCircle, Heart, Bookmark, MoreHorizontal, Pin, Bell, Grid,
  Smile, Share2, Film, Link, FileText, Clipboard, Play, ExternalLink, 
  Sparkles, Check, ChevronLeft, ChevronRight, Download, BookOpen, Eye, 
  Flame, Trophy, Trash2, Plus, ShieldAlert, Award, Search, HelpCircle, 
  Briefcase, Star, Settings, CheckCircle2, AlertTriangle, BookMarked, User as UserIcon, X,
  Calendar, MapPin, Clock, Lock, Tag, MessageSquare, Paperclip, Volume2,
  Users, Camera, ChevronDown, Quote, UserPlus, UserMinus, Loader2, AlertCircle, Upload, Globe, GraduationCap, ShieldCheck, RotateCw,
  Link2, Code2, Phone, Mail, TrendingUp
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { uploadMedia } from '../utils/upload';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';

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
  const { currentUser, refreshSession } = useAuth();
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const getUsername = (user: any) => {
    if (user.email) {
      return user.email.split('@')[0];
    }
    return (user.full_name || 'user').toLowerCase().replace(/\s+/g, '_');
  };

  useEffect(() => {
    const loadNotificationCount = async () => {
      try {
        const notifs = await apiFetch('/notifications');
        setUnreadNotifCount(notifs.filter((n: any) => !n.read).length);
      } catch {}
    };
    loadNotificationCount();
    // NOTE: Layout.tsx already polls notifications every 5s for the sidebar badge.
    // We only do a single fetch here to sync the count on mount.
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
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [recommendedAlumni, setRecommendedAlumni] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState<boolean>(false);
  const [filterChip, setFilterChip] = useState<string>('All');
  const [activeGroupId, setActiveGroupId] = useState<string>('grp-all');
  const [feedTab, setFeedTab] = useState<string>('All');
  const [connections, setConnections] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ postId: string; commentId: string; authorName: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<{ [postId: string]: boolean }>({});
  const [activePostMenuId, setActivePostMenuId] = useState<string | null>(null);
  const [postToDeleteId, setPostToDeleteId] = useState<string | null>(null);


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

  // Load connections for Following tab
  useEffect(() => {
    apiFetch('/directory/connections')
      .then(data => setConnections(data || []))
      .catch(err => console.error("Error loading connections for feed:", err));
  }, []);

  // Debounced search recommendations effect
  useEffect(() => {
    if (!showSearchInput || searchQuery.trim().length < 2) {
      setRecommendedAlumni([]);
      return;
    }

    setLoadingRecommendations(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await apiFetch(`/directory/suggestions?q=${encodeURIComponent(searchQuery.trim())}`);
        setRecommendedAlumni(results || []);
      } catch (err) {
        console.error("Error fetching search recommendations:", err);
      } finally {
        setLoadingRecommendations(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, showSearchInput]);

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
  const [profileRelations, setProfileRelations] = useState<{ followers: any[]; following: any[]; connections: any[] } | null>(null);
  const [activeRelationsTab, setActiveRelationsTab] = useState<'connections' | null>(null);
  const [relationsSearchQuery, setRelationsSearchQuery] = useState('');
  // Real connection status with the currently-viewed profile (fetched from API)
  const [profileConnectionStatus, setProfileConnectionStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted'>('none');
  const [showConnectionDropdown, setShowConnectionDropdown] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  // Edit Profile States
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editBatch, setEditBatch] = useState('');
  const [editLeavingClass, setEditLeavingClass] = useState<'X' | 'XII'>('XII');
  const [editHouse, setEditHouse] = useState('');
  const [editProfession, setEditProfession] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editShowEmail, setEditShowEmail] = useState(true);
  const [editShowMobile, setEditShowMobile] = useState(false);
  const [editShowSocial, setEditShowSocial] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Networking / Mentorship edit states
  const [editLinkedinUrl, setEditLinkedinUrl] = useState('');
  const [editGithubUrl, setEditGithubUrl] = useState('');
  const [editPortfolioUrl, setEditPortfolioUrl] = useState('');
  const [editPersonalUrl, setEditPersonalUrl] = useState('');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editSkillInput, setEditSkillInput] = useState('');
  const [editHelpCategories, setEditHelpCategories] = useState<string[]>([]);
  const [editLookingFor, setEditLookingFor] = useState<string[]>([]);
  const [editMentorshipStatus, setEditMentorshipStatus] = useState('Not Available');
  const [editIndustry, setEditIndustry] = useState('');
  
  // Upgraded Professional edit states
  const [editDesignation, setEditDesignation] = useState('');
  const [editYearsOfExperience, setEditYearsOfExperience] = useState('');
  const [editEducation, setEditEducation] = useState('');
  const [editOpenFor, setEditOpenFor] = useState<string[]>([]);

  // Cropper states
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropRotation, setCropRotation] = useState(0);
  const cropDraggingRef = useRef(false);
  const cropDragStartRef = useRef({ x: 0, y: 0 });
  // Stores a guaranteed-local blob/data URL for canvas rendering (avoids CORS taint)
  const cropLocalSrcRef = useRef<string>('');

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
  // Advanced comment section states
  const [commentLikes, setCommentLikes] = useState<{ [commentId: string]: number }>({});
  const [commentLikedByMe, setCommentLikedByMe] = useState<{ [commentId: string]: boolean }>({});
  const [commentSortMode, setCommentSortMode] = useState<{ [postId: string]: 'newest' | 'top' | 'oldest' }>({});
  const [visibleCommentCount, setVisibleCommentCount] = useState<{ [postId: string]: number }>({});
  const [commentEmojiOpen, setCommentEmojiOpen] = useState<{ [postId: string]: boolean }>({});
  const [activePdfPreviewUrl, setActivePdfPreviewUrl] = useState<string | null>(null);

  // Feature 10: QR Code Profile Sharing Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);

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
    setProfileTab('posts');
    setProfileConnectionStatus('none'); // Reset before loading new profile
    try {
      const uDetails = await apiFetch(`/directory/profile/${targetId}`);
      setProfileUser(uDetails);
      const allPosts = await apiFetch(`/posts?groupId=grp-all`);
      setProfilePosts(allPosts.filter((p: any) => p.author_id === targetId));
      const allAlumni = await apiFetch('/directory');
      setDiscoverAlumni(allAlumni);
      const rels = await apiFetch(`/directory/relations/${targetId}`);
      setProfileRelations(rels);
      // Fetch real connection status between the current user and this profile
      try {
        const statusMap = await apiFetch('/directory/connections/status');
        const rawStatus = statusMap[targetId];
        if (rawStatus === 'accepted') {
          setProfileConnectionStatus('accepted');
        } else if (rawStatus === 'pending_sent') {
          setProfileConnectionStatus('pending_sent');
        } else if (rawStatus === 'pending_received') {
          setProfileConnectionStatus('pending_received');
        } else {
          setProfileConnectionStatus('none');
        }
      } catch {
        setProfileConnectionStatus('none');
      }
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
      setProfileUser(null);
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

  // Directly zero out the viewport padding on profile screen to remove the top gap
  useEffect(() => {
    const viewport = document.getElementById('viewport');
    if (!viewport) return;
    if (screenMode === 'profile') {
      viewport.style.padding = '0';
      viewport.style.setProperty('padding', '0', 'important');
    } else {
      viewport.style.removeProperty('padding');
    }
    return () => {
      if (viewport) viewport.style.removeProperty('padding');
    };
  }, [screenMode]);

  const handleConnectRequest = async (id: string, name: string) => {
    // Optimistic: mark as pending immediately
    setConnectionSentIds(prev => [...prev, id]);
    setProfileConnectionStatus('pending_sent');
    try {
      const res = await apiFetch('/directory/connect', {
        method: 'POST',
        body: JSON.stringify({ targetId: id })
      });
      if (res.status === 'accepted') {
        setProfileConnectionStatus('accepted');
        showToast(`You are now connected with ${name}!`, 'success');
      } else {
        showToast(`Connection request sent to ${name}!`, 'success');
      }
    } catch (err: any) {
      // Revert on failure
      setConnectionSentIds(prev => prev.filter(x => x !== id));
      setProfileConnectionStatus('none');
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

  const memoryPhotoInputRef = useRef<HTMLInputElement>(null);

  const handleMemoryPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const file of files) {
      try {
        showToast(`Uploading ${file.name}...`, "info");
        const result = await uploadMedia(file, 'posts/images');
        if (result && result.url) {
          setMediaImages(prev => [...prev, result.url]);
        } else {
          showToast(`Upload failed for ${file.name}.`, "danger");
        }
      } catch (err: any) {
        showToast(err.message || `Failed to upload ${file.name}.`, "danger");
      }
    }
    if (files.length > 0) showToast(`${files.length} photo(s) uploaded successfully!`, "success");
    // Reset input so same file can be re-selected if needed
    if (e.target) e.target.value = '';
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

  const openEditProfileModal = () => {
    if (!profileUser) return;
    const person = profileUser.profile || profileUser;
    setEditName(person.full_name || currentUser?.profile?.full_name || '');
    setEditBio(person.bio || currentUser?.profile?.bio || '');
    setEditMobile(person.mobile || currentUser?.mobile || '');
    setEditBatch(person.batch_year ? String(person.batch_year) : (currentUser?.profile?.batch_year ? String(currentUser.profile.batch_year) : ''));
    setEditLeavingClass((person.leaving_class || currentUser?.leaving_class || currentUser?.profile?.leaving_class || 'XII') as 'X' | 'XII');
    setEditHouse(person.house || currentUser?.profile?.house || 'Vivekananda House');
    setEditProfession(person.profession_category || currentUser?.profile?.profession_category || '');
    setEditCompany(person.company || currentUser?.profile?.company || '');
    setEditCity(person.city || currentUser?.profile?.city || '');
    setEditCountry(person.country || currentUser?.profile?.country || 'India');
    setEditPhotoUrl(person.profile_photo || currentUser?.profile?.profile_photo || '');
    setEditShowEmail(person.show_email ?? currentUser?.profile?.show_email ?? true);
    setEditShowMobile(person.show_phone ?? currentUser?.profile?.show_phone ?? false);
    setEditShowSocial(person.privacy?.show_social ?? currentUser?.profile?.show_social ?? true);
    // Networking fields
    setEditLinkedinUrl(person.linkedin_url || currentUser?.profile?.linkedin_url || '');
    setEditGithubUrl(person.github_url || currentUser?.profile?.github_url || '');
    setEditPortfolioUrl(person.portfolio_url || currentUser?.profile?.portfolio_url || '');
    setEditPersonalUrl(person.personal_url || currentUser?.profile?.personal_url || '');
    setEditSkills(person.skills || currentUser?.profile?.skills || []);
    setEditSkillInput('');
    setEditHelpCategories(person.help_categories || currentUser?.profile?.help_categories || []);
    setEditLookingFor(person.looking_for || currentUser?.profile?.looking_for || []);
    setEditMentorshipStatus(person.mentorship_status || currentUser?.profile?.mentorship_status || 'Not Available');
    setEditIndustry(person.industry || currentUser?.profile?.industry || '');
    setEditDesignation(person.designation || currentUser?.profile?.designation || '');
    setEditYearsOfExperience(person.years_of_experience !== undefined ? String(person.years_of_experience) : (currentUser?.profile?.years_of_experience ? String(currentUser.profile.years_of_experience) : ''));
    setEditEducation(person.education || currentUser?.profile?.education || '');
    setEditOpenFor(person.open_for || currentUser?.profile?.open_for || []);
    setCropModalOpen(false);
    setEditProfileOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        setCropImageSrc(dataUrl);
        cropLocalSrcRef.current = dataUrl; // safe local source for canvas
        setCropZoom(1);
        setCropX(0);
        setCropY(0);
        setCropRotation(0);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAdjustExistingPhoto = async () => {
    if (!editPhotoUrl) return;
    // If already a data URL (local), use directly
    if (editPhotoUrl.startsWith('data:')) {
      setCropImageSrc(editPhotoUrl);
      cropLocalSrcRef.current = editPhotoUrl;
    } else {
      // Remote URL — fetch as blob to avoid canvas CORS taint
      try {
        setUploadingPhoto(true);
        const res = await fetch(editPhotoUrl);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setCropImageSrc(objectUrl);
        cropLocalSrcRef.current = objectUrl;
      } catch {
        // Fallback: use URL directly, canvas may fail but we show clear error
        setCropImageSrc(editPhotoUrl);
        cropLocalSrcRef.current = editPhotoUrl;
      } finally {
        setUploadingPhoto(false);
      }
    }
    setCropZoom(1);
    setCropX(0);
    setCropY(0);
    setCropRotation(0);
    setCropModalOpen(true);
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    cropDraggingRef.current = true;
    cropDragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!cropDraggingRef.current) return;
    const dx = e.clientX - cropDragStartRef.current.x;
    const dy = e.clientY - cropDragStartRef.current.y;
    cropDragStartRef.current = { x: e.clientX, y: e.clientY };
    setCropX((prev) => prev + dx);
    setCropY((prev) => prev + dy);
  };

  const handleCropMouseUp = () => {
    cropDraggingRef.current = false;
  };

  const handleCropTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    cropDraggingRef.current = true;
    cropDragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleCropTouchMove = (e: React.TouchEvent) => {
    if (!cropDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - cropDragStartRef.current.x;
    const dy = e.touches[0].clientY - cropDragStartRef.current.y;
    cropDragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setCropX((prev) => prev + dx);
    setCropY((prev) => prev + dy);
  };

  const handleCropTouchEnd = () => {
    cropDraggingRef.current = false;
  };

  // ── Helper: render canvas → File (no uploads inside nested callbacks) ──
  const renderCropToFile = (src: string): Promise<File> =>
    new Promise<File>((resolve, reject) => {
      const img = new window.Image();  // use window.Image to avoid conflict with lucide-react's Image icon import
      // Only set crossOrigin for true remote URLs; never for data: or blob:
      if (!src.startsWith('data:') && !src.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Failed to get canvas context')); return; }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 400, 400);

          ctx.save();
          const ratio = 400 / 280;
          ctx.translate(200 + cropX * ratio, 200 + cropY * ratio);
          ctx.rotate((cropRotation * Math.PI) / 180);
          const baseScale = Math.min(280 / img.width, 280 / img.height);
          ctx.scale(baseScale * cropZoom * ratio, baseScale * cropZoom * ratio);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          ctx.restore();

          // Resolve with a File — no async upload inside this callback
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('Failed to generate image blob')); return; }
            resolve(new File([blob], 'profile_cropped.png', { type: 'image/png' }));
          }, 'image/png');
        } catch (err) { reject(err); }
      };
      img.onerror = () => reject(new Error('Failed to load image. Please try uploading a new photo.'));
      img.src = src;
    });

  const handleCropApply = async () => {
    const localSrc = cropLocalSrcRef.current || cropImageSrc;
    if (!localSrc) return;
    try {
      setUploadingPhoto(true);
      showToast('Processing photo...', 'info');

      // Step 1: canvas → File  (pure sync canvas work, no module imports inside)
      const croppedFile = await renderCropToFile(localSrc);

      // Step 2: upload  (called at the top-level async scope, not nested in a callback)
      const result = await uploadMedia(croppedFile, 'profiles');

      // Cleanup blob URL if we created one
      if (localSrc.startsWith('blob:')) URL.revokeObjectURL(localSrc);

      const finalUrl = result.url;

      setEditPhotoUrl(finalUrl);
      cropLocalSrcRef.current = '';
      setCropModalOpen(false);
      showToast("Photo adjusted successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to process photo", "danger");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast("Full Name is required.", "danger");
      return;
    }
    if (!editBatch.trim() || isNaN(Number(editBatch))) {
      showToast("A valid Batch Year is required.", "danger");
      return;
    }
    // URL validation
    const isValidUrl = (url: string): boolean => {
      if (!url) return true;
      return /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(url);
    };
    if (editLinkedinUrl && !isValidUrl(editLinkedinUrl)) {
      showToast("Invalid LinkedIn URL. Must start with http:// or https://", "danger");
      return;
    }
    if (editGithubUrl && !isValidUrl(editGithubUrl)) {
      showToast("Invalid GitHub URL. Must start with http:// or https://", "danger");
      return;
    }
    if (editPortfolioUrl && !isValidUrl(editPortfolioUrl)) {
      showToast("Invalid Portfolio URL. Must start with http:// or https://", "danger");
      return;
    }
    if (editPersonalUrl && !isValidUrl(editPersonalUrl)) {
      showToast("Invalid Personal Website URL. Must start with http:// or https://", "danger");
      return;
    }
    try {
      setUpdatingProfile(true);

      await apiFetch('/directory/profile/update', {
        method: 'POST',
        body: JSON.stringify({
          full_name: editName,
          bio: editBio,
          mobile: editMobile,
          batch_year: parseInt(editBatch),
          leaving_class: editLeavingClass,
          house: editHouse,
          profession_category: editProfession,
          company: editCompany,
          city: editCity,
          country: editCountry,
          profile_photo: editPhotoUrl,
          show_email: editShowEmail,
          show_mobile: editShowMobile,
          show_social: editShowSocial,
          linkedin_url: editLinkedinUrl,
          github_url: editGithubUrl,
          portfolio_url: editPortfolioUrl,
          personal_url: editPersonalUrl,
          skills: editSkills,
          help_categories: editHelpCategories,
          looking_for: editLookingFor,
          mentorship_status: editMentorshipStatus,
          industry: editIndustry,
          designation: editDesignation,
          years_of_experience: editYearsOfExperience ? parseInt(editYearsOfExperience) : 0,
          education: editEducation,
          open_for: editOpenFor
        })
      });
      showToast("Profile updated successfully!", "success");
      setEditProfileOpen(false);
      
      if (refreshSession) {
        await refreshSession();
      }
      
      if (profileUser) {
        await loadProfile(profileUser.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "danger");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleLike = async (postId: string) => {
    const userId = currentUser?.id;
    if (!userId) return;

    // --- Optimistic update: toggle like instantly ---
    const toggleLikes = (likesArr: string[]) =>
      likesArr.includes(userId)
        ? likesArr.filter(id => id !== userId)
        : [...likesArr, userId];

    const updatePost = (p: any) =>
      p.id === postId ? { ...p, likes: toggleLikes(p.likes || []) } : p;

    setPosts(prev => prev.map(updatePost));
    setProfilePosts(prev => prev.map(updatePost));
    setSelectedPostForModal((prev: any) =>
      prev && prev.id === postId ? { ...prev, likes: toggleLikes(prev.likes || []) } : prev
    );

    // --- Fire API in background, revert on failure ---
    try {
      await apiFetch(`/posts/${postId}/like`, { method: 'POST' });
    } catch (err: any) {
      // Revert on error
      setPosts(prev => prev.map(updatePost)); // toggle again to revert
      setProfilePosts(prev => prev.map(updatePost));
      setSelectedPostForModal((prev: any) =>
        prev && prev.id === postId ? { ...prev, likes: toggleLikes(prev.likes || []) } : prev
      );
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

  const handleDeletePost = (postId: string) => {
    setPostToDeleteId(postId);
    setActivePostMenuId(null);
  };

  const doDeletePost = async () => {
    if (!postToDeleteId) return;
    try {
      await apiFetch(`/posts/${postToDeleteId}`, { method: 'DELETE' });
      showToast('Post deleted successfully', 'success');
      setPosts(prev => prev.filter(p => p.id !== postToDeleteId));
      setProfilePosts(prev => prev.filter(p => p.id !== postToDeleteId));
      setPostToDeleteId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete post', 'danger');
    }
  };

  const handleTogglePinPost = async (postId: string) => {
    try {
      const result = await apiFetch(`/posts/${postId}/pin`, { method: 'POST' });
      showToast(result.is_pinned ? 'Post pinned successfully' : 'Post unpinned successfully', 'success');
      const updatePin = (p: any) => p.id === postId ? { ...p, is_pinned: result.is_pinned } : p;
      setPosts(prev => prev.map(updatePin));
      setProfilePosts(prev => prev.map(updatePin));
      setActivePostMenuId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle pin', 'danger');
    }
  };

  const handleCopyPostLink = (postId: string) => {
    const link = `${window.location.origin}/?post=${postId}`;
    navigator.clipboard.writeText(link);
    showToast("Shareable link copied to clipboard!", "success");
    setActivePostMenuId(null);
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

    const content = replyingTo && replyingTo.postId === postId
      ? JSON.stringify({ parentCommentId: replyingTo.commentId, text: commentText.trim() })
      : commentText.trim();

    // --- Optimistic update: append comment instantly ---
    const tempComment = {
      id: `temp-${Date.now()}`,
      post_id: postId,
      content,
      created_at: new Date().toISOString(),
      author_id: currentUser?.id,
      author: {
        id: currentUser?.id,
        email: currentUser?.email,
        role: currentUser?.role,
        full_name: currentUser?.full_name || currentUser?.profile?.full_name || 'You',
        profile_photo: currentUser?.profile_photo || currentUser?.profile?.profile_photo ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80'
      }
    };

    const appendComment = (p: any) =>
      p.id === postId
        ? { ...p, comments: [...(p.comments || []), tempComment] }
        : p;

    setPosts(prev => prev.map(appendComment));
    setProfilePosts(prev => prev.map(appendComment));
    setSelectedPostForModal((prev: any) =>
      prev && prev.id === postId
        ? { ...prev, comments: [...(prev.comments || []), tempComment] }
        : prev
    );

    // Clear input immediately
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setReplyingTo(null);

    // --- Fire API in background ---
    try {
      const result = await apiFetch(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      
      if (result && result.comment) {
        const realId = result.comment.id;
        const replaceId = (p: any) =>
          p.id === postId
            ? {
                ...p,
                comments: (p.comments || []).map((c: any) =>
                  c.id === tempComment.id ? { ...c, id: realId } : c
                )
              }
            : p;
        setPosts(prev => prev.map(replaceId));
        setProfilePosts(prev => prev.map(replaceId));
        setSelectedPostForModal((prev: any) =>
          prev && prev.id === postId
            ? {
                ...prev,
                comments: (prev.comments || []).map((c: any) =>
                  c.id === tempComment.id ? { ...c, id: realId } : c
                )
              }
            : prev
        );
      }

      // Silently refresh feed in background to get real comment data (no loading spinner)
      apiFetch(`/posts?groupId=${activeGroupId}`).then(feedPosts => setPosts(feedPosts)).catch(() => {});
    } catch (err: any) {
      // Revert: remove temp comment on error
      const revertComment = (p: any) =>
        p.id === postId
          ? { ...p, comments: (p.comments || []).filter((c: any) => c.id !== tempComment.id) }
          : p;
      setPosts(prev => prev.map(revertComment));
      setProfilePosts(prev => prev.map(revertComment));
      setSelectedPostForModal((prev: any) =>
        prev && prev.id === postId
          ? { ...prev, comments: (prev.comments || []).filter((c: any) => c.id !== tempComment.id) }
          : prev
      );
      // Restore the comment text so user can retry
      setCommentInputs(prev => ({ ...prev, [postId]: commentText }));
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

    // Feed tab filtering
    if (feedTab === 'Connected') {
      const isConnection = connections.some(c => c.id === post.author_id) || post.author_id === currentUser.id;
      if (!isConnection) return false;
    } else if (feedTab === 'Batch') {
      const authorBatch = (post as any).author?.batch_year || (post as any).author_batch_year;
      if (authorBatch !== currentUser?.batch_year) return false;
    } else if (feedTab === 'Department') {
      const authorDept = (post as any).author?.department;
      if (!authorDept || !currentUser?.department || authorDept.toLowerCase() !== currentUser.department.toLowerCase()) return false;
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const authorName = ((post as any).author?.full_name || '').toLowerCase();
      const matchText = (post.content || '').toLowerCase().includes(q) ||
                        (post.post_type || '').toLowerCase().includes(q) ||
                        authorName.includes(q);
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

  const parseCommentsAndReplies = (commentsList: any[]) => {
    const topLevel: any[] = [];
    const repliesMap: { [commentId: string]: any[] } = {};
    const commentIds = new Set((commentsList || []).map(c => c.id));

    (commentsList || []).forEach(c => {
      let isReply = false;
      let parentId = '';
      let textContent = c.content;

      if (c.content && c.content.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(c.content);
          if (parsed && parsed.text) {
            textContent = parsed.text;
            if (parsed.parentCommentId) {
              if (commentIds.has(parsed.parentCommentId)) {
                isReply = true;
                parentId = parsed.parentCommentId;
              } else if (parsed.parentCommentId.startsWith('temp-')) {
                // Heal orphaned reply: find the parent comment created at the same time
                const tempTime = parseInt(parsed.parentCommentId.replace('temp-', ''), 10);
                if (!isNaN(tempTime)) {
                  let bestParent: any = null;
                  let minDiff = Infinity;
                  (commentsList || []).forEach(parentCandidate => {
                    // Do not match self or another reply (which starts with '{' in database)
                    if (parentCandidate.id === c.id || parentCandidate.content.trim().startsWith('{')) return;
                    const diff = Math.abs(new Date(parentCandidate.created_at).getTime() - tempTime);
                    if (diff < minDiff) {
                      minDiff = diff;
                      bestParent = parentCandidate;
                    }
                  });
                  // If difference is within 5 seconds, match them!
                  if (bestParent && minDiff < 5000) {
                    isReply = true;
                    parentId = bestParent.id;
                  }
                }
              }
            }
          }
        } catch (e) {
          // Not JSON
        }
      }

      const commentObj = { ...c, content: textContent };

      if (isReply && parentId) {
        if (!repliesMap[parentId]) {
          repliesMap[parentId] = [];
        }
        repliesMap[parentId].push(commentObj);
      } else {
        topLevel.push(commentObj);
      }
    });

    return { topLevel, repliesMap };
  };

  // Sort comments based on selected mode
  const sortComments = (comments: any[], postId: string): any[] => {
    const mode = commentSortMode[postId] || 'newest';
    const arr = [...comments];
    if (mode === 'newest') return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (mode === 'oldest') return arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (mode === 'top') return arr.sort((a, b) => (commentLikes[b.id] || 0) - (commentLikes[a.id] || 0));
    return arr;
  };

  // Render text with @mention highlighting
  const renderMentions = (text: string): React.ReactNode => {
    if (!text) return null;
    const parts = text.split(/(@\w[\w\s]*)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="comment-mention">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  // Toggle comment like (frontend only)
  const handleCommentLike = (commentId: string) => {
    const liked = commentLikedByMe[commentId];
    setCommentLikedByMe(prev => ({ ...prev, [commentId]: !liked }));
    setCommentLikes(prev => ({
      ...prev,
      [commentId]: (prev[commentId] || 0) + (liked ? -1 : 1)
    }));
  };




  const handleCommentSubmit = (postId: string, text: string) => {
    if (!text.trim()) return;
    const content = replyingTo && replyingTo.postId === postId
      ? JSON.stringify({ parentCommentId: replyingTo.commentId, text: text.trim() })
      : text.trim();
    apiFetch(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    }).then(() => {
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setReplyingTo(null);
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
    const sortedPosts = feedTab === 'Trending'
      ? [...filteredPosts].sort((a, b) => {
          const scoreA = (a.likes || []).length + ((a as any).comments || []).length;
          const scoreB = (b.likes || []).length + ((b as any).comments || []).length;
          return scoreB - scoreA;
        })
      : [...filteredPosts].sort((a, b) =>
          new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime()
        );

    return (
      <motion.div
        className="ig-feed-layout"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Custom Instagram-style Feed Header */}
        <motion.div
          className="feed-header-ig"
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {showSearchInput ? (
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '12px' }}>
                <div className="header-search-bar" style={{ width: '100%', maxWidth: 'none', margin: 0 }}>
                  <Search className="search-icon" size={18} style={{ color: 'var(--heritage-ink, #0c1e36)', opacity: 0.7 }} />
                  <input 
                    type="text" 
                    placeholder="Search posts or alumni by name..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ 
                      width: '100%', 
                      color: '#0c1e36', 
                      background: 'rgba(15, 23, 42, 0.05)', 
                      border: '1px solid rgba(15, 23, 42, 0.1)',
                      borderRadius: '8px'
                    }}
                    autoFocus
                  />
                </div>
                <motion.button
                  className="header-action-btn"
                  onClick={() => {
                    setShowSearchInput(false);
                    setSearchQuery('');
                    setRecommendedAlumni([]);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={22} />
                </motion.button>
              </div>

              {/* Recommendations Dropdown */}
              {searchQuery.trim().length >= 2 && (
                <div 
                  className="search-recommendations-dropdown"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    padding: '8px 0'
                  }}
                >
                  {loadingRecommendations ? (
                    <div style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 className="animate-spin" style={{ color: '#64748b', animation: 'spin 1s linear infinite' }} size={16} />
                      <span>Searching directory...</span>
                    </div>
                  ) : recommendedAlumni.length > 0 ? (
                    recommendedAlumni.map((user: any) => (
                      <div
                        key={user.id}
                        onClick={() => {
                          onViewProfile(user.id);
                          setShowSearchInput(false);
                          setSearchQuery('');
                          setRecommendedAlumni([]);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 16px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          borderBottom: '1px solid rgba(15, 23, 42, 0.03)'
                        }}
                        className="recommendation-item"
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(243, 112, 33, 0.06)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <img 
                          src={user.profile?.profile_photo || user.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80'} 
                          alt={user.profile?.full_name || user.full_name} 
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0c1e36' }}>
                            {user.profile?.full_name || user.full_name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Class of {user.profile?.batch_year || user.batch_year || '—'} · {user.profile?.city || user.city || 'No Location'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      No matching alumni found.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <motion.h1
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  Vidyapith Alumni
                </motion.h1>
                <motion.p
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.18, duration: 0.3 }}
                >
                  Welcome back, {currentUser?.full_name?.split(' ')[0] || 'Rahul'} 👋
                </motion.p>
              </div>
              <div className="feed-header-actions">
                <motion.button
                  className="header-action-btn btn-search-premium"
                  title="Search"
                  onClick={() => setShowSearchInput(true)}
                  whileHover={{ scale: 1.12, rotate: 5 }}
                  whileTap={{ scale: 0.88 }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.22, type: 'spring', stiffness: 260, damping: 18 }}
                >
                  <Search size={22} />
                </motion.button>
                <motion.button
                  className="header-action-btn btn-bell-premium"
                  title="Notifications"
                  onClick={() => onNavigate && onNavigate('notifications')}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.88 }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.28, type: 'spring', stiffness: 260, damping: 18 }}
                >
                  <Bell size={22} />
                  {unreadNotifCount > 0 && (
                    <motion.span
                      className="notif-badge-dot"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    />
                  )}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>

        <div className="ig-feed-body">
        {/* Center: post composer + feed */}
        <main className="ig-feed-main">





          {/* Profile Completeness Banner */}
          {(!currentUser.bio || currentUser.bio === 'Not specified' || !currentUser.linkedin_url || !currentUser.company || currentUser.company === 'Not specified') && (
            <motion.div
              className="profile-completeness-banner"
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 18 }}
              whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(0,0,0,0.08)' }}
            >
              <div className="profile-completeness-copy">
                <motion.div
                  className="profile-completeness-icon"
                  animate={{ rotate: [0, 12, -8, 12, 0] }}
                  transition={{ delay: 0.6, duration: 0.6, ease: 'easeInOut' }}
                >
                  ✨
                </motion.div>
                <div>
                  <h4>Complete your Alumni Profile</h4>
                  <p>
                    Add a bio, company details, and your LinkedIn profile to help batchmates discover and connect with you.
                  </p>
                </div>
              </div>
              <motion.button
                onClick={() => onNavigate && onNavigate('profile')}
                className="btn-connect-gradient profile-completeness-action"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                Complete Profile
              </motion.button>
            </motion.div>
          )}

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
              <motion.article 
                key={post.id} 
                className="feed-story-card"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
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
                   <button 
                    className="post-more-btn" 
                    type="button" 
                    aria-label="More options" 
                    onClick={(e) => { e.stopPropagation(); setActivePostMenuId(post.id); }}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </header>

                {/* Options Dialog Overlay (Instagram Style) */}
                {activePostMenuId === post.id && (
                  <div className="instagram-options-overlay" onClick={() => setActivePostMenuId(null)}>
                    <div className="instagram-options-modal" onClick={(e) => e.stopPropagation()}>
                      {(currentUser?.id === post.author_id || currentUser?.role === 'admin') && (
                        <button
                          type="button"
                          className="instagram-options-btn danger bold"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          Delete
                        </button>
                      )}
                      
                      {currentUser?.role === 'admin' && (
                        <button
                          type="button"
                          className="instagram-options-btn danger bold"
                          onClick={() => handleTogglePinPost(post.id)}
                        >
                          {post.is_pinned ? 'Unpin Post' : 'Pin to Top'}
                        </button>
                      )}

                      <button
                        type="button"
                        className="instagram-options-btn"
                        onClick={() => handleCopyPostLink(post.id)}
                      >
                        Copy Link
                      </button>

                      <button
                        type="button"
                        className="instagram-options-btn"
                        onClick={() => setActivePostMenuId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

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


                {/* ──── Advanced Comment Section ──── */}
                {expandedComments[post.id] && (() => {
                  const { topLevel, repliesMap } = parseCommentsAndReplies((post as any).comments);
                  // Sort newest on top
                  const sorted = [...topLevel].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const totalCount = sorted.length;
                  const showLimit = visibleCommentCount[post.id] ?? 5;
                  const visible = sorted.slice(0, showLimit);
                  const commentText = commentInputs[post.id] || '';
                  const maxChars = 500;
                  const emojiList = ['😄','😂','❤️','🔥','👍','🎉','😊','🙏','👏','💡','🤔','😍','✨','😢','🤣'];

                  return (
                    <div className="adv-comments-panel">
                      {/* Comment List */}
                      <div className="adv-comment-list">
                        {totalCount === 0 && (
                          <p className="adv-no-comments">Be the first to comment ✨</p>
                        )}
                        {visible.map((comment: any) => {
                          const hasReplies = repliesMap[comment.id] && repliesMap[comment.id].length > 0;
                          return (
                            <div key={comment.id} className="adv-comment-thread">
                              {/* Top-level comment */}
                              <div className="adv-comment-item">
                                <img
                                  src={comment.author?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&q=80'}
                                  alt=""
                                  className="adv-comment-avatar"
                                  onClick={() => comment.author?.id && onViewProfile(comment.author.id)}
                                />
                                <div className="adv-comment-content">
                                  <div className="adv-comment-text-wrapper">
                                    <span
                                      className="adv-comment-author"
                                      onClick={() => comment.author?.id && onViewProfile(comment.author.id)}
                                    >
                                      {getUsername(comment.author || {})}
                                    </span>
                                    <span className="adv-comment-text">
                                      {renderMentions(comment.content)}
                                    </span>
                                  </div>
                                  <div className="adv-comment-meta">
                                    <span className="adv-comment-time">{formatTimeAgo(comment.created_at || new Date().toISOString())}</span>
                                    <button
                                      className="adv-reply-btn"
                                      onClick={() => setReplyingTo(
                                        replyingTo?.postId === post.id && replyingTo?.commentId === comment.id
                                          ? null
                                          : { postId: post.id, commentId: comment.id, authorName: comment.author?.full_name || 'Alumnus' }
                                      )}
                                    >
                                      Reply
                                    </button>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className={`adv-comment-heart-btn ${commentLikedByMe[comment.id] ? 'liked' : ''}`}
                                  onClick={() => handleCommentLike(comment.id)}
                                >
                                  <Heart size={12} fill={commentLikedByMe[comment.id] ? '#e0245e' : 'none'} color={commentLikedByMe[comment.id] ? '#e0245e' : '#8e8e8e'} />
                                </button>
                              </div>

                              {/* Nested Replies */}
                              {hasReplies && (
                                <div className="adv-replies-container">
                                  {repliesMap[comment.id].map((reply: any) => (
                                    <div key={reply.id} className="adv-comment-reply-item">
                                      <img
                                        src={reply.author?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&q=80'}
                                        alt=""
                                        className="adv-comment-avatar sub-avatar"
                                        onClick={() => reply.author?.id && onViewProfile(reply.author.id)}
                                      />
                                      <div className="adv-comment-content">
                                        <div className="adv-comment-text-wrapper">
                                          <span
                                            className="adv-comment-author"
                                            onClick={() => reply.author?.id && onViewProfile(reply.author.id)}
                                          >
                                            {getUsername(reply.author || {})}
                                          </span>
                                          <span className="adv-comment-text">
                                            {renderMentions(reply.content)}
                                          </span>
                                        </div>
                                        <div className="adv-comment-meta">
                                          <span className="adv-comment-time">{formatTimeAgo(reply.created_at || new Date().toISOString())}</span>
                                          <button
                                            className="adv-reply-btn"
                                            onClick={() => setReplyingTo(
                                              replyingTo?.postId === post.id && replyingTo?.commentId === reply.id
                                                ? null
                                                : { postId: post.id, commentId: reply.id, authorName: reply.author?.full_name || 'Alumnus' }
                                            )}
                                          >
                                            Reply
                                          </button>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        className={`adv-comment-heart-btn ${commentLikedByMe[reply.id] ? 'liked' : ''}`}
                                        onClick={() => handleCommentLike(reply.id)}
                                      >
                                        <Heart size={10} fill={commentLikedByMe[reply.id] ? '#e0245e' : 'none'} color={commentLikedByMe[reply.id] ? '#e0245e' : '#8e8e8e'} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Show More Comments Button */}
                      {totalCount > showLimit && (
                        <button
                          type="button"
                          className="adv-show-more-comments"
                          onClick={() => setVisibleCommentCount(prev => ({ ...prev, [post.id]: showLimit + 5 }))}
                        >
                          View more comments
                        </button>
                      )}

                      {/* Reply indicator */}
                      {replyingTo && replyingTo.postId === post.id && (
                        <div className="adv-replying-indicator">
                          <span>Replying to <strong>{replyingTo.authorName}</strong></span>
                          <button onClick={() => setReplyingTo(null)} className="adv-cancel-reply">✕</button>
                        </div>
                      )}

                      {/* Comment Input */}
                      <div className="adv-comment-input-row">
                        <button
                          type="button"
                          className="adv-emoji-btn-left"
                          onClick={() => setShowEmojiPicker(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        >
                          <Smile size={22} />
                        </button>
                        
                        <input
                          type="text"
                          className="adv-comment-input"
                          placeholder={replyingTo && replyingTo.postId === post.id ? `Replying to ${replyingTo.authorName}…` : 'Add a comment…'}
                          value={commentText}
                          onChange={e => handleCommentChange(post.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCreateComment(post.id, e); }}
                          maxLength={maxChars}
                          autoComplete="off"
                        />
                        
                        <button
                          type="button"
                          className="adv-post-btn"
                          disabled={!commentText.trim()}
                          onClick={e => handleCreateComment(post.id, e)}
                        >
                          Post
                        </button>
                      </div>

                      {/* Emoji picker tray */}
                      {showEmojiPicker[post.id] && (
                        <div className="adv-emoji-tray-pop">
                          {emojiList.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              className="adv-emoji-btn-pop"
                              onClick={() => {
                                setCommentInputs(prev => ({ ...prev, [post.id]: (prev[post.id] || '') + emoji }));
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.article>
            );
          })}

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

        <motion.aside 
          className="feed-desktop-rail" 
          aria-label="Feed sidebar"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08
              }
            }
          }}
        >
          <motion.section 
            className="feed-rail-card feed-rail-profile-card"
            variants={{
              hidden: { opacity: 0, x: 20 },
              show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 180, damping: 14 } }
            }}
            whileHover={{ y: -3, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}
          >
            <div className="feed-rail-profile-head">
              <img
                src={currentUser?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&q=80'}
                alt={currentUser?.full_name || 'Profile'}
              />
              <div>
                <h3>{currentUser?.full_name || 'Vidyapith Alumnus'}</h3>
                <p>Class of {currentUser?.batch_year || 'Vidyapith'}</p>
              </div>
            </div>
            <motion.button 
              type="button" 
              onClick={() => onNavigate && onNavigate('profile')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View Profile
            </motion.button>
          </motion.section>

          <motion.section 
            className="feed-rail-card"
            variants={{
              hidden: { opacity: 0, x: 20 },
              show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 180, damping: 14 } }
            }}
            whileHover={{ y: -3, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}
          >
            <div className="feed-rail-card-title">
              <Sparkles size={17} />
              <span>Quick Actions</span>
            </div>
            <div className="feed-rail-actions">
              <motion.button 
                type="button" 
                onClick={() => onNavigate && onNavigate('create')}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={16} /> Create post
              </motion.button>
              <motion.button 
                type="button" 
                onClick={() => onNavigate && onNavigate('directory')}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Users size={16} /> Find alumni
              </motion.button>
              <motion.button 
                type="button" 
                onClick={() => onNavigate && onNavigate('messages')}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <MessageCircle size={16} /> Messages
              </motion.button>
            </div>
          </motion.section>

          <motion.section 
            className="feed-rail-card"
            variants={{
              hidden: { opacity: 0, x: 20 },
              show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 180, damping: 14 } }
            }}
            whileHover={{ y: -3, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}
          >
            <div className="feed-rail-card-title">
              <TrendingUp size={17} />
              <span>Community Pulse</span>
            </div>
            <div className="feed-rail-stats">
              <div>
                <strong>{posts.length}</strong>
                <span>Total posts</span>
              </div>
              <div>
                <strong>{connections.length}</strong>
                <span>Connections</span>
              </div>
              <div>
                <strong>{bookmarks.length}</strong>
                <span>Saved</span>
              </div>
            </div>
          </motion.section>

          <motion.section 
            className="feed-rail-card feed-rail-note"
            variants={{
              hidden: { opacity: 0, x: 20 },
              show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 180, damping: 14 } }
            }}
            whileHover={{ y: -3, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}
          >
            <GraduationCap size={20} />
            <div>
              <h3>Grow the Vidyapith network</h3>
              <p>Share a memory, career update, or useful opportunity with your batchmates.</p>
            </div>
          </motion.section>
        </motion.aside>
        </div>


      </motion.div>
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
    const isAdminBatchView = currentUser.role === 'admin';
    const featuredBatches = isAdminBatchView
      ? [
          {
            year: 'all',
            title: 'All-Batch Command',
            members: '2,480 members',
            image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=420&h=210&fit=crop&q=80',
            action: 'Open oversight'
          },
          {
            year: '2026',
            title: 'Current Student Bridge',
            members: '312 students',
            image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=420&h=210&fit=crop&q=80',
            action: 'Review bridge'
          },
          {
            year: '2000',
            title: 'Silver Jubilee Batch',
            members: '205 alumni',
            image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=420&h=210&fit=crop&q=80',
            action: 'Feature batch'
          },
          {
            year: '1980',
            title: 'Legacy Circle',
            members: '94 alumni',
            image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=420&h=210&fit=crop&q=80',
            action: 'Honor batch'
          }
        ]
      : [1980, 1990, 2000, 2005].map((year, index) => ({
          year: String(year),
          title: `Class of ${year}`,
          members: `${[94, 138, 205, 186][index]} members`,
          image: ['https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=420&h=210&fit=crop&q=80', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=420&h=210&fit=crop&q=80', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=420&h=210&fit=crop&q=80', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=420&h=210&fit=crop&q=80'][index],
          action: 'Join / View'
        }));

    return (
      <div className={`heritage-page batch-redesign ${isAdminBatchView ? 'admin-batch-redesign' : ''}`}>
        <aside>
          <section className={`your-batch-card ${isAdminBatchView ? 'admin-batch-card' : ''}`}>
            <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=520&h=300&fit=crop&q=80" alt="Your batch" />
            <div>
              <span>{isAdminBatchView ? 'Admin Batch' : 'Your Batch'}</span>
              <h2>{isAdminBatchView ? 'All Classes' : `Class of ${currentUser.batch_year}`}</h2>
              <span style={{ fontSize: '0.75rem', background: isAdminBatchView ? 'rgba(212,175,55,0.2)' : 'rgba(255,150,0,0.15)', color: isAdminBatchView ? '#f6d56b' : 'var(--accent-orange)', borderRadius: '20px', padding: '2px 10px', fontWeight: 700 }}>
                {isAdminBatchView ? 'Verified Admin Access' : `Class ${currentUser.leaving_class || 'XII'}`}
              </span>
            </div>
            <p><Users size={18} /> {isAdminBatchView ? '2,480 members under watch' : '186 members'}</p>
            <div><Calendar size={18} /><strong>{isAdminBatchView ? 'Centennial Review' : '20-Year Gala'}</strong><small>{isAdminBatchView ? 'All-batch schedule and approvals' : 'Dec 14, 2026 - Main Hall'}</small></div>
            <h3>{isAdminBatchView ? 'Admin Effects' : 'Batchmates'}</h3>
            {isAdminBatchView ? (
              <div className="admin-batch-effects">
                <button onClick={() => showToast('All-batch broadcast mode is ready.', 'info')}><ShieldCheck size={16} /> Broadcast</button>
                <button onClick={() => showToast('Verification watch opened.', 'info')}><Sparkles size={16} /> Verify Queue</button>
                <button onClick={() => showToast('Admin highlight effect applied to featured batches.', 'success')}><Award size={16} /> Highlight</button>
              </div>
            ) : (
              ['Arjun Mehta', 'Priya Sharma', 'Rohan Das'].map((name, index) => <p key={name}><img src={`https://images.unsplash.com/photo-${index === 0 ? '1500648767791-00dcc994a43e' : index === 1 ? '1494790108377-be9c29b29330' : '1506794778202-cad84cf45f1d'}?w=60&h=60&fit=crop&q=80`} alt={name} /> {name}</p>)
            )}
          </section>
          <section className={`heritage-widget ${isAdminBatchView ? 'admin-batch-widget' : ''}`}><h3><Sparkles size={18} /> {isAdminBatchView ? 'Admin Pulse' : 'Batch Stats'}</h3><p>{isAdminBatchView ? 'Pending approvals' : 'Memories shared'} <strong>{isAdminBatchView ? '18' : '412'}</strong></p><p>{isAdminBatchView ? 'Batches active this week' : 'Active this week'} <strong>{isAdminBatchView ? '42' : '57'}</strong></p></section>
        </aside>

        <main>
          <section className="batch-carousel-section">
            <div><h1>{isAdminBatchView ? 'Admin Batch Control' : 'Explore Your Batch'}</h1><p>{isAdminBatchView ? 'Feature, verify, and coordinate special batches across the network' : 'Connect with alumni from every graduating class'}</p></div>
            <button onClick={() => showToast(isAdminBatchView ? 'Showing all batch controls.' : 'Showing all batches.', 'info')}>View all <span aria-hidden="true">&gt;</span></button>
            <div className="batch-class-row">
              {featuredBatches.map((batch) => (
                <article key={batch.year} className={isAdminBatchView ? 'admin-special-batch' : ''}>
                  {isAdminBatchView && <span className="admin-special-batch-badge"><ShieldCheck size={13} /> Admin</span>}
                  <img src={batch.image} alt={batch.title} />
                  <h2>{batch.title}</h2>
                  <p><Users size={16} /> {batch.members}</p>
                  <button onClick={() => showToast(isAdminBatchView ? `${batch.title} controls opened.` : `Opened Class of ${batch.year}.`, 'info')}>{batch.action}</button>
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
        <button className="share-memory-fab" onClick={() => { setPostMediaType('photo'); showToast('Photo memory composer is ready on Home.', 'info'); }}><ImageIcon size={22} /> Share a Memory</button>
      </div>
    );
  }

  if (screenMode === 'profile') {
    if (!profileUser || profileUser.id !== forceProfileId) {
      return (
        <div className="forums-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <p style={{ color: 'var(--heritage-muted, #77797d)', fontSize: '0.92rem' }}>Loading profile...</p>
        </div>
      );
    }

    const person = profileUser.profile || profileUser;

    // Helper states for follow and connection actions
    const isFollowed = followedUserIds.includes(profileUser.id);

    const toggleFollow = () => {
      if (isFollowed) {
        setFollowedUserIds(prev => prev.filter(id => id !== profileUser.id));
        showToast(`Unfollowed ${person.full_name}`, 'info');
      } else {
        setFollowedUserIds(prev => [...prev, profileUser.id]);
        showToast(`Followed ${person.full_name}`, 'success');
      }
    };

    const handleConnectClick = async () => {
      if (profileConnectionStatus === 'accepted') {
        setShowConnectionDropdown(prev => !prev);
      } else if (profileConnectionStatus === 'pending_sent') {
        showToast(`Connection request already sent to ${person.full_name}`, 'info');
      } else if (profileConnectionStatus === 'pending_received') {
        // Optimistic: accept immediately
        setProfileConnectionStatus('accepted');
        showToast(`You are now connected with ${person.full_name}!`, 'success');
        try {
          await apiFetch('/directory/connections/respond', {
            method: 'POST',
            body: JSON.stringify({ targetId: profileUser.id, action: 'accept' })
          });
        } catch (err: any) {
          setProfileConnectionStatus('pending_received');
          showToast(err.message, 'danger');
        }
      } else {
        handleConnectRequest(profileUser.id, person.full_name);
      }
    };

    const handleRemoveConnection = async () => {
      setConfirmRemoveOpen(true);
    };

    const doRemoveConnection = async () => {
      setConfirmRemoveOpen(false);
      // Optimistic: remove immediately
      setProfileConnectionStatus('none');
      showToast(`Removed connection with ${person.full_name}`, 'info');
      try {
        await apiFetch(`/directory/connections/${profileUser.id}`, { method: 'DELETE' });
      } catch (err: any) {
        setProfileConnectionStatus('accepted');
        showToast(err.message || 'Failed to remove connection', 'danger');
      }
    };

    const handleDeclineRequest = async () => {
      // Optimistic: decline immediately
      setProfileConnectionStatus('none');
      showToast(`Declined connection request from ${person.full_name}`, 'info');
      try {
        await apiFetch('/directory/connections/respond', {
          method: 'POST',
          body: JSON.stringify({ targetId: profileUser.id, action: 'decline' })
        });
      } catch (err: any) {
        setProfileConnectionStatus('pending_received');
        showToast(err.message, 'danger');
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
      <div className="profile-ig-layout">
        
        {/* 1. TOP CARD: Header, details, and stats */}
        <div className="profile-card">
          {/* Avatar centered at top */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div className="profile-avatar-gradient-ring">
              <img 
                src={person.profile_photo || currentUser.profile_photo} 
                alt={person.full_name} 
                style={{ width: '130px', height: '130px' }}
              />
            </div>
          </div>

          {/* Profile Info Details */}
          <div className="profile-top-card-info" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center' }}>
              {/* Name */}
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {person.full_name || currentUser.full_name}
              </h2>

              {/* Badge pills row */}
              {userBadges.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {userBadges.map((badge, idx) => {
                    if (badge.label === 'Verified Alumni') {
                      return (
                        <span key={idx} className="profile-verified-badge" title={badge.label}>
                          <ShieldCheck size={14} /> Verified Alumni
                        </span>
                      );
                    }
                    if (badge.label === 'Admin') {
                      return (
                        <span key={idx} className="profile-admin-badge" title={badge.label}>
                          <ShieldAlert size={14} /> Admin
                        </span>
                      );
                    }
                    return (
                      <span key={idx} className="profile-header-badge" title={badge.label}>
                        <span style={{ fontSize: '0.9rem' }}>{badge.icon}</span> {badge.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Batch emblem */}
              <div className="profile-batch-emblem" style={{ alignSelf: 'center' }}>
                <div className="batch-emblem-icon">
                  <GraduationCap size={14} />
                </div>
                <div className="batch-emblem-content">
                  <span className="batch-emblem-label">RKMV Batch</span>
                  <span className="batch-emblem-year">Class of {person.batch_year || currentUser.batch_year}</span>
                </div>
              </div>


              {(() => {
                const profession = person.profession || currentUser.profession;
                const designation = person.designation || currentUser.designation;
                const company = person.company || currentUser.company;
                const titleText = designation || profession;
                if (!titleText && !company) return null;
                return (
                  <div style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: 600 }}>
                    {titleText && company ? `${titleText} at ${company}` : titleText || company}
                  </div>
                );
              })()}

              {(() => {
                const city = person.city || currentUser.city;
                const country = person.country || currentUser.country;
                if (!city && !country) return null;
                const location = [city, country].filter(Boolean).join(', ');
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', color: '#64748b' }}>
                    <MapPin size={14} style={{ color: '#f43f5e' }} />
                    {location}
                  </div>
                );
              })()}

              {/* Open For area badges */}
              {person.open_for && person.open_for.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {person.open_for.map((badge: string) => (
                    <span key={badge} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', padding: '3px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 700 }}>
                      🟢 Open For: {badge}
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="profile-action-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', width: '100%', maxWidth: '280px' }}>
                {profileUser.id === currentUser.id ? (
                  <>
                    <button 
                      onClick={openEditProfileModal} 
                      className="btn-ig-black"
                    >
                      <Settings size={16} /> Edit Profile
                    </button>
                    {/* Feature 10: QR Share Button */}
                    <button
                      onClick={() => setQrModalOpen(true)}
                      className="btn-ig-grey"
                      title="Share your profile QR code"
                    >
                      📱 Share QR
                    </button>
                  </>
                ) : (
                  <>
                    {profileConnectionStatus === 'accepted' ? (
                      /* Already connected — show Remove Connection directly */
                      <button
                        onClick={handleRemoveConnection}
                        className="btn-ig-grey"
                        style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)', display: 'flex', alignItems: 'center', gap: '6px' }}
                        title="Remove this connection"
                      >
                        <UserMinus size={16} /> Remove Connection
                      </button>
                    ) : profileConnectionStatus === 'pending_sent' ? (
                      <button
                        className="btn-ig-grey"
                        style={{ color: '#94a3b8', cursor: 'default' }}
                        title="Request already sent"
                        disabled
                      >
                        <UserPlus size={16} /> Request Sent
                      </button>
                    ) : profileConnectionStatus === 'pending_received' ? (
                      <>
                        <button
                          onClick={handleConnectClick}
                          className="btn-ig-black"
                          style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', color: '#fff', boxShadow: '0 4px 14px rgba(139,92,246,0.35)' }}
                          title="Accept connection request"
                        >
                          <Check size={16} /> Accept
                        </button>
                        <button
                          onClick={handleDeclineRequest}
                          className="btn-ig-grey"
                          style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                          title="Decline connection request"
                        >
                          <X size={16} /> Decline
                        </button>
                      </>
                    ) : (
                      /* Not connected — show Connect */
                      <button
                        onClick={handleConnectClick}
                        className="btn-ig-black"
                      >
                        <UserPlus size={16} /> Connect
                      </button>
                    )}
                    <button 
                      onClick={() => showToast(`Opening chat with ${person.full_name}`, 'info')} 
                      className="btn-ig-grey"
                    >
                      <MessageCircle size={16} /> Message
                    </button>
                  </>
                )}
              </div>
            </div>

          {/* Metrics/Stats Row at the bottom of the top card */}
          <div className="profile-stats-grid">
            <div className="profile-stat-box posts">
              <span className="profile-stat-number">{profilePosts.length}</span>
              <span className="profile-stat-label">Posts</span>
            </div>
            <div 
              className="profile-stat-box connections" 
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveRelationsTab('connections')}
            >
              <span className="profile-stat-number">{profileRelations ? profileRelations.connections.length : 0}</span>
              <span className="profile-stat-label">Connections</span>
            </div>
            <div className="profile-stat-box mentorships">
              <span className="profile-stat-number">{profileRelations ? (profileRelations as any).mentorships ?? 0 : 0}</span>
              <span className="profile-stat-label">Mentorships</span>
            </div>
          </div>
        </div>

        {/* Profile Completion Indicator — only on own profile */}
        {profileUser.id === currentUser.id && (() => {
          const fields = [
            { label: 'Bio / Biography', done: !!(person.bio && person.bio.trim().length > 10) },
            { label: 'Professional Designation', done: !!(person.designation && person.designation.trim().length > 1) },
            { label: 'Profession Category', done: !!(person.profession_category || person.profession) },
            { label: 'Company / Organization', done: !!(person.company && person.company !== 'Not specified') },
            { label: 'Location (City)', done: !!(person.city && person.city !== 'Not specified') },
            { label: 'Social Profile (LinkedIn/GitHub/Portfolio/Personal Website)', done: !!(person.linkedin_url || person.github_url || person.portfolio_url || person.personal_url) },
            { label: 'Skills Tags', done: !!(person.skills && person.skills.length > 0) },
            { label: 'Mentorship Preference', done: person.mentorship_status !== 'Not Available' },
            { label: 'Open For Badges', done: !!(person.open_for && person.open_for.length > 0) },
            { label: 'Profile Photo', done: !!(person.profile_photo && !person.profile_photo.includes('unsplash.com/photo-1535713875002')) },
          ];
          const done = fields.filter(f => f.done).length;
          const pct = Math.round((done / fields.length) * 100);
          const missing = fields.filter(f => !f.done);
          if (pct === 100) return null;
          return (
            <div className="profile-card" style={{ marginBottom: '16px', padding: '18px 24px', background: '#fffbeb', border: '1px solid #fef3c7', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1rem' }}>📋</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#78350f' }}>Profile Strength</span>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444' }}>{pct}%</span>
                </div>
                <button onClick={openEditProfileModal} style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Complete Profile →
                </button>
              </div>
              <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: '99px', background: pct >= 80 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : pct >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)', transition: 'width 1s ease' }} />
              </div>
              {missing.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Click missing sections to complete them:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {missing.map(f => (
                      <button 
                        key={f.label} 
                        onClick={openEditProfileModal}
                        style={{ background: 'none', border: '1px dashed #ef4444', color: '#ef4444', borderRadius: '12px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                      >
                        ➕ Add {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 2. MIDDLE ROW: Layout for professional details, skills, helps, looking-for & social links (single column stacked format) */}
        {/* About Card */}
        <div className="profile-card" style={{ padding: '20px 24px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} style={{ color: '#a855f7' }} /> About
          </h4>
          <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.65, margin: 0 }}>
            {person.bio || currentUser.bio || 'No biography yet. Click Edit Profile to add a short bio.'}
          </p>
        </div>

        {(() => {
          const des = person.designation || currentUser.designation;
          const prof = person.profession || currentUser.profession;
          const comp = person.company || currentUser.company;
          const yoe = person.years_of_experience || currentUser.years_of_experience;
          const edu = person.education || currentUser.education;
          if (!des && !prof && !comp && !yoe && !edu) return null;
          return (
            <div className="profile-card" style={{ padding: '20px 24px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={14} style={{ color: '#3b82f6' }} /> Professional Info
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {(des || prof) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: '#334155' }}>
                    <Briefcase size={13} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                    <span><strong>{des || prof}</strong>{comp ? ` · ${comp}` : ''}</span>
                  </div>
                )}
                {yoe && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: '#334155' }}>
                    <TrendingUp size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <span>{yoe} years of experience</span>
                  </div>
                )}
                {edu && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: '#334155' }}>
                    <GraduationCap size={13} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <span>{edu}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {(() => {
          const linkedin = person.linkedin_url || currentUser.linkedin_url;
          const github = person.github_url || currentUser.github_url;
          const portfolio = person.portfolio_url || currentUser.portfolio_url;
          const personal = person.personal_url || currentUser.personal_url;
          if (!linkedin && !github && !portfolio && !personal) return null;
          return (
            <div className="profile-card" style={{ padding: '20px 24px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={14} style={{ color: '#3b82f6' }} /> Links
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {linkedin && (<a href={linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: '#0a66c2', fontWeight: 600, textDecoration: 'none' }}><Link2 size={14} /> LinkedIn Profile</a>)}
                {github && (<a href={github} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: '#1e293b', fontWeight: 600, textDecoration: 'none' }}><Code2 size={14} /> GitHub Profile</a>)}
                {portfolio && (<a href={portfolio} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}><Globe size={14} /> Portfolio / Work</a>)}
                {personal && (<a href={personal} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}><ExternalLink size={14} /> Personal Website</a>)}
              </div>
            </div>
          );
        })()}

        {person.skills && person.skills.length > 0 && (
          <div className="profile-card" style={{ padding: '20px 24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={14} style={{ color: '#f59e0b' }} /> Skills & Expertise
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {person.skills.map((skill: string) => (
                <span key={skill} style={{ background: 'rgba(139,92,246,0.08)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.2)', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700 }}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {person.help_categories && person.help_categories.length > 0 && (
          <div className="profile-card" style={{ padding: '20px 24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>✋ How I Can Help</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {person.help_categories.map((cat: string) => (
                <span key={cat} style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700 }}>✓ {cat}</span>
              ))}
            </div>
          </div>
        )}

        {person.looking_for && person.looking_for.length > 0 && (
          <div className="profile-card" style={{ padding: '20px 24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>🔍 Looking For</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {person.looking_for.map((item: string) => (
                <span key={item} style={{ background: 'rgba(244,63,94,0.08)', color: '#e11d48', border: '1px solid rgba(244,63,94,0.2)', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700 }}>→ {item}</span>
              ))}
            </div>
          </div>
        )}

        {(() => {
          const emailVis = person.show_email !== false && (person.email || currentUser.email);
          const mobileVis = person.show_mobile !== false && (person.mobile || currentUser.mobile);
          if (!emailVis && !mobileVis) return null;
          return (
            <div className="profile-card" style={{ padding: '20px 24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} style={{ color: '#3b82f6' }} /> Contact</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {emailVis && <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: '#334155' }}><Mail size={13} style={{ color: '#3b82f6', flexShrink: 0 }} /><span>{person.email || currentUser.email}</span></div>}
                {mobileVis && <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', color: '#334155' }}><Phone size={13} style={{ color: '#22c55e', flexShrink: 0 }} /><span>{person.mobile || currentUser.mobile}</span></div>}
              </div>
            </div>
          );
        })()}

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
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>Class of {cUser.batch_year} (Cls {cUser.leaving_class || 'XII'}) · {cUser.profession}</p>
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
                      <img 
                        src={author.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80'} 
                        alt="" 
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} 
                        onClick={() => { if (author.id) { onViewProfile(author.id); setSelectedPostForModal(null); } }}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 
                          style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                          onClick={() => { if (author.id) { onViewProfile(author.id); setSelectedPostForModal(null); } }}
                        >
                          {author.full_name || 'Vidyapith Alumnus'}
                        </h4>
                        <span style={{ fontSize: '0.74rem', color: '#8e8e8e' }}>Class of {author.batch_year || '—'}</span>
                      </div>
                      <button onClick={handleConnectClick} className="btn-ig-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                        {profileConnectionStatus === 'accepted' ? '✓ Connected' : profileConnectionStatus === 'pending_sent' ? 'Pending' : 'Connect'}
                      </button>
                    </div>

                    {/* Scrollable Comments/Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                      {/* Caption */}
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <img 
                          src={author.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80'} 
                          alt="" 
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }} 
                          onClick={() => { if (author.id) { onViewProfile(author.id); setSelectedPostForModal(null); } }}
                        />
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.45 }}>
                            <strong 
                              style={{ marginRight: '6px', cursor: 'pointer' }}
                              onClick={() => { if (author.id) { onViewProfile(author.id); setSelectedPostForModal(null); } }}
                            >
                              {author.full_name}
                            </strong>
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
                              <img 
                                src={commentAuthor.profile_photo} 
                                alt="" 
                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }} 
                                onClick={() => { if (commentAuthor.id) { onViewProfile(commentAuthor.id); setSelectedPostForModal(null); } }}
                              />
                              <div>
                                <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.4 }}>
                                  <strong 
                                    style={{ marginRight: '6px', cursor: 'pointer' }}
                                    onClick={() => { if (commentAuthor.id) { onViewProfile(commentAuthor.id); setSelectedPostForModal(null); } }}
                                  >
                                    {commentAuthor.full_name}
                                  </strong>
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
                        
                        // Optimistic: add comment instantly
                        const tempModalComment = {
                          id: `temp-modal-${Date.now()}`,
                          post_id: selectedPostForModal.id,
                          content,
                          created_at: new Date().toISOString(),
                          author_id: currentUser?.id,
                          author: currentUser
                        };
                        const optimisticComments = [...(selectedPostForModal.comments || []), tempModalComment];
                        setSelectedPostForModal((prev: any) => prev ? { ...prev, comments: optimisticComments } : prev);
                        inputEl.value = '';
                        try {
                          await apiFetch(`/posts/${selectedPostForModal.id}/comments`, {
                            method: 'POST',
                            body: JSON.stringify({ content })
                          });
                          showToast("Comment published!", "success");
                        } catch (err: any) {
                          // Revert on failure
                          setSelectedPostForModal((prev: any) => prev ? { ...prev, comments: (prev.comments || []).filter((c: any) => c.id !== tempModalComment.id) } : prev);
                          inputEl.value = content;
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

        {/* RELATIONS MODAL OVERLAY */}
        {activeRelationsTab && profileRelations && (
          <div 
            className="modal-overlay" 
            onClick={() => {
              setActiveRelationsTab(null);
              setRelationsSearchQuery('');
            }}
            style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)' }}
          >
            <div 
              className="modal-card" 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                maxWidth: '440px', 
                width: '90%', 
                background: '#ffffff', 
                borderRadius: '16px', 
                padding: '0', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', 
                color: '#1e293b', 
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '70vh',
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 16px', borderBottom: '1px solid #efefef', position: 'relative' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#000000', textTransform: 'capitalize', textAlign: 'center' }}>
                  Connections
                </h3>
                <button 
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#000000', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', outline: 'none' }} 
                  onClick={() => {
                    setActiveRelationsTab(null);
                    setRelationsSearchQuery('');
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Search Bar Container */}
              <div style={{ padding: '12px 16px 8px 16px', position: 'relative' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
                  <input 
                    type="text"
                    value={relationsSearchQuery}
                    onChange={(e) => setRelationsSearchQuery(e.target.value)}
                    placeholder="Search"
                    style={{
                      width: '100%',
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px 8px 36px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {relationsSearchQuery && (
                    <button 
                      onClick={() => setRelationsSearchQuery('')}
                      style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Relations list */}
              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 16px 16px 16px' }}>
                {(() => {
                  const list = profileRelations[activeRelationsTab] || [];
                  const filtered = list.filter((u: any) => {
                    const uname = getUsername(u);
                    const fname = u.full_name || '';
                    const q = relationsSearchQuery.toLowerCase();
                    return uname.toLowerCase().includes(q) || fname.toLowerCase().includes(q);
                  });

                  if (filtered.length === 0) {
                    return (
                      <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', padding: '32px 0', margin: 0 }}>
                        No results found.
                      </p>
                    );
                  }

                  return filtered.map((u: any) => {
                    const username = getUsername(u);
                    const isSelf = currentUser.id === u.id;
                    const doIFollowThem = connections.some((c: any) => c.id === u.id) || connectionSentIds.includes(u.id) || isSelf;

                    return (
                      <div 
                        key={u.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '8px 0'
                        }}
                      >
                        {/* Avatar */}
                        <img 
                          src={u.profile_photo} 
                          alt={u.full_name} 
                          style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => {
                            setActiveRelationsTab(null);
                            setRelationsSearchQuery('');
                            onViewProfile(u.id);
                          }}
                        />

                        {/* Name & Details */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span 
                              style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', cursor: 'pointer' }}
                              onClick={() => {
                                setActiveRelationsTab(null);
                                setRelationsSearchQuery('');
                                onViewProfile(u.id);
                              }}
                            >
                              {username}
                            </span>
                            {!doIFollowThem && (
                              <span 
                                onClick={async () => {
                                  await handleConnectRequest(u.id, u.full_name);
                                  if (profileUser) loadProfile(profileUser.id);
                                }}
                                style={{ fontSize: '0.88rem', color: '#0095f6', fontWeight: 600, cursor: 'pointer' }}
                              >
                                · Connect
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            {u.full_name}
                          </span>
                        </div>

                        {/* Action Button */}
                        <div>
                          {isSelf ? (
                            <span style={{ fontSize: '0.82rem', color: '#9ca3af', fontWeight: 600 }}>You</span>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveRelationsTab(null);
                                setRelationsSearchQuery('');
                                onViewProfile(u.id);
                              }}
                              style={{
                                background: '#f3f4f6',
                                border: 'none',
                                padding: '6px 12px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#000000',
                                borderRadius: '8px',
                                cursor: 'pointer'
                              }}
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* EDIT PROFILE MODAL OVERLAY */}
        {editProfileOpen && (
          <div 
            className="modal-overlay" 
            onClick={() => setEditProfileOpen(false)}
            style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(12px)' }}
          >
            <div 
              className="modal-card" 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                maxWidth: '600px', 
                width: '90%', 
                background: '#ffffff', 
                borderRadius: '20px', 
                padding: '0', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
                color: '#1e293b', 
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh',
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Edit / Complete Profile
                </h3>
                <button 
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none', borderRadius: '50%', transition: 'background-color 0.2s' }} 
                  onClick={() => setEditProfileOpen(false)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                <form onSubmit={handleSaveEditProfile}>
                  
                  {/* Photo Upload Section */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--primary-color)', flexShrink: 0 }}>
                      <img 
                        src={editPhotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80'} 
                        alt="Preview" 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover'
                        }} 
                      />
                      {uploadingPhoto && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Loader2 size={20} className="animate-spin" style={{ color: 'white' }} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 200px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label className="btn-ig-grey" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#334155', margin: 0, background: '#ffffff', transition: 'all 0.2s' }}>
                          <Camera size={14} />
                          Upload Photo
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                        </label>
                        {editPhotoUrl && (
                          <button
                            type="button"
                            onClick={handleAdjustExistingPhoto}
                            className="btn-ig-grey"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#334155', cursor: 'pointer', background: '#f1f5f9', transition: 'all 0.2s' }}
                            title="Crop and Rotate Photo"
                          >
                            <RotateCw size={14} />
                            Adjust / Rotate
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>JPG, PNG or WEBP. Max 5MB.</div>
                    </div>
                  </div>

                  {/* Section: Personal Profile */}
                  <div className="profile-section-title">
                    <UserIcon size={16} style={{ color: 'var(--primary-color)' }} />
                    <span>Personal Profile</span>
                  </div>
                  
                  <div className="profile-modal-grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Full Name *</label>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none' }}
                        required 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Mobile Number</label>
                      <input 
                        type="tel" 
                        value={editMobile} 
                        onChange={(e) => setEditMobile(e.target.value)} 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none' }}
                        placeholder="e.g. +91 9876543210"
                      />
                    </div>
                  </div>

                  <div className="profile-modal-grid-2" style={{ marginTop: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>City</label>
                      <input 
                        type="text" 
                        value={editCity} 
                        onChange={(e) => setEditCity(e.target.value)} 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none' }}
                        placeholder="e.g. Deoghar, Bangalore"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Country</label>
                      <input 
                        type="text" 
                        value={editCountry} 
                        onChange={(e) => setEditCountry(e.target.value)} 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none' }}
                        placeholder="e.g. India, USA"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Biography / Bio</label>
                    <textarea 
                      rows={3} 
                      value={editBio} 
                      onChange={(e) => setEditBio(e.target.value)} 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none', resize: 'vertical' }}
                      placeholder="Share a short bio about yourself..."
                    />
                  </div>

                  {/* Section: Vidyapith Heritage */}
                  <div className="profile-section-title">
                    <GraduationCap size={16} style={{ color: 'var(--primary-color)' }} />
                    <span>Vidyapith Heritage</span>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '8px' }}>
                      Leaving / Pass Out Class & Year *
                    </label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                      {/* Class Selector */}
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {(['X', 'XII'] as const).map((cls) => (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setEditLeavingClass(cls)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '8px',
                              border: editLeavingClass === cls
                                ? '2px solid #f97316'
                                : '1px solid #cbd5e1',
                              background: editLeavingClass === cls
                                ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
                                : '#f8fafc',
                              color: editLeavingClass === cls ? '#c2410c' : '#64748b',
                              fontWeight: editLeavingClass === cls ? 800 : 500,
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: editLeavingClass === cls ? '0 2px 8px rgba(249,115,22,0.2)' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              lineHeight: 1.2,
                            }}
                          >
                            <span>Class {cls}</span>
                            <span style={{ fontSize: '0.65rem', opacity: 0.75, fontWeight: 500 }}>
                              {cls === 'X' ? '10th' : '12th'}
                            </span>
                          </button>
                        ))}
                      </div>
                      {/* Year Input */}
                      <div style={{ flex: '1 1 120px', minWidth: '100px' }}>
                        <input 
                          type="number" 
                          value={editBatch} 
                          onChange={(e) => setEditBatch(e.target.value)} 
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none', height: '100%', boxSizing: 'border-box' }}
                          placeholder={editLeavingClass === 'X' ? "Year (e.g. 2008)" : "Year (e.g. 2010)"}
                          required 
                        />
                      </div>
                    </div>
                    {editBatch && parseInt(editBatch) >= 1950 && parseInt(editBatch) <= 2026 && (
                      <p style={{ marginTop: '6px', fontSize: '0.74rem', color: '#f97316', fontWeight: 600 }}>
                        🎓 Class {editLeavingClass} Pass Out: {editBatch}
                      </p>
                    )}
                  </div>

                  {/* Section: Professional Journey */}
                  <div className="profile-section-title">
                    <Briefcase size={16} style={{ color: 'var(--primary-color)' }} />
                    <span>Professional Journey</span>
                  </div>

                  <div className="profile-modal-grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Industry</label>
                      <select
                        value={editIndustry}
                        onChange={(e) => setEditIndustry(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none', height: '42px', cursor: 'pointer' }}
                      >
                        <option value="">Select Industry</option>
                        {["Technology", "Finance", "Healthcare", "Education", "Government", "Consulting", "Entrepreneurship", "Other"].map(ind => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Profession Category</label>
                      <input 
                        type="text" 
                        value={editProfession} 
                        onChange={(e) => setEditProfession(e.target.value)} 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none' }}
                        placeholder="e.g. Software Development"
                      />
                    </div>
                  </div>

                  <div className="profile-modal-grid-2" style={{ marginTop: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Designation / Title</label>
                      <input 
                        type="text" 
                        value={editDesignation} 
                        onChange={(e) => setEditDesignation(e.target.value)} 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none' }}
                        placeholder="e.g. Senior Architect"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Company / Institution</label>
                      <input 
                        type="text" 
                        value={editCompany} 
                        onChange={(e) => setEditCompany(e.target.value)} 
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none' }}
                        placeholder="e.g. Google, AIIMS"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Mentorship Status</label>
                    <select
                      value={editMentorshipStatus}
                      onChange={(e) => setEditMentorshipStatus(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none', height: '42px', cursor: 'pointer' }}
                    >
                      <option value="Available">✅ Available</option>
                      <option value="Limited Availability">⚡ Limited Availability</option>
                      <option value="Not Available">❌ Not Available</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px' }}>Education</label>
                    <input 
                      type="text" 
                      value={editEducation} 
                      onChange={(e) => setEditEducation(e.target.value)} 
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.92rem', outline: 'none' }}
                      placeholder="e.g. B.Tech, Stanford University"
                    />
                  </div>

                  {/* Section: Social Profiles */}
                  <div className="profile-section-title">
                    <Link size={16} style={{ color: 'var(--primary-color)' }} />
                    <span>Social Profiles</span>
                  </div>

                  <div className="profile-modal-grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>LinkedIn URL</label>
                      <input
                        type="text"
                        value={editLinkedinUrl}
                        onChange={(e) => setEditLinkedinUrl(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.88rem', outline: 'none' }}
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>GitHub URL</label>
                      <input
                        type="text"
                        value={editGithubUrl}
                        onChange={(e) => setEditGithubUrl(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.88rem', outline: 'none' }}
                        placeholder="https://github.com/username"
                      />
                    </div>
                  </div>

                  <div className="profile-modal-grid-2" style={{ marginTop: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Portfolio Website</label>
                      <input
                        type="text"
                        value={editPortfolioUrl}
                        onChange={(e) => setEditPortfolioUrl(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.88rem', outline: 'none' }}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Personal Website</label>
                      <input
                        type="text"
                        value={editPersonalUrl}
                        onChange={(e) => setEditPersonalUrl(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontSize: '0.88rem', outline: 'none' }}
                        placeholder="https://personalwebsite.com"
                      />
                    </div>
                  </div>

                  {/* Section: Privacy Settings */}
                  <div className="profile-section-title">
                    <ShieldCheck size={16} style={{ color: 'var(--primary-color)' }} />
                    <span>Privacy & Settings</span>
                  </div>

                  {/* Visibility & Privacy checkboxes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, textTransform: 'none', color: '#334155', fontWeight: 600, fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={editShowEmail} 
                        onChange={(e) => setEditShowEmail(e.target.checked)} 
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>Show Email to verified Alumni</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, textTransform: 'none', color: '#334155', fontWeight: 600, fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={editShowMobile} 
                        onChange={(e) => setEditShowMobile(e.target.checked)} 
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>Show Mobile Number to classmates</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, textTransform: 'none', color: '#334155', fontWeight: 600, fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={editShowSocial} 
                        onChange={(e) => setEditShowSocial(e.target.checked)} 
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>Show Social Links on profile</span>
                    </label>
                  </div>

                  {/* Footer buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <button 
                      type="button" 
                      onClick={() => setEditProfileOpen(false)} 
                      className="btn-ig-grey"
                      style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#f1f5f9', fontWeight: 600, color: '#334155' }}
                      disabled={updatingProfile}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-ig-black"
                      style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#0f172a', fontWeight: 700, color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      disabled={updatingProfile}
                    >
                      {updatingProfile ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Saving...
                        </>
                      ) : 'Save Changes'}
                    </button>
                  </div>

                </form>
              </div>

            </div>
          </div>
        )}

        {/* ADJUST PROFILE PHOTO MODAL */}
        {cropModalOpen && (
          <div 
            className="modal-overlay" 
            style={{ zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)' }}
          >
            <div 
              className="modal-card" 
              style={{ 
                maxWidth: '420px', 
                width: '90%', 
                background: '#ffffff', 
                borderRadius: '20px', 
                padding: '24px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
                color: '#1e293b', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '20px' 
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a', textAlign: 'center', width: '100%', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                Adjust Profile Photo
              </h3>

              {/* Viewport Mask Workspace */}
              <div 
                style={{ 
                  width: '280px', 
                  height: '280px', 
                  position: 'relative', 
                  overflow: 'hidden', 
                  borderRadius: '50%', 
                  background: '#0f172a', 
                  boxShadow: '0 0 0 2px var(--primary-color), inset 0 2px 8px rgba(0,0,0,0.5)',
                  cursor: 'move'
                }}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={handleCropMouseUp}
                onTouchStart={handleCropTouchStart}
                onTouchMove={handleCropTouchMove}
                onTouchEnd={handleCropTouchEnd}
              >
                <img 
                  src={cropImageSrc} 
                  alt="Cropping Preview" 
                  style={{ 
                    position: 'absolute', 
                    left: '50%', 
                    top: '50%', 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    pointerEvents: 'none', // Prevents default drag ghosting
                    transform: `translate(-50%, -50%) translate(${cropX}px, ${cropY}px) rotate(${cropRotation}deg) scale(${cropZoom})`,
                    transformOrigin: 'center center',
                    transition: cropDraggingRef.current ? 'none' : 'transform 0.1s ease'
                  }} 
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                Drag photo to pan. Use slider to zoom.
              </div>

              {/* Zoom Slider */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                  <span>ZOOM</span>
                  <span>{cropZoom.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05" 
                  value={cropZoom} 
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))} 
                  style={{ width: '100%', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                />
              </div>

              {/* Controls Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '16px', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCropRotation((prev) => (prev + 90) % 360)}
                  className="btn-ig-grey"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#334155', cursor: 'pointer', background: '#f1f5f9' }}
                >
                  <RotateCw size={14} />
                  Rotate
                </button>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setCropModalOpen(false)} 
                    className="btn-ig-grey"
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#f1f5f9', fontWeight: 600, color: '#334155' }}
                    disabled={uploadingPhoto}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCropApply} 
                    className="btn-ig-black"
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#0f172a', fontWeight: 700, color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                  </button>
                </div>
              </div>

            </div>
          </div>
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

        {/* Feature 10: QR Code Profile Sharing Modal */}
        {qrModalOpen && (() => {
          const profileUrl = `${window.location.origin}/profile/${currentUser.id}`;
          const qrRef = React.createRef<HTMLCanvasElement>();

          const handleDownload = () => {
            const canvas = document.getElementById('profile-qr-canvas') as HTMLCanvasElement | null;
            if (!canvas) return;
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(currentUser.full_name || 'profile').replace(/\s+/g, '_')}_QR.png`;
            a.click();
          };

          const handleShare = async () => {
            const canvas = document.getElementById('profile-qr-canvas') as HTMLCanvasElement | null;
            if (navigator.share) {
              try {
                if (canvas) {
                  canvas.toBlob(async (blob) => {
                    if (!blob) { navigator.share({ title: currentUser.full_name, url: profileUrl }); return; }
                    const file = new File([blob], 'profile_qr.png', { type: 'image/png' });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                      await navigator.share({ title: `${currentUser.full_name}'s Profile`, text: 'Check out my alumni profile on Vidyapith!', files: [file], url: profileUrl });
                    } else {
                      await navigator.share({ title: `${currentUser.full_name}'s Profile`, text: 'Check out my alumni profile on Vidyapith!', url: profileUrl });
                    }
                  });
                } else {
                  await navigator.share({ title: `${currentUser.full_name}'s Profile`, text: 'Check out my alumni profile on Vidyapith!', url: profileUrl });
                }
              } catch (err) { /* user cancelled */ }
            } else {
              navigator.clipboard.writeText(profileUrl);
              showToast('Profile link copied to clipboard!', 'success');
            }
          };

          return (
            <div
              onClick={() => setQrModalOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px'
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background: 'linear-gradient(160deg, #1a2035 0%, #0d1424 100%)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  borderRadius: '24px',
                  padding: '36px 28px 28px',
                  width: '100%',
                  maxWidth: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '18px',
                  boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.08)',
                  position: 'relative'
                }}
              >
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setQrModalOpen(false)}
                  style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} />
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', margin: '0 0 4px' }}>Share Profile</h3>
                  <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>Scan to visit · Share with anyone</p>
                </div>

                {/* QR Code */}
                <div style={{
                  background: 'white', borderRadius: '16px', padding: '14px',
                  border: '3px solid #d4af37',
                  boxShadow: '0 0 32px rgba(212,175,55,0.25), 0 8px 24px rgba(0,0,0,0.3)'
                }}>
                  <QRCodeCanvas
                    id="profile-qr-canvas"
                    value={profileUrl}
                    size={190}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="H"
                    imageSettings={{
                      src: '/favicon.ico',
                      x: undefined,
                      y: undefined,
                      height: 36,
                      width: 36,
                      excavate: true,
                    }}
                  />
                </div>

                {/* User identity under QR */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem' }}>{currentUser.full_name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#d4af37', marginTop: '3px', letterSpacing: '0.04em' }}>RKMV Batch of {currentUser.batch_year}</div>
                </div>

                {/* URL copy bar */}
                <div style={{
                  display: 'flex', gap: '8px', width: '100%',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', padding: '8px 12px', alignItems: 'center'
                }}>
                  <Link2 size={13} style={{ color: '#64748b', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.67rem', color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profileUrl}</span>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(profileUrl); showToast('Profile link copied!', 'success'); }}
                    style={{ background: '#d4af37', border: 'none', color: '#0f172a', borderRadius: '6px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Copy
                  </button>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <button
                    type="button"
                    onClick={handleDownload}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      padding: '12px', borderRadius: '12px', border: '1.5px solid rgba(212,175,55,0.35)',
                      background: 'rgba(212,175,55,0.08)', color: '#d4af37',
                      fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    <Download size={15} /> Save QR
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      padding: '12px', borderRadius: '12px', border: 'none',
                      background: 'linear-gradient(135deg, #d4af37 0%, #f59e0b 100%)',
                      color: '#0f172a',
                      fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(212,175,55,0.35)'
                    }}
                  >
                    <Share2 size={15} /> Share
                  </button>
                </div>
              </div>
            </div>
          );
        })()}


        {/* Custom Remove Connection Confirmation Modal */}
        {confirmRemoveOpen && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 1200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)'
            }}
            onClick={() => setConfirmRemoveOpen(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff', borderRadius: '20px',
                padding: '32px 28px', maxWidth: '380px', width: '90%',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                border: '1px solid #f1f5f9', textAlign: 'center'
              }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <UserMinus size={26} style={{ color: '#ef4444' }} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Remove Connection?
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
                You will be disconnected from{' '}
                <strong style={{ color: '#0f172a' }}>
                  {profileUser && (profileUser.profile?.full_name || profileUser.full_name)}
                </strong>.
                You can send a new request anytime.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setConfirmRemoveOpen(false)}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0', background: '#f8fafc',
                    fontSize: '0.9rem', fontWeight: 700, color: '#475569',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}
                >
                  Cancel
                </button>
                <button
                  onClick={doRemoveConnection}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: '10px',
                    border: 'none', background: '#ef4444',
                    fontSize: '0.9rem', fontWeight: 700, color: '#fff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239,68,68,0.35)'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#dc2626')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#ef4444')}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Delete Post Confirmation Modal */}
        {postToDeleteId && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 1200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)'
            }}
            onClick={() => setPostToDeleteId(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff', borderRadius: '20px',
                padding: '32px 28px', maxWidth: '380px', width: '90%',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                border: '1px solid #f1f5f9', textAlign: 'center'
              }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Trash2 size={26} style={{ color: '#ef4444' }} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Delete Post?
              </h3>
              <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
                Are you sure you want to permanently delete this post? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setPostToDeleteId(null)}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: '10px',
                    border: '1.5px solid #e2e8f0', background: '#f8fafc',
                    fontSize: '0.9rem', fontWeight: 700, color: '#475569',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#f8fafc')}
                >
                  Cancel
                </button>
                <button
                  onClick={doDeletePost}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: '10px',
                    border: 'none', background: '#ef4444',
                    fontSize: '0.9rem', fontWeight: 700, color: '#fff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(239,68,68,0.35)'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#dc2626')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#ef4444')}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
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
                      Batch of {profileUser.profile?.batch_year || profileUser.batch_year || 2008}{' '}
                      <span style={{ fontSize: '0.78rem', background: 'rgba(212,175,55,0.15)', borderRadius: '20px', padding: '1px 8px', marginLeft: '4px' }}>
                        Class {profileUser.profile?.leaving_class || profileUser.leaving_class || 'XII'}
                      </span>
                      {' '}• {profileUser.profile?.house || profileUser.house || "Vivekananda House"}
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
                  <p style={{ lineHeight: 1.5 }}>{profileUser.profile?.bio || profileUser.bio || "No biography added yet. Edit your profile to update."}</p>
                </div>

                {/* Mentorship Status Badge */}
                {(() => {
                  const status = profileUser.profile?.mentorship_status || profileUser.mentorship_status;
                  if (!status || status === 'Not Available') return null;
                  const isAvailable = status === 'Available';
                  return (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '12px',
                      padding: '8px 16px', borderRadius: '20px',
                      background: isAvailable ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                      border: `1px solid ${isAvailable ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                      color: isAvailable ? '#10b981' : '#f59e0b', fontWeight: 700, fontSize: '0.85rem'
                    }}>
                      {isAvailable ? '🟢 Open to Mentoring' : '⚡ Limited Mentoring Availability'}
                    </div>
                  );
                })()}

                {/* Skills */}
                {(() => {
                  const skills: string[] = profileUser.profile?.skills || profileUser.skills || [];
                  if (skills.length === 0) return null;
                  return (
                    <div style={{ marginTop: '16px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Skills</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {skills.map(skill => (
                          <span key={skill} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* How I Can Help */}
                {(() => {
                  const help: string[] = profileUser.profile?.help_categories || profileUser.help_categories || [];
                  if (help.length === 0) return null;
                  return (
                    <div style={{ marginTop: '16px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>How I Can Help</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {help.map(h => (
                          <span key={h} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Social Links */}
                {(() => {
                  const linkedin = profileUser.profile?.linkedin_url || profileUser.linkedin_url;
                  const github = profileUser.profile?.github_url || profileUser.github_url;
                  const portfolio = profileUser.profile?.portfolio_url || profileUser.portfolio_url;
                  if (!linkedin && !github && !portfolio) return null;
                  return (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                      {linkedin && (
                        <a href={linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 14px', background: 'rgba(10,102,194,0.12)', border: '1px solid rgba(10,102,194,0.3)', borderRadius: '8px', color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>
                          🔗 LinkedIn
                        </a>
                      )}
                      {github && (
                        <a href={github} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontWeight: 600, textDecoration: 'none' }}>
                          🐙 GitHub
                        </a>
                      )}
                      {portfolio && (
                        <a href={portfolio} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 14px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', color: '#c4b5fd', fontWeight: 600, textDecoration: 'none' }}>
                          🌐 Portfolio
                        </a>
                      )}
                    </div>
                  );
                })()}

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '32px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{profilePosts.length}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Posts Published</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>142</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Connections</span>
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
                  {currentUser.batch_year} · Cls {currentUser.leaving_class || 'XII'}
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
                
                {/* Drag and Drop Zone — Feature 3: Real Cloudinary Upload */}
                <input
                  type="file"
                  ref={memoryPhotoInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  multiple
                  onChange={handleMemoryPhotoFileChange}
                />
                <div 
                  className={`drag-drop-zone ${dragOverActive ? 'active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverActive(true); }}
                  onDragLeave={() => setDragOverActive(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverActive(false);
                    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                    if (files.length === 0) {
                      showToast("Please drop image files only.", "danger");
                      return;
                    }
                    for (const file of files) {
                      try {
                        showToast(`Uploading ${file.name}...`, "info");
                        const result = await uploadMedia(file, 'posts/images');
                        if (result && result.url) {
                          setMediaImages(prev => [...prev, result.url]);
                        }
                      } catch {
                        showToast(`Failed to upload ${file.name}.`, "danger");
                      }
                    }
                    showToast("All photos uploaded!", "success");
                  }}
                  onClick={() => memoryPhotoInputRef.current?.click()}
                  style={{
                    border: '2px dashed ' + (dragOverActive ? 'var(--primary-color)' : 'var(--border-color)'),
                    padding: '20px', borderRadius: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.15)', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '1.6rem', display: 'block', marginBottom: '4px' }}>📤</span>
                  <span>Drag & Drop photos here, or click to select memory photos from your device.</span>
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
              (feedTab === 'Trending'
                ? [...filteredPosts].sort((a, b) => {
                    const scoreA = (a.likes || []).length + ((a as any).comments || []).length;
                    const scoreB = (b.likes || []).length + ((b as any).comments || []).length;
                    return scoreB - scoreA;
                  })
                : filteredPosts
              ).map(post => {
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
                            getYouTubeId(post.media_urls[0]) || post.media_urls[0].includes('video/upload') || post.media_urls[0].endsWith('.mp4') || post.media_urls[0].endsWith('.mov') || post.media_urls[0].endsWith('.webm') ? (
                              getYouTubeId(post.media_urls[0]) ? (
                                <iframe
                                  src={`https://www.youtube.com/embed/${getYouTubeId(post.media_urls[0])}`}
                                  style={{ width: '100%', height: '250px', border: 'none' }}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title="Article Video Cover"
                                />
                              ) : (
                                <video 
                                  src={post.media_urls[0]} 
                                  controls 
                                  style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', background: '#000', display: 'block' }} 
                                />
                              )
                            ) : (
                              <img 
                                src={post.media_urls[0]} 
                                alt={post.media_urls[1] || 'Article Cover'} 
                                style={{ width: '100%', maxHeight: '250px', objectFit: 'cover' }} 
                              />
                            )
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {(() => {
                            const { topLevel, repliesMap } = parseCommentsAndReplies(comments);
                            const topLevelToShow = isCommentsExpanded ? topLevel : topLevel.slice(-2);
                            return topLevelToShow.map((comment: any) => {
                              const commAuthor = comment.author;
                              if (!commAuthor) return null;
                              return (
                                <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <div className="instagram-comment-item" style={{ margin: 0 }}>
                                    <div className="comment-item-content" style={{ flex: 1 }}>
                                      <div>
                                        <span 
                                          className="comment-item-author"
                                          onClick={() => onViewProfile(commAuthor.id)}
                                        >
                                          {commAuthor.full_name}
                                        </span>
                                        <span className="comment-item-text">
                                          {comment.content}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '3px' }}>
                                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                          {formatTimeAgo(comment.created_at)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setReplyingTo({ postId: post.id, commentId: comment.id, authorName: commAuthor.full_name })}
                                          style={{ background: 'none', border: 'none', color: '#ec4899', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                        >
                                          Reply
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Replies */}
                                  {repliesMap[comment.id]?.map((reply: any) => {
                                    const repAuthor = reply.author;
                                    if (!repAuthor) return null;
                                    return (
                                      <div key={reply.id} className="instagram-comment-item" style={{ marginLeft: '24px', borderLeft: '2px solid rgba(255,255,255,0.06)', paddingLeft: '8px', margin: 0 }}>
                                        <div className="comment-item-content">
                                          <div>
                                            <span 
                                              className="comment-item-author"
                                              onClick={() => onViewProfile(repAuthor.id)}
                                            >
                                              {repAuthor.full_name}
                                            </span>
                                            <span className="comment-item-text">
                                              {reply.content}
                                            </span>
                                          </div>
                                          <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px', display: 'inline-block' }}>
                                            {formatTimeAgo(reply.created_at)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {replyingTo && replyingTo.postId === post.id && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'rgba(255,255,255,0.04)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          fontSize: '0.78rem',
                          width: '100%',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Replying to <strong style={{ color: '#ec4899' }}>@{replyingTo.authorName}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setReplyingTo(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                          >
                            ✕
                          </button>
                        </div>
                      )}

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
                          <img 
                            src={author.profile_photo || currentUser.profile_photo} 
                            alt={author.full_name} 
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} 
                            onClick={() => { const aid = author.id || post.author_id; if (aid) onViewProfile(aid); }}
                          />
                          <div>
                            <h4 
                              style={{ color: 'white', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                              onClick={() => { const aid = author.id || post.author_id; if (aid) onViewProfile(aid); }}
                            >
                              {author.full_name || currentUser.full_name}
                            </h4>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <img 
                    src={activeMemoryLightbox.author?.profile_photo || currentUser.profile_photo} 
                    alt="Author" 
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} 
                    onClick={() => { const aid = activeMemoryLightbox.author?.id || activeMemoryLightbox.author_id; if (aid) { onViewProfile(aid); setActiveMemoryLightbox(null); } }}
                  />
                  <div>
                    <h4 
                      style={{ color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => { const aid = activeMemoryLightbox.author?.id || activeMemoryLightbox.author_id; if (aid) { onViewProfile(aid); setActiveMemoryLightbox(null); } }}
                    >
                      {activeMemoryLightbox.author?.full_name || "Vidyapith Alumnus"}
                    </h4>
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
                      <img 
                        src={cmt.author?.profile_photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&q=80'} 
                        style={{ width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer' }} 
                        alt="cmt author" 
                        onClick={() => { if (cmt.author?.id) { onViewProfile(cmt.author.id); setActiveMemoryLightbox(null); } }}
                      />
                      <div>
                        <span 
                          style={{ color: 'white', fontWeight: 700, marginRight: '6px', cursor: 'pointer' }}
                          onClick={() => { if (cmt.author?.id) { onViewProfile(cmt.author.id); setActiveMemoryLightbox(null); } }}
                        >
                          {cmt.author?.full_name || 'Alumnus'}
                        </span>
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
                    // Optimistic: add comment instantly
                    const tempLbComment = {
                      id: `temp-lb-${Date.now()}`,
                      post_id: activeMemoryLightbox.id,
                      content: cText,
                      created_at: new Date().toISOString(),
                      author: { id: currentUser.id, full_name: currentUser.full_name, profile_photo: currentUser.profile_photo }
                    };
                    const optimisticLbComments = [...(activeMemoryLightbox.comments || []), tempLbComment];
                    setActiveMemoryLightbox({ ...activeMemoryLightbox, comments: optimisticLbComments });
                    setCommentInputs({ ...commentInputs, [activeMemoryLightbox.id]: '' });
                    // Also update posts feed state silently
                    setPosts(prev => prev.map((p: any) => p.id === activeMemoryLightbox.id ? { ...p, comments: optimisticLbComments } : p));
                    try {
                      await apiFetch(`/posts/${activeMemoryLightbox.id}/comments`, {
                        method: 'POST',
                        body: JSON.stringify({ content: cText })
                      });
                      showToast("Comment posted!", "success");
                    } catch (err: any) {
                      // Revert on failure
                      setActiveMemoryLightbox({ ...activeMemoryLightbox, comments: (activeMemoryLightbox.comments || []) });
                      setCommentInputs({ ...commentInputs, [activeMemoryLightbox.id]: cText });
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

