import type { SupportedLocale } from "@/lib/i18n/locales";

export type ParticipantType =
  | "farmer"
  | "agronomist"
  | "fpo"
  | "buyer"
  | "trainer"
  | "ngo"
  | "agri_business";

export type AccountRole =
  | "farmer"
  | "customer"
  | "wholesaler"
  | "agri_business";
export type FarmingMethod =
  | "organic"
  | "natural"
  | "conventional"
  | "mixed";

export type SocialLinks = {
  website?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
};

export type ReviewSummary = {
  average: number;
  count: number;
};

export type CategoryRelationship =
  | "grows"
  | "raises"
  | "farms"
  | "catches"
  | "processes"
  | "buys"
  | "sells"
  | "supplies"
  | "services"
  | "interested_in";

export type ProfileCategoryAffinity = {
  categorySlug: string;
  relationship: CategoryRelationship;
  isPrimary: boolean;
};

export type PostCategory = "discussion" | "question" | "opportunity";

export interface ParticipantProfile {
  id: string;
  handle: string;
  fullName: string;
  initials: string;
  participantType: ParticipantType;
  accountRole: AccountRole;
  roleLabel: string;
  preferredLocale: SupportedLocale;
  categoryAffinities: ProfileCategoryAffinity[];
  district: string;
  state: string;
  crops: string[];
  bio: string;
  farmingMethod?: FarmingMethod;
  socialLinks: SocialLinks;
  reviewSummary: ReviewSummary;
  verified: boolean;
  followers: number;
  following: number;
  experienceYears?: number;
  joinedLabel: string;
  isFollowing?: boolean;
  avatarPath?: string;
  avatarUrl?: string;
  avatarSource?: "oauth" | "uploaded";
  coverPath?: string;
  coverUrl?: string;
  publicProfileEnabled: boolean;
}

// Compatibility alias for the original social-network feature names. New
// marketplace code should prefer ParticipantProfile.
export type FarmerProfile = ParticipantProfile;

export interface FarmerPost {
  id: string;
  authorId: string;
  body: string;
  category: PostCategory;
  crops: string[];
  createdLabel: string;
  helpfulCount: number;
  commentCount: number;
  helpfulByViewer?: boolean;
  imageVariant?: "tomato" | "grapes" | "irrigation";
  imageUrl?: string;
  author?: FarmerProfile;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdLabel: string;
  author?: FarmerProfile;
}

export interface Conversation {
  id: string;
  otherProfileId: string;
  lastMessage: string;
  updatedLabel: string;
  unread: number;
  otherProfile?: FarmerProfile;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdLabel: string;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  targetType:
    | "profile"
    | "post"
    | "comment"
    | "message"
    | "review"
    | "organization"
    | "business_offer"
    | "produce_listing"
    | "certification_claim";
  targetId: string;
  targetLabel: string;
  reason: "misinformation" | "harassment" | "spam" | "unsafe" | "other";
  details: string;
  createdLabel: string;
  status: "pending" | "dismissed" | "actioned";
}

export type ListingStatus = "active" | "draft" | "paused" | "sold";
export type MarketUnit = "kg" | "quintal" | "tonne" | "box";

export interface ProduceListing {
  id: string;
  sellerId: string;
  title: string;
  crop: string;
  variety: string;
  description: string;
  quantity: number;
  unit: MarketUnit;
  minOrder: number;
  price: number;
  priceUnit: MarketUnit;
  harvestStart: string;
  harvestEnd: string;
  availableUntil: string;
  grade: string;
  deliveryOptions: string[];
  deliveryRadiusKm?: number;
  certifications: string[];
  status: ListingStatus;
  viewCount: number;
  saveCount: number;
  enquiryCount: number;
  createdLabel: string;
  imageVariant: "tomato-crates" | "grape-vines" | "onion-sacks" | "okra-basket";
  seller?: ParticipantProfile;
  reviewSummary: ReviewSummary;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "closed";

export interface MarketEnquiry {
  id: string;
  listingId: string;
  buyerId?: string;
  conversationId?: string;
  buyerName: string;
  businessName: string;
  email: string;
  phone: string;
  location: string;
  quantityNeeded: string;
  needBy: string;
  message: string;
  status: LeadStatus;
  createdLabel: string;
  listingTitle?: string;
  seller?: ParticipantProfile;
  review?: MarketReview;
}

export interface MarketReview {
  id: string;
  enquiryId: string;
  listingId: string;
  sellerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdLabel: string;
  listingTitle?: string;
}
