export type ParticipantType =
  | "farmer"
  | "agronomist"
  | "fpo"
  | "buyer"
  | "trainer"
  | "ngo";

export type PostCategory = "discussion" | "question" | "opportunity";

export interface FarmerProfile {
  id: string;
  handle: string;
  fullName: string;
  initials: string;
  participantType: ParticipantType;
  roleLabel: string;
  district: string;
  state: string;
  crops: string[];
  bio: string;
  verified: boolean;
  followers: number;
  following: number;
  experienceYears?: number;
  joinedLabel: string;
  isFollowing?: boolean;
}

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
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdLabel: string;
}

export interface Conversation {
  id: string;
  otherProfileId: string;
  lastMessage: string;
  updatedLabel: string;
  unread: number;
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
  targetType: "profile" | "post" | "comment" | "message";
  targetId: string;
  targetLabel: string;
  reason: "misinformation" | "harassment" | "spam" | "unsafe" | "other";
  details: string;
  createdLabel: string;
  status: "pending" | "dismissed" | "actioned";
}
