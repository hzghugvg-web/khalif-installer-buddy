import { createFileRoute } from "@tanstack/react-router";

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const Route = createFileRoute("/api/public/manifest/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const id = String(params.id).replace(/\.plist$/, "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("library_apps")
          .select("name,version,bundle_id,ipa_path,icon_url")
          .eq("id", id)
          .maybeSingle();
        if (error || !data || !data.ipa_path) return new Response("Not found", { status: 404 });

        const origin = new URL(request.url).origin;
        const ipa = `${origin}/api/public/f/${data.ipa_path.split("/").map(encodeURIComponent).join("/")}`;
        const icon = data.icon_url?.startsWith("http") ? data.icon_url : `${origin}/site/assets/img-local/logo2.webp`;

        const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>items</key><array><dict>
<key>assets</key><array>
<dict><key>kind</key><string>software-package</string><key>url</key><string>${esc(ipa)}</string></dict>
<dict><key>kind</key><string>display-image</string><key>url</key><string>${esc(icon)}</string></dict>
<dict><key>kind</key><string>full-size-image</string><key>url</key><string>${esc(icon)}</string></dict>
</array>
<key>metadata</key><dict>
<key>bundle-identifier</key><string>${esc(data.bundle_id || `app.kinst.${id.slice(0, 8)}`)}</string>
<key>bundle-version</key><string>${esc(data.version || "1.0")}</string>
<key>kind</key><string>software</string>
<key>title</key><string>${esc(data.name)}</string>
</dict></dict></array></dict></plist>`;

        return new Response(plist, {
          headers: {
            "content-type": "application/xml",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
