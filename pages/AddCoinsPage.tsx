import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { PaymentSettings } from "../types";
import Spinner from "../components/Spinner";
import { toast } from "../components/Toast";

const AddCoinsPage: React.FC = () => {
  const { profile, refetchWallet } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState(""); // New state for custom coins

  useEffect(() => {
    const fetchSettings = async () => {
      setSettingsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (data) {
        setSettings(data);
      } else {
        console.error("Could not load payment settings:", fetchError);
        setError("Payment gateway is not configured by the admin.");
      }
      setSettingsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only non-negative integers
    if (/^\d*$/.test(value)) {
      setCustomAmount(value);
    }
  };

  const customPrice = customAmount ? parseFloat(customAmount) / 10 : 0;

  const handlePayment = (amount: number, coins: number) => {
    setLoading(true);

    const razorpayKey = settings?.razorpay_key_id;
    if (!razorpayKey || !settings?.is_razorpay_enabled) {
      toast.error("Payments are currently disabled. Please contact support.");
      setLoading(false);
      return;
    }

    const options = {
      key: razorpayKey,
      amount: amount * 100, // Amount in paise
      currency: "INR",
      name: "UniVibe - VibeCoins",
      description: `Top-up ${coins} VibeCoins`,
      handler: async (response: any) => {
        try {
          const { error } = await supabase.rpc("confirm_payment_and_top_up", {
            p_amount: coins,
            p_payment_id: response.razorpay_payment_id,
            p_metadata: { provider: "razorpay" },
          });
          if (error) throw error;
          toast.success(`${coins} VibeCoins added successfully!`);
          await refetchWallet();
          navigate("/wallet");
        } catch (err: any) {
          toast.error(`Payment confirmation failed: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      prefill: { name: profile?.name, email: profile?.email },
      theme: { color: "#1767DA" },
      modal: {
        ondismiss: () => setLoading(false),
      },
    };

    if (!(window as any).Razorpay) {
      toast.error(
        "Payment gateway could not be loaded. Please check your connection and try again."
      );
      setLoading(false);
      return;
    }

    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", function (response: any) {
      toast.error(`Oops! Something went wrong.\nPayment Failed`);
      console.error("Razorpay payment failed:", response.error);
      setLoading(false);
    });
    rzp.open();
  };

  const packages = [
    { coins: 500, price: 50 },
    { coins: 1200, price: 100 },
    { coins: 3000, price: 250 },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold">Add VibeCoins</h1>
        <p className="text-text-muted mt-1">
          Top up your wallet to unlock more features and collaborations.
        </p>
      </div>

      {settingsLoading ? (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg shadow-soft">
          <p className="font-bold">Payment Unavailable</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="bg-card p-6 rounded-2xl shadow-soft border border-border">
          <div className="space-y-6">
            <div className="space-y-3">
              {packages.map((p) => (
                <button
                  key={p.coins}
                  onClick={() => handlePayment(p.price, p.coins)}
                  disabled={loading}
                  className="w-full flex justify-between items-center p-4 rounded-lg border hover:bg-dark-card transition-colors disabled:opacity-50"
                >
                  <div className="text-left">
                    <span className="font-bold text-lg">
                      {p.coins.toLocaleString()} VibeCoins
                    </span>
                    {p.coins / 10 > p.price && (
                      <span className="text-xs font-semibold text-green-600 block">
                        Save ₹{(p.coins / 10 - p.price).toFixed(2)}!
                      </span>
                    )}
                  </div>
                  <span className="bg-primary text-white font-semibold px-4 py-2 rounded-lg">
                    ₹{p.price}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative text-center my-4">
              <hr className="border-border" />
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 text-sm text-text-muted">
                OR
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-2 text-center">
                Buy a custom amount
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Enter VibeCoins"
                  className="w-full p-3 border rounded-lg bg-dark-card border-border focus:ring-primary focus:border-primary text-center font-bold text-lg"
                />
                <button
                  onClick={() =>
                    handlePayment(customPrice, parseFloat(customAmount))
                  }
                  disabled={
                    loading || !/^\d+$/.test(customAmount) || customPrice < 50
                  }
                  className="bg-primary text-white font-semibold px-4 py-3 rounded-lg disabled:opacity-50 whitespace-nowrap"
                >
                  Buy for ₹{customPrice.toFixed(2)}
                </button>
              </div>
              <p className="text-xs text-text-muted mt-2 text-center">
                10 VibeCoins = ₹1. Minimum custom purchase is ₹50 (500 coins).
              </p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-background rounded-2xl p-6 text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-text-heading font-semibold">
              Processing Payment...
            </p>
            <p className="text-sm text-text-muted">
              Please do not close this window.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddCoinsPage;
