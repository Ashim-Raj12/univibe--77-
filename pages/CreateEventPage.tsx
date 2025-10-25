import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import Spinner from "../components/Spinner";
import { toast } from "../components/Toast";

const CreateEventPage: React.FC = () => {
  const { user, profile, subscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [rsvpLimit, setRsvpLimit] = useState("");
  const [requirements, setRequirements] = useState("");
  const [budget, setBudget] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const hasProAccess =
    subscription?.status === "active" &&
    subscription.subscriptions.name?.toUpperCase() === "PRO";

  // Determine event type from URL params
  const type = searchParams.get("type"); // 'college' or null for global
  const moderator = searchParams.get("moderator") === "true";
  const isCollegeEvent = type === "college";
  const isModerator = moderator;
  const isGlobalRequest = !isCollegeEvent;

  useEffect(() => {
    if (!profile?.is_verified) {
      navigate("/home");
      return;
    }

    if (isGlobalRequest && !hasProAccess) {
      navigate("/subscriptions");
      return;
    }
  }, [profile, isGlobalRequest, hasProAccess, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !name.trim() || !eventDate || !eventTime) {
      setError("Please fill out all required fields.");
      return;
    }

    if (isGlobalRequest && !hasProAccess) {
      setError("You need PRO access to request global events.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let bannerUrl: string | null = null;
      const combinedDateTime = new Date(
        `${eventDate}T${eventTime}`
      ).toISOString();

      if (bannerFile) {
        const filePath = `${user.id}/event_${Date.now()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("event-banners")
          .upload(filePath, bannerFile);

        if (uploadError) throw uploadError;
        if (!uploadData?.path)
          throw new Error("Banner upload failed, please try again.");

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("event-banners")
          .getPublicUrl(uploadData.path);
        bannerUrl = publicUrl;
      }

      const eventData: any = {
        name,
        description,
        banner_url: bannerUrl,
        event_date: combinedDateTime,
        location,
        creator_id: user.id,
        college: isCollegeEvent ? profile.college : null,
        rsvp_limit: rsvpLimit ? parseInt(rsvpLimit, 10) : null,
        status: isCollegeEvent && isModerator ? "approved" : "pending_approval",
      };

      if (isGlobalRequest) {
        eventData.requirements = requirements;
        eventData.budget = budget ? parseFloat(budget) : null;
      }

      const { error: insertError } = await supabase
        .from("events")
        .insert(eventData);

      if (insertError) throw insertError;

      const successMessage =
        isCollegeEvent && isModerator
          ? "Event created successfully!"
          : "Your event request has been submitted for review.";
      toast.info(successMessage);

      // Reset form
      setName("");
      setDescription("");
      setLocation("");
      setEventDate("");
      setEventTime("");
      setRsvpLimit("");
      if (isGlobalRequest) {
        setRequirements("");
        setBudget("");
      }
      setBannerFile(null);
      setPreview(null);

      // Navigate back to events
      if (isCollegeEvent) {
        navigate(`/college/${encodeURIComponent(profile.college || "")}`);
      } else {
        navigate("/events");
      }
    } catch (e: any) {
      console.error("Error creating/requesting event:", e);
      setError(
        "Failed to create/request event. Please check details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "w-full px-4 py-3 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300 disabled:bg-slate-100 disabled:cursor-not-allowed";

  const pageTitle = isCollegeEvent
    ? isModerator
      ? "Create Event"
      : "Request Event"
    : "Request a Global Event";

  const noticeMessage = isCollegeEvent
    ? isModerator
      ? "As a moderator, your event will be created and published immediately."
      : "Your event will be submitted for review by an administrator before it becomes public."
    : "Your event request will be submitted for review by an administrator before it becomes public.";

  if (!profile?.is_verified) {
    return (
      <div className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/80">
        <p>Please verify your account to create events.</p>
      </div>
    );
  }

  if (isGlobalRequest && !hasProAccess) {
    return (
      <div className="text-center text-gray-500 bg-card p-10 rounded-2xl border border-slate-200/80">
        <p>You need PRO access to request global events.</p>
        <a
          href="/subscriptions"
          className="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-focus font-semibold"
        >
          Upgrade to PRO
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <h1 className="text-3xl font-bold text-text-heading mb-6">{pageTitle}</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50 space-y-6"
      >
        <div className="p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 text-sm rounded-r-lg">
          {noticeMessage}
        </div>

        <div className="flex items-center gap-6">
          <img
            src={preview || `https://avatar.vercel.sh/${user?.id}.png?text=UV`}
            alt="Banner"
            className="w-24 h-24 rounded-full object-cover border-4 border-slate-100"
          />
          <div>
            <input
              type="file"
              ref={bannerInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
            >
              Change Banner
            </button>
            <p className="text-xs text-text-muted mt-2">
              PNG, JPG, WEBP up to 2MB.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-2">
            Event Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
            required
            placeholder="e.g., Tech Conference 2024"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClasses}
            rows={4}
            placeholder="Describe your event..."
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-body mb-2">
              Date
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={inputClasses}
              required
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-2">
              Time
            </label>
            <input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className={inputClasses}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-2">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClasses}
            required
            placeholder="e.g., Campus Library or Online"
          />
        </div>

        {isGlobalRequest && (
          <>
            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                Event Requirements
              </label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                className={inputClasses}
                rows={3}
                placeholder="e.g., Projector, seating for 50, etc."
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-2">
                Proposed Budget (₹)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={inputClasses}
                placeholder="e.g., 5000"
                min="0"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-text-body mb-2">
            RSVP Limit (Optional)
          </label>
          <input
            type="number"
            value={rsvpLimit}
            onChange={(e) => setRsvpLimit(e.target.value)}
            className={inputClasses}
            placeholder="e.g., 50"
            min="1"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="pt-4 border-t border-slate-200/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (isCollegeEvent) {
                navigate(
                  `/college/${encodeURIComponent(profile.college || "")}`
                );
              } else {
                navigate("/events");
              }
            }}
            className="px-6 py-2.5 text-sm font-semibold text-text-body bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-focus rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
          >
            {loading ? (
              <Spinner size="sm" />
            ) : isCollegeEvent && isModerator ? (
              "Create Event"
            ) : (
              "Submit for Review"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEventPage;
