// Minimal Deno typings used in this file (only the bits we need).
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

// Import at runtime on Deno; TypeScript in this repo doesn't resolve the
// special "npm:" specifier — silence type-checking for the runtime import.
// @ts-ignore
import webpush from "npm:web-push@3.6.7";
//just for deployement of vercel
webpush.setVapidDetails(
  "mhjrpy@gmail.com", // change to a real email
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

Deno.serve(async (req: Request) => {
  const { record } = await req.json(); // the new notifications row

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const res = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${record.user_id}`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  const subs = await res.json();

  await Promise.all(
    subs.map((sub: any) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: record.title, body: record.message })
        )
        .catch((err: any) => console.error("push failed", err?.message ?? err))
    )
  );

  return new Response("ok");
});