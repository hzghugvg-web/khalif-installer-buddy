import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/library")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return Response.json({ apps: [] });
        const client = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
                headers.delete("Authorization");
              }
              headers.set("apikey", key);
              return fetch(input, { ...init, headers });
            },
          },
        });
        const { data, error } = await client
          .from("library_apps")
          .select("id,name,description,category,version,icon_url,install_url,ipa_path,sort_order")
          .eq("is_published", true)
          .order("sort_order");
        if (error) return Response.json({ apps: [] }, { status: 500 });

        const origin = new URL(request.url).origin;
        const apps = (data ?? []).map((app) => ({
          ...app,
          install_url: app.ipa_path
            ? `itms-services://?action=download-manifest&url=${origin}/api/public/manifest/${app.id}`
            : app.install_url,
        }));
        return Response.json({ apps }, { headers: { "cache-control": "public, max-age=60" } });
      },
    },
  },
});
