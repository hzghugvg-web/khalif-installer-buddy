import { createFileRoute } from "@tanstack/react-router";

async function serve(request: Request, splat: string) {
  const path = decodeURIComponent(splat.replace(/^\/+/, ""));
  if (!path) return new Response("Not found", { status: 404 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from("library").createSignedUrl(path, 300);
  if (error || !data) return new Response("Not found", { status: 404 });

  const upstream = await fetch(data.signedUrl, {
    redirect: "follow",
    headers: {
      accept: request.headers.get("accept") ?? "*/*",
      ...(request.headers.get("range") ? { range: request.headers.get("range")! } : {}),
    },
  });

  const headers = new Headers();
  for (const key of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  if (path.endsWith(".ipa")) headers.set("content-type", "application/octet-stream");
  headers.set("cache-control", "public, max-age=600");
  headers.set("access-control-allow-origin", "*");

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

export const Route = createFileRoute("/api/public/f/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => serve(request, (params as { _splat?: string })._splat ?? ""),
      HEAD: ({ request, params }) => serve(request, (params as { _splat?: string })._splat ?? ""),
    },
  },
});
