import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import Spinner from "../components/Spinner";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import PaymentModal from "../components/PaymentModal";
import { Subscription, PaymentSettings } from "../types";
import { format } from "date-fns";

interface SubscriptionCardProps {
  plan: Subscription;
  isFeatured: boolean;
  onChoosePlan: (plan: Subscription) => void;
  isSubscribing: boolean;
  isCurrentPlan: boolean;
  isDisabled: boolean;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  plan,
  isFeatured,
  onChoosePlan,
  isSubscribing,
  isCurrentPlan,
  isDisabled,
}) => {
  const cardClasses = `relative border rounded-2xl p-6 text-center flex flex-col transition-all duration-300 ${
    isDisabled ? "opacity-60" : "transform hover:-translate-y-2"
  } ${
    isFeatured
      ? "bg-primary text-white border-primary shadow-soft-lg"
      : "bg-card text-text-body border-slate-200/80 shadow-soft"
  }`;

  return (
    <div className={cardClasses}>
      {isCurrentPlan && (
        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          YOUR PLAN
        </div>
      )}
      {isFeatured && !isCurrentPlan && (
        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full">
          POPULAR
        </div>
      )}

      <div
        className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
          isFeatured ? "bg-white/10" : "bg-primary/10"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-12 w-12 ${isFeatured ? "text-white" : "text-primary"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
      <h3
        className={`text-2xl font-bold ${
          isFeatured ? "text-white" : "text-text-heading"
        }`}
      >
        {plan.name}
      </h3>
      <p className={`mt-2 ${isFeatured ? "text-blue-200" : "text-text-muted"}`}>
        {plan.description}
      </p>
      <div className="my-8">
        <span className="text-5xl font-extrabold">{`₹${plan.price}`}</span>
        <span
          className={`font-semibold ${
            isFeatured ? "text-blue-200" : "text-text-muted"
          }`}
        >
          /60 days
        </span>
      </div>
      <ul className="space-y-3 text-left mb-8 flex-grow">
        {plan.name.toUpperCase() === "PRO" && (
          <li className="flex items-center gap-3">
            <svg
              className={`flex-shrink-0 w-5 h-5 ${
                isFeatured ? "text-yellow-400" : "text-yellow-500"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              ></path>
            </svg>
            <span>Golden Verified Badge</span>
          </li>
        )}
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <svg
              className={`flex-shrink-0 w-5 h-5 ${
                isFeatured ? "text-secondary" : "text-primary"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              ></path>
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <div
          className={`w-full py-3 rounded-lg font-semibold ${
            isFeatured
              ? "bg-white/20 text-white"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          Active
        </div>
      ) : (
        <button
          onClick={() => onChoosePlan(plan)}
          disabled={isSubscribing || isDisabled}
          className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center min-h-[48px] disabled:cursor-not-allowed ${
            isFeatured
              ? "bg-white text-primary hover:bg-blue-50"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          }`}
        >
          {isSubscribing ? <Spinner size="sm" /> : "Choose Plan"}
        </button>
      )}
    </div>
  );
};

const SubscriptionPage: React.FC = () => {
  const { user, refetchProfile, subscription, profile } = useAuth();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentSettings, setPaymentSettings] =
    useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [subscribingId, setSubscribingId] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Subscription | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      setLoading(true);

      const audience =
        profile.enrollment_status === "parent" ? "parent" : "student";

      const subsPromise = supabase
        .from("subscriptions")
        .select("*")
        .eq("target_audience", audience)
        .order("price", { ascending: true });

      const settingsPromise = supabase
        .from("payment_settings")
        .select("*")
        .eq("id", 1)
        .single();

      const [
        { data: subsData, error: subsError },
        { data: settingsData, error: settingsError },
      ] = await Promise.all([subsPromise, settingsPromise]);

      if (subsError) setPaymentError(subsError.message);
      else setSubscriptions(subsData || []);

      if (settingsError)
        console.warn("Could not load payment settings, using fallback.");
      else setPaymentSettings(settingsData);

      setLoading(false);
    };

    fetchData();
  }, [profile]);

  const handleChoosePlan = (plan: Subscription) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setSelectedPlan(plan);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = async (planId: number, paymentId: string) => {
    if (!user) return;

    setSubscribingId(planId);
    setPaymentError(null);
    setPaymentSuccess(null);
    setIsPaymentModalOpen(false); // Close modal immediately

    try {
      const { error: rpcError } = await supabase.rpc("subscribe_to_plan", {
        p_subscription_id: planId,
        p_payment_id: paymentId,
      });

      if (rpcError) throw rpcError;

      await refetchProfile();
      setPaymentSuccess(
        "Your subscription request has been submitted and is now under review. You will be notified upon approval."
      );
    } catch (err: any) {
      setPaymentError(
        "An error occurred during submission. Please check your transaction details or try again."
      );
      console.error(err);
    } finally {
      setSubscribingId(null);
    }
  };

  const isPlanPending = subscription?.status === "pending_review";

  return (
    <>
      <div className="animate-fade-in-up">
        {paymentSuccess && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-r-lg shadow-soft mb-8 flex justify-between items-center animate-fade-in-up">
            <div>
              <p className="font-bold">Success!</p>
              <p>{paymentSuccess}</p>
            </div>
            <button
              onClick={() => setPaymentSuccess(null)}
              className="p-1 rounded-full hover:bg-green-200 font-bold text-lg"
            >
              &times;
            </button>
          </div>
        )}
        {paymentError && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg shadow-soft mb-8 flex justify-between items-center animate-fade-in-up">
            <div>
              <p className="font-bold">Payment Error</p>
              <p>{paymentError}</p>
            </div>
            <button
              onClick={() => setPaymentError(null)}
              className="p-1 rounded-full hover:bg-red-200 font-bold text-lg"
            >
              &times;
            </button>
          </div>
        )}
        {subscription?.status === "active" && !paymentSuccess && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-r-lg shadow-soft mb-8 text-center">
            <p className="font-bold">
              You are currently on the {subscription.subscriptions.name} plan.
            </p>
            <p>
              Your access is valid until{" "}
              {format(new Date(subscription.end_date), "PPpp")}.
            </p>
          </div>
        )}
        {isPlanPending && !paymentSuccess && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-lg shadow-soft mb-8 text-center">
            <p className="font-bold">
              Your subscription for the {subscription.subscriptions.name} plan
              is currently under review.
            </p>
            <p>
              You will be notified once it has been approved by an
              administrator.
            </p>
          </div>
        )}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-text-heading">
            Choose Your Plan
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-text-body">
            Unlock exclusive PRO features like the Study Hub. Collaborate on
            assignments, share materials, and join private study groups. PRO
            users get a Golden Verified Badge to stand out!
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Spinner size="lg" />
          </div>
        ) : subscriptions.length === 0 ? (
          <p className="text-center text-text-muted bg-card p-10 rounded-2xl">
            Subscription plans are not available at the moment. Please check
            back later.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">
            {subscriptions.map((plan, index) => (
              <SubscriptionCard
                key={plan.id}
                plan={plan}
                isFeatured={
                  subscriptions.length > 2
                    ? index === 1
                    : index === subscriptions.length - 1
                }
                onChoosePlan={handleChoosePlan}
                isSubscribing={false}
                isCurrentPlan={
                  subscription?.subscription_id === plan.id &&
                  subscription.status === "active"
                }
                isDisabled={isPlanPending}
              />
            ))}
          </div>
        )}
      </div>
      <PaymentModal
        isOpen={isPaymentModalOpen}
        plan={selectedPlan}
        settings={paymentSettings}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirm={handlePaymentSuccess}
        isConfirming={!!subscribingId}
      />
    </>
  );
};

export default SubscriptionPage;
