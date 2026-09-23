import React, { useState, useEffect } from 'react';
import { Mail, Bell, BellOff, Check, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

interface GmailNotificationSettingsProps {
  walletAddress: string;
  daoAddress: string;
  daoName: string;
  subscriberEmail?: string;
  onSubscriptionChange?: (isSubscribed: boolean) => void;
}

export const GmailNotificationSettings: React.FC<GmailNotificationSettingsProps> = ({
  walletAddress,
  daoAddress,
  daoName,
  subscriberEmail,
  onSubscriptionChange,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      checkGmailConnection();
      checkSubscription();
    }
  }, [walletAddress, daoAddress]);

  const checkGmailConnection = async () => {
    try {
      // Auth required now — this must be the caller's own wallet.
      const data = await apiFetch<{ gmailConnected: boolean }>(`/api/auth/preferences/${walletAddress}`);
      setIsConnected(!!data.gmailConnected);
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
    }
  };

  const checkSubscription = async () => {
    try {
      // Auth required now — this must be the caller's own wallet.
      const subs = await apiFetch<any[]>(`/api/chat/subscriptions/${walletAddress}`);
      const daoSub = subs.find((s: any) => s.daoAddress === daoAddress.toLowerCase());
      const subscribed = daoSub?.receiveNotifications || false;
      setIsSubscribed(subscribed);
      onSubscriptionChange?.(subscribed);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const connectGmail = async () => {
    setLoading(true);
    setError(null);
    try {
      // Auth required now — the backend derives who this is for from the
      // caller's own verified token, not from walletAddress in the body.
      const { url } = await apiFetch<{ url: string }>('/api/auth/gmail/connect', {
        method: 'POST',
      });
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No URL returned');
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      setError('Failed to connect Gmail. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubscription = async () => {
    setLoading(true);
    setError(null);
    try {
      // Requires auth — /api/chat/subscribe always did, but this call never
      // carried a token, so it always failed. Now via apiFetch.
      await apiFetch('/api/chat/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress,
          daoAddress: daoAddress.toLowerCase(),
          receiveNotifications: !isSubscribed,
          email: subscriberEmail?.trim() || undefined,
        }),
      });

      const newStatus = !isSubscribed;
      setIsSubscribed(newStatus);
      onSubscriptionChange?.(newStatus);
      console.log(newStatus ? 'Email notifications enabled!' : 'Email notifications disabled');
    } catch (error) {
      console.error('Error toggling subscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 rounded-lg hover:bg-white/10 transition"
        title={isSubscribed ? "Email notifications enabled" : "Email notifications disabled"}
      >
        {isSubscribed ? (
          <Bell className="w-4 h-4 text-emerald-600" />
        ) : (
          <BellOff className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {showSettings && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowSettings(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-card backdrop-blur-md rounded-xl shadow-xl border border-border p-4 z-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                Email Notifications
              </h4>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            )}

            {!isConnected ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Get email notifications when someone messages in <strong>{daoName}</strong>
                </p>
                <button
                  onClick={connectGmail}
                  disabled={loading}
                  className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {loading ? 'Connecting...' : 'Connect Gmail Account'}
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  We'll only send chat notifications for DAOs you join
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/90">Receive notifications for {daoName}</span>
                  <button
                    onClick={toggleSubscription}
                    disabled={loading}
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      isSubscribed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-white/10 text-muted-foreground'
                    }`}
                  >
                    {isSubscribed ? (
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3" /> Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <BellOff className="w-3 h-3" /> Disabled
                      </span>
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isSubscribed 
                    ? "📧 You'll receive email notifications for new messages in this DAO"
                    : "🔕 Click enable to get email notifications when someone messages"}
                </p>
                <div className="pt-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    ✓ Gmail connected
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};