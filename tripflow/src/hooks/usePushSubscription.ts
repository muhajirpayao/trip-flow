import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

interface UsePushSubscriptionReturn {
  subscribed: boolean;
  loading: boolean;
  supported: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushSubscription(userId: string | undefined): UsePushSubscriptionReturn {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const supported = "serviceWorker" in navigator && "PushManager" in window;

  // Check whether a subscription already exists on mount
  useEffect(() => {
    if (!supported || !userId) {
      setLoading(false);
      return;
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false))
      .finally(() => setLoading(false));
  }, [userId, supported]);

  const subscribe = useCallback(async () => {
    if (!userId || !supported) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Permission denied");
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { endpoint, keys } = subscription.toJSON() as any;
    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: "endpoint" }
    );

    if (error) {
      await subscription.unsubscribe();
      throw error;
    }
    setSubscribed(true);
  }, [userId, supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      await subscription.unsubscribe();
    }
    setSubscribed(false);
  }, [supported]);

  return { subscribed, loading, supported, subscribe, unsubscribe };
}