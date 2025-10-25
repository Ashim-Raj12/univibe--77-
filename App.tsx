import React, { Suspense, lazy } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PresenceProvider } from "./contexts/PresenceContext";
import { SiteSettingsProvider } from "./contexts/SiteSettingsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Spinner from "./components/Spinner";

// Lazy load all page components for code splitting
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const UpdatePasswordPage = lazy(() => import("./pages/UpdatePasswordPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const CommonRoomPage = lazy(() => import("./pages/CommonRoomPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage")); // New Page
const ParentProfilePage = lazy(() => import("./pages/ParentProfilePage"));
const DirectoryPage = lazy(() => import("./pages/DirectoryPage"));
const SuggestionsPage = lazy(() => import("./pages/SuggestionsPage"));
const FriendsListPage = lazy(() => import("./pages/FriendsListPage"));
const ChatListPage = lazy(() => import("./pages/ChatListPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const PostPage = lazy(() => import("./pages/PostPage"));
const CommunityListPage = lazy(() => import("./pages/CommunityListPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const EventsListPage = lazy(() => import("./pages/EventsListPage"));
const EventPage = lazy(() => import("./pages/EventPage"));
const CollegeHubPage = lazy(() => import("./pages/CollegeHubPage"));
const UniversityDetailsPage = lazy(
  () => import("./pages/UniversityDetailsPage")
); // New Page
const StudyHubPage = lazy(() => import("./pages/StudyHubPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const AdvertisersPage = lazy(() => import("./pages/AdvertisersPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const GroupChatPage = lazy(() => import("./pages/GroupChatPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const LiveAcademyPage = lazy(() => import("./pages/LiveAcademyPage"));
const CampusTourPage = lazy(() => import("./pages/CampusTourPage")); // New Page
const DownloadAppPage = lazy(() => import("./pages/DownloadAppPage")); // New Page
const DoubtSessionPage = lazy(() => import("./pages/DoubtSessionPage")); // New Page
const RoommateFinderPage = lazy(() => import("./pages/RoommateFinderPage"));

// VibeCollab Pages
const VibeCollabPage = lazy(() => import("./pages/VibeCollabPage"));
const CollabPostDetailPage = lazy(() => import("./pages/CollabPostDetailPage"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const AddCoinsPage = lazy(() => import("./pages/AddCoinsPage"));
const SendCoinsPage = lazy(() => import("./pages/SendCoinsPage"));

// New pages for mobile modals
const CreatePostPage = lazy(() => import("./pages/CreatePostPage"));
const CreateEventPage = lazy(() => import("./pages/CreateEventPage.tsx"));
const CreateStudyGroupPage = lazy(
  () => import("./pages/CreateStudyGroupPage.tsx")
);
const CreateCollabPage = lazy(() => import("./pages/CreateCollabPage.tsx"));
const CommunityMembersPage = lazy(
  () => import("./pages/CommunityMembersPage.tsx")
);
const VerificationPage = lazy(() => import("./pages/VerificationPage.tsx"));
const ParentVerificationPage = lazy(
  () => import("./pages/ParentVerificationPage.tsx")
);

// Admin Pages
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminDashboardPage = lazy(
  () => import("./pages/admin/AdminDashboardPage")
);
const AdminVerificationPage = lazy(
  () => import("./pages/admin/AdminVerificationPage")
);
const AdminUserManagementPage = lazy(
  () => import("./pages/admin/AdminUserManagementPage")
);
const AdminCommunityManagementPage = lazy(
  () => import("./pages/admin/AdminCommunityManagementPage")
);
const AdminPostManagementPage = lazy(
  () => import("./pages/admin/AdminPostManagementPage")
);
const AdminCollegeManagementPage = lazy(
  () => import("./pages/admin/AdminCollegeManagementPage")
);
const AdminTeamManagementPage = lazy(
  () => import("./pages/admin/AdminTeamManagementPage")
);
const AdminFeedbackPage = lazy(() => import("./pages/admin/AdminFeedbackPage"));
const AdminReportsPage = lazy(() => import("./pages/admin/AdminReportsPage"));
const AdminSubscriptionsPage = lazy(
  () => import("./pages/admin/AdminSubscriptionsPage")
);
const AdminPaymentSettingsPage = lazy(
  () => import("./pages/admin/AdminPaymentSettingsPage")
);
const AdminSubscriptionReviewPage = lazy(
  () => import("./pages/admin/AdminSubscriptionReviewPage")
);
const AdminParentVerificationPage = lazy(
  () => import("./pages/admin/AdminParentVerificationPage")
);
const AdminTourApplicationsPage = lazy(
  () => import("./pages/admin/AdminTourApplicationsPage")
); // New Admin Page
const AdminAppManagementPage = lazy(
  () => import("./pages/admin/AdminAppManagementPage")
); // New Admin Page
const VibeCollabModerationPage = lazy(
  () => import("./pages/admin/VibeCollabModerationPage")
);
const AdminVoucherManagementPage = lazy(
  () => import("./pages/admin/AdminVoucherManagementPage")
);
const AdminVoucherRequestsPage = lazy(
  () => import("./pages/admin/AdminVoucherRequestsPage")
); // New Admin Page
const AdminModeratorManagementPage = lazy(
  () => import("./pages/admin/AdminModeratorManagementPage")
); // New Admin Page
const AdminEventRequestsPage = lazy(
  () => import("./pages/admin/AdminEventRequestsPage")
); // New Admin Page
const AdminTermsPage = lazy(() => import("./pages/admin/AdminTermsPage"));
const AdminSiteSettingsPage = lazy(
  () => import("./pages/admin/AdminSiteSettingsPage")
);

function App() {
  const suspenseFallback = (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Spinner size="lg" />
    </div>
  );

  return (
    <Router>
      <SiteSettingsProvider>
        <AuthProvider>
          <PresenceProvider>
            <Suspense fallback={suspenseFallback}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                  path="/forgot-password"
                  element={<ForgotPasswordPage />}
                />
                <Route
                  path="/update-password"
                  element={<UpdatePasswordPage />}
                />

                <Route element={<ProtectedRoute />}>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/common-room" element={<CommonRoomPage />} />
                  <Route path="/profile/:id" element={<ProfilePage />} />
                  <Route path="/edit-profile" element={<EditProfilePage />} />
                  <Route
                    path="/edit-parent-profile"
                    element={<ParentProfilePage />}
                  />
                  <Route path="/find-fellows" element={<DirectoryPage />} />
                  <Route path="/suggestions" element={<SuggestionsPage />} />
                  <Route path="/friends" element={<FriendsListPage />} />
                  <Route path="/chat" element={<ChatListPage />} />
                  <Route path="/chat/:recipientId" element={<ChatPage />} />
                  <Route path="/post/:id" element={<PostPage />} />
                  <Route path="/communities" element={<CommunityListPage />} />
                  <Route path="/community/:id" element={<CommunityPage />} />
                  <Route path="/global-events" element={<EventsListPage />} />
                  <Route path="/event/:id" element={<EventPage />} />
                  <Route path="/college-hub" element={<CollegeHubPage />} />
                  <Route
                    path="/university/:name"
                    element={<UniversityDetailsPage />}
                  />
                  <Route path="/study-hub" element={<StudyHubPage />} />
                  <Route path="/group/:id" element={<GroupChatPage />} />
                  <Route
                    path="/doubt-session/:id"
                    element={<DoubtSessionPage />}
                  />

                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/advertisers" element={<AdvertisersPage />} />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/subscriptions" element={<SubscriptionPage />} />
                  <Route path="/live-academy" element={<LiveAcademyPage />} />
                  <Route path="/campus-tour" element={<CampusTourPage />} />
                  <Route path="/download-app" element={<DownloadAppPage />} />
                  <Route path="/vibecollab" element={<VibeCollabPage />} />
                  <Route
                    path="/vibecollab/:id"
                    element={<CollabPostDetailPage />}
                  />
                  <Route path="/wallet" element={<WalletPage />} />
                  <Route path="/add-coins" element={<AddCoinsPage />} />
                  <Route path="/send-coins" element={<SendCoinsPage />} />

                  {/* Mobile Modal Pages */}
                  <Route path="/create-post" element={<CreatePostPage />} />
                  <Route path="/create-event" element={<CreateEventPage />} />
                  <Route
                    path="/create-study-group"
                    element={<CreateStudyGroupPage />}
                  />
                  <Route path="/create-collab" element={<CreateCollabPage />} />
                  <Route
                    path="/community/:id/members"
                    element={<CommunityMembersPage />}
                  />
                  <Route
                    path="/verify-student"
                    element={<VerificationPage />}
                  />
                  <Route
                    path="/verify-parent"
                    element={<ParentVerificationPage />}
                  />

                  <Route path="/admin" element={<AdminLayout />}>
                    <Route
                      index
                      element={<Navigate to="dashboard" replace />}
                    />
                    <Route path="dashboard" element={<AdminDashboardPage />} />
                    <Route
                      path="verification"
                      element={<AdminVerificationPage />}
                    />
                    <Route
                      path="parent-verification"
                      element={<AdminParentVerificationPage />}
                    />
                    <Route
                      path="tour-applications"
                      element={<AdminTourApplicationsPage />}
                    />
                    <Route path="users" element={<AdminUserManagementPage />} />
                    <Route
                      path="communities"
                      element={<AdminCommunityManagementPage />}
                    />
                    <Route path="posts" element={<AdminPostManagementPage />} />
                    <Route
                      path="vibecollab-moderation"
                      element={<VibeCollabModerationPage />}
                    />
                    <Route
                      path="vouchers"
                      element={<AdminVoucherManagementPage />}
                    />
                    <Route
                      path="voucher-requests"
                      element={<AdminVoucherRequestsPage />}
                    />
                    <Route
                      path="colleges"
                      element={<AdminCollegeManagementPage />}
                    />
                    <Route
                      path="moderators"
                      element={<AdminModeratorManagementPage />}
                    />
                    <Route path="events" element={<AdminEventRequestsPage />} />
                    <Route path="team" element={<AdminTeamManagementPage />} />
                    <Route path="feedback" element={<AdminFeedbackPage />} />
                    <Route path="reports" element={<AdminReportsPage />} />
                    <Route
                      path="subscriptions"
                      element={<AdminSubscriptionsPage />}
                    />
                    <Route
                      path="payment-settings"
                      element={<AdminPaymentSettingsPage />}
                    />
                    <Route
                      path="subscription-review"
                      element={<AdminSubscriptionReviewPage />}
                    />
                    <Route
                      path="app-management"
                      element={<AdminAppManagementPage />}
                    />
                    <Route path="terms" element={<AdminTermsPage />} />
                    <Route
                      path="site-settings"
                      element={<AdminSiteSettingsPage />}
                    />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </PresenceProvider>
        </AuthProvider>
      </SiteSettingsProvider>
    </Router>
  );
}

export default App;
