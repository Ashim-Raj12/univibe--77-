export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = any;

export interface Profile {
  id: string;
  created_at: string;
  name: string | null;
  username: string | null;
  email?: string | null;
  avatar_url: string | null;
  college: string | null;
  home_town: string | null;
  state: string | null;
  bio: string | null;
  course: string | null;
  joining_year: number | null;
  hobbies_interests: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  enrollment_status:
    | "current_student"
    | "incoming_student"
    | "passed_out"
    | "parent"
    | "exploring"
    | "faculty"
    | null;
  gender: "male" | "female" | null;
  is_verified: boolean;
  has_pro_badge: boolean;
  is_tour_guide: boolean; // New field
  is_advertiser: boolean;
  last_seen?: string;
  is_banned: boolean;
  profile_remark: string | null;
  badge_color: string | null;
}

export interface Post {
  id: number;
  created_at: string;
  content: string;
  image_url: string | null;
  user_id: string;
  community_id: number | null;
  location: string | null;
}

export interface Like {
  id: number;
  created_at: string;
  post_id: number;
  user_id: string;
}

export interface Comment {
  id: number;
  created_at: string;
  post_id: number;
  user_id: string;
  content: string | null;
}

export interface PostWithProfile extends Post {
  profiles: Profile;
  likes: Like[];
  comments: [{ count: number }];
}

export interface CommentWithProfile extends Comment {
  profiles: Profile;
}

export interface ReplyInfo {
  id: number;
  content: string;
  senderId: string;
  senderName: string;
}

export interface Notification {
  id: number;
  user_id: string;
  actor_id: string;
  type:
    | "new_follower"
    | "new_comment"
    | "new_like"
    | "new_message"
    | "verification_approved"
    | "verification_rejected"
    | "new_group_invite"
    | "subscription_approved"
    | "subscription_rejected"
    | "subscription_pending"
    | "parent_verification_approved"
    | "parent_verification_rejected"
    | "report_resolved"
    | "voucher_request_completed"
    | "voucher_request_rejected"
    | "collab_application_received"
    | "collab_application_accepted"
    | "collab_application_declined";
  entity_id: string | number | null;
  is_read: boolean;
  created_at: string;
  metadata: Json | null;
}

export interface NotificationWithActor extends Notification {
  actor: Profile;
}

export interface Message {
  id: number;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  is_seen: boolean;
  file_url: string | null;
  file_type: string | null;
}

export interface Conversation {
  profile: Profile;
  last_message: Message;
}

export interface Follow {
  created_at: string;
  follower_id: string;
  following_id: string;
}

export interface VerificationSubmission {
  id: number;
  created_at: string;
  user_id: string;
  id_card_url: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
}

export interface VerificationSubmissionWithProfile
  extends VerificationSubmission {
  profiles: Profile;
  reviewer?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ParentVerificationSubmission {
  id: number;
  created_at: string;
  user_id: string;
  id_card_url: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
}

export interface ParentVerificationSubmissionWithProfile
  extends ParentVerificationSubmission {
  profiles: Profile;
  reviewer?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface Community {
  id: number;
  created_at: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  creator_id: string;
  college: string;
  is_verified: boolean;
}

export interface CommunityWithMemberCount extends Community {
  community_member_counts: [{ count: number }];
}

export interface CommunityWithCreator extends Community {
  profiles: Profile; // creator profile
}

export interface CommunityMember {
  id: number;
  created_at: string;
  community_id: number;
  user_id: string;
  can_post: boolean;
}

export interface CommunityMemberWithProfile extends CommunityMember {
  profiles: Profile;
}

export interface College {
  id: number;
  created_at: string;
  name: string;
  accepted_domain: string | null;
}

// FIX: Add missing 'CollegeModerator' and 'CollegeModeratorWithProfile' types.
export interface CollegeModerator {
  id: number;
  created_at: string;
  user_id: string;
  college_name: string;
}

export interface CollegeModeratorWithProfile extends CollegeModerator {
  profiles: Profile | null;
}

export interface Event {
  id: number;
  created_at: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  event_date: string;
  location: string;
  creator_id: string;
  college: string | null;
  rsvp_limit: number | null;
  status: "pending_approval" | "approved" | "rejected";
  requirements: string | null; // For global event requests
  budget: number | null; // For global event requests
}

export interface EventAttendee {
  user_id: string;
  profiles: Profile;
}

export interface EventWithCreatorAndAttendees extends Event {
  profiles: Profile; // creator
  event_attendees: EventAttendee[];
}

export interface CommunityFile {
  id: number;
  created_at: string;
  community_id: number;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  description: string | null;
}

export interface CommunityFileWithUploader extends CommunityFile {
  profiles: Profile; // uploader
}

export interface StudyMaterial {
  id: number;
  created_at: string;
  user_id: string;
  college_name: string;
  title: string;
  description: string | null;
  is_request: boolean;
  status: "open" | "fulfilled";
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
}

export interface StudyMaterialWithUploader extends StudyMaterial {
  profiles: Profile; // uploader/requester
  material_request_responses?: MaterialRequestResponse[];
}

export interface Complaint {
  id: number;
  created_at: string;
  user_id: string;
  college: string;
  category: "Academics" | "Hostel" | "Campus Facilities" | "Faculty" | "Other";
  title: string;
  description: string;
  status: "submitted" | "in_review" | "resolved";
}

export interface ComplaintWithUser extends Complaint {
  profiles: Profile;
}

export interface CollegeGroupMessage {
  id: number;
  created_at: string;
  user_id: string;
  college: string;
  content: string;
  file_url: string | null;
  file_type: string | null;
}

export interface CollegeGroupMessageWithProfile extends CollegeGroupMessage {
  profiles: Profile;
}

export interface Report {
  id: number;
  created_at: string;
  reporter_id: string;
  entity_type: "profile" | "post" | "comment" | "message";
  entity_id: string;
  reason: string;
  status: "pending" | "resolved";
  admin_reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
}

export interface ReportWithReporter extends Report {
  profiles: Profile; // reporter
  admin_replier?: { name: string | null } | null;
}

export interface TeamMember {
  id: number;
  created_at: string;
  name: string;
  role: string;
  bio: string;
  avatar_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
}

export interface Feedback {
  id: number;
  created_at: string;
  user_id: string;
  category: "Bug Report" | "Feature Request" | "General Feedback" | "Other";
  title: string;
  description: string;
  status: "submitted" | "in_review" | "resolved";
  admin_reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
}

export interface FeedbackWithUser extends Feedback {
  profiles: Profile;
}

export interface StudyGroup {
  id: number;
  created_at: string;
  name: string;
  description: string | null;
  college: string;
  creator_id: string;
  type: "public" | "private";
  avatar_url: string | null;
}

export interface StudyGroupWithMemberCount extends StudyGroup {
  study_group_members: [{ count: number }];
}

export interface StudyGroupMessage {
  id: number;
  created_at: string;
  group_id: number;
  user_id: string;
  content: string | null;
  file_url: string | null;
  file_type: string | null;
}

export interface StudyGroupMessageWithProfile extends StudyGroupMessage {
  profiles: Profile;
}

export interface StudyGroupInvite {
  id: number;
  created_at: string;
  group_id: number;
  inviter_id: string;
  invitee_id: string;
  status: "pending" | "accepted" | "declined";
}

export interface StudyGroupInviteWithDetails extends StudyGroupInvite {
  study_groups: StudyGroup;
  profiles: Profile; // inviter profile
}

export interface Subscription {
  id: number;
  name: string;
  description: string;
  price: number;
  features: string[];
  target_audience: "student" | "parent" | "faculty";
}

export interface UserSubscription {
  id: number;
  user_id: string;
  subscription_id: number;
  status: "active" | "expired" | "cancelled" | "pending_review";
  start_date: string;
  end_date: string;
  created_at: string;
  payment_transaction_id?: string | null;
}

export interface UserSubscriptionWithPlan extends UserSubscription {
  subscriptions: Subscription;
}

export interface PaymentSettings {
  id: number;
  upi_id: string | null;
  upi_qr_code_url: string | null;
  razorpay_key_id: string | null;
  is_razorpay_enabled: boolean;
  is_upi_enabled: boolean;
  website_logo_url?: string | null;
  vibecoin_logo_url?: string | null;
  updated_at?: string;
}

// New Types for Campus Tour Feature
export interface TourGuideApplication {
  id: number;
  user_id: string;
  intro_video_url: string;
  campus_details: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
}

export interface TourGuideApplicationWithProfile extends TourGuideApplication {
  profiles: Profile;
  reviewer?: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CampusTour {
  id: number;
  parent_id: string;
  guide_id: string;
  status: "requested" | "accepted" | "completed" | "cancelled" | "declined";
  created_at: string;
  tour_date: string | null;
}

export interface TourReview {
  id: number;
  tour_id: number;
  parent_id: string;
  guide_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface TourReviewWithParent extends TourReview {
  profiles: Profile; // parent's profile
}

export interface AppFile {
  id: number;
  created_at: string;
  platform: "android" | "ios";
  file_url: string;
  version: string;
}

// New Types for Doubt Forum
export interface DoubtPost {
  id: number;
  created_at: string;
  user_id: string;
  college: string;
  topic: string;
  description: string;
  status: "open" | "resolved";
}

export interface DoubtPostWithProfile extends DoubtPost {
  profiles: Profile;
}

export interface DoubtSession {
  id: number;
  created_at: string;
  doubt_post_id: number;
  requester_id: string;
  helper_id: string;
  status: "pending" | "accepted" | "declined";
}

export interface DoubtSessionWithMessageCount extends DoubtSession {
  doubt_session_messages: [{ count: number }];
}

export interface DoubtSessionWithHelpers extends DoubtPostWithProfile {
  doubt_sessions: (DoubtSession & { profiles: Profile })[];
}

export interface DoubtSessionMessage {
  id: number;
  created_at: string;
  session_id: number;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_type: string | null;
}

// New Types for Material Exchange
export interface MaterialRequestResponse {
  id: number;
  created_at: string;
  request_id: number;
  responder_id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  message: string | null;
  profiles: Profile; // responder profile
}

// --- VIBECOLLAB & WALLET SYSTEM ---

export interface VibeCoinWallet {
  user_id: string;
  balance: number;
  pending_balance: number; // For escrow
  total_earned: number;
  total_spent: number;
  updated_at: string;
  is_frozen: boolean;
}

export type TransactionType =
  | "top_up"
  | "task_payment"
  | "task_reward"
  | "p2p_transfer"
  | "refund"
  | "admin_adjustment"
  | "redeem_voucher"
  | "referral_bonus"
  | "voucher_withdrawal";
export type TransactionStatus = "completed" | "pending" | "failed";

export interface VibeCoinTransaction {
  id: number;
  from_user_id: string | null;
  to_user_id: string | null;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  related_entity_id: number | null; // e.g., collab_post_id
  metadata: Json | null;
  created_at: string;
  from_profile?: Profile;
  to_profile?: Profile;
}

export type CollabTaskType =
  | "collaboration"
  | "tutoring"
  | "notes"
  | "project_help";
export type CollabStatusType =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export interface CollabPost {
  id: number;
  poster_id: string;
  helper_id: string | null;
  title: string;
  subject: string | null;
  description: string;
  task_type: CollabTaskType;
  deadline: string | null;
  reward_coins: number;
  status: CollabStatusType;
  created_at: string;
  is_flagged: boolean;
  file_url: string | null;
  agreed_to_academic_policy: boolean;
}

export interface CollabPostWithProfiles extends CollabPost {
  poster: Profile;
  helper: Profile | null;
}

export interface CollabMessage {
  id: number;
  post_id: number;
  sender_id: string;
  content: string;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
}

export interface CollabMessageWithSender extends CollabMessage {
  sender: Profile;
}

export interface CollabDeliverable {
  id: number;
  post_id: number;
  uploader_id: string;
  file_url: string;
  file_name: string;
  notes: string | null;
  created_at: string;
}

export interface CollabDeliverableWithUploader extends CollabDeliverable {
  uploader: Profile;
}

export interface CollabFlag {
  id: number;
  post_id: number;
  flagger_id: string;
  reason: string;
  status: "pending" | "reviewed";
  created_at: string;
}

export interface FlaggedCollabPost extends CollabPostWithProfiles {
  collab_flags: CollabFlag[];
}
// FIX: Add missing types for Assignment Marketplace feature.
// --- ASSIGNMENT MARKETPLACE ---

export interface Assignment {
  id: number;
  created_at: string;
  title: string;
  description: string;
  price: number;
  due_date: string | null;
  poster_id: string;
  assignee_id: string | null;
  college: string;
  status: "open" | "in_progress" | "submitted" | "completed" | "cancelled";
  file_url: string | null;
  file_name: string | null;
  submitted_file_url: string | null;
  submitted_file_name: string | null;
  submitted_at: string | null;
}

export interface AssignmentWithPoster extends Assignment {
  poster: Profile;
  assignee: Profile | null;
}

export interface AssignmentCollaboration {
  id: number;
  created_at: string;
  assignment_id: number;
  applicant_id: string;
}

export interface AssignmentCollaborationWithApplicant
  extends AssignmentCollaboration {
  profiles: Profile;
}

export interface AssignmentMessage {
  id: number;
  created_at: string;
  collaboration_id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
}

// FIX: Add missing RoommatePreference type.
// --- ROOMMATE FINDER ---
export interface RoommatePreference {
  id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  smoking_habits: "never" | "occasionally" | "frequently" | null;
  sleep_schedule: "early_bird" | "night_owl" | "flexible" | null;
  cleanliness: "very_tidy" | "moderately_clean" | "relaxed" | null;
  social_habits: "prefers_quiet" | "likes_hosting" | "mix_of_both" | null;
  guests_policy: "rarely_over" | "sometimes_over" | "often_over" | null;
}

// New type for Voucher Management
export interface Voucher {
  id: number;
  created_at: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  coins_cost: number;
  value_inr: number | null;
  is_active: boolean;
  stock: number | null;
}

// New types for Voucher Withdrawal
export interface VoucherWithdrawalRequest {
  id: number;
  created_at: string;
  user_id: string;
  voucher_id: number;
  coins_spent: number;
  status: "pending" | "completed" | "rejected";
  admin_notes: string | null;
  fulfillment_details: string | null;
  completed_at: string | null;
  admin_id: string | null;
}

export interface VoucherWithdrawalRequestWithDetails
  extends VoucherWithdrawalRequest {
  profiles: Profile; // user profile
  vouchers: Voucher; // voucher details
  admin?: { name: string | null } | null; // admin profile
}

// New types for Collab Applications
export interface CollabApplication {
  id: number;
  post_id: number;
  applicant_id: string;
  status: "pending" | "accepted" | "declined";
  applied_at: string;
  responded_at: string | null;
}

export interface CollabApplicationWithApplicant extends CollabApplication {
  applicant: Profile;
}
