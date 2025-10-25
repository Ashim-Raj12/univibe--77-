import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import { Profile } from "../types";
import Spinner from "../components/Spinner";
import { toast } from "../components/Toast";
import VerifiedBadge from "../components/VerifiedBadge";

const SendCoinsPage: React.FC = () => {
  const { user, wallet, refetchWallet } = useAuth();
  const navigate = useNavigate();
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchTerm.trim() || !user) {
      setSearchResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      const term = `%${searchTerm.trim()}%`;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`name.ilike.${term},username.ilike.${term}`)
        .neq("id", user.id)
        .limit(5);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const sendAmount = parseFloat(amount);
    if (!recipient || isNaN(sendAmount) || sendAmount <= 0) {
      setError("Invalid recipient or amount.");
      return;
    }
    if (wallet && wallet.balance < sendAmount) {
      setError("Insufficient balance.");
      return;
    }

    setLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc("transfer_p2p_coins", {
        p_to_user_id: recipient.id,
        p_amount: sendAmount,
      });
      if (rpcError) throw rpcError;

      toast.success(`Sent ${sendAmount} coins to ${recipient.name}!`);
      await refetchWallet();
      navigate("/wallet");
    } catch (err: any) {
      if (
        err.message &&
        err.message.includes(
          'violates foreign key constraint "vibecoin_transactions_to_user_id_fkey"'
        )
      ) {
        setError(
          `Transfer failed. The user account for @${recipient.username} might be invalid or no longer active. Please select a different user.`
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold">Send VibeCoins</h1>
        <p className="text-text-muted mt-1">
          Transfer coins to your friends and collaborators.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card p-6 rounded-2xl shadow-soft border border-border space-y-6"
      >
        {recipient ? (
          <div className="p-4 bg-dark-card rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={
                  recipient.avatar_url ||
                  `https://avatar.vercel.sh/${recipient.id}.png`
                }
                alt={recipient.name || ""}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{recipient.name}</span>
                  <VerifiedBadge profile={recipient} />
                </div>
                <span className="text-sm text-text-muted">
                  @{recipient.username}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRecipient(null);
                setSearchTerm("");
              }}
              className="p-2 rounded-full hover:bg-slate-200"
            >
              &times;
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-text-body mb-2">
              Search Recipient
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full p-3 border rounded-lg bg-dark-card border-border focus:ring-primary focus:border-primary"
            />
            {searchResults.length > 0 && (
              <div className="border rounded-b-lg -mt-1 max-h-40 overflow-y-auto">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setRecipient(p)}
                    className="p-3 hover:bg-slate-100 cursor-pointer flex items-center gap-3"
                  >
                    <img
                      src={
                        p.avatar_url || `https://avatar.vercel.sh/${p.id}.png`
                      }
                      alt={p.name || ""}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{p.name}</span>
                        <VerifiedBadge profile={p} />
                      </div>
                      <span className="text-sm text-text-muted">
                        @{p.username}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-body mb-2">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="1"
            className="w-full p-3 border rounded-lg bg-dark-card border-border focus:ring-primary focus:border-primary"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="text-sm text-text-muted">
          <p>Weekly transfer limits may apply to prevent abuse.</p>
          {wallet && (
            <p className="mt-1">
              Your balance:{" "}
              <span className="font-semibold">
                {wallet.balance.toLocaleString()} VibeCoins
              </span>
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate("/wallet")}
            className="flex-1 bg-slate-200 px-4 py-3 rounded-lg font-semibold hover:bg-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !recipient || !amount}
            className="flex-1 bg-primary text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 min-w-[120px]"
          >
            {loading ? <Spinner size="sm" /> : "Send Coins"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SendCoinsPage;
