import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_HOSTS = [
  "applejr.net",
  "applejr.cloud",
  "applejr.ipadownloads.com",
  "sideload.applejr.net",
  "github.com",
  "raw.githubusercontent.com",
  "objects.githubusercontent.com",
  "codeload.github.com",
];

function isAllowed(host: string) {
  return ALLOWED_HOSTS.includes(host.toLowerCase());
}

async function proxy(request: Request, splat: string) {
  const raw = splat.replace(/^\/+/, "");
  if (!raw) return new Response("Not found", { status: 404 });

  let target: URL;
  try {
    target = new URL(`https://${raw}`);
  } catch {
    return new Response("Bad target", { status: 400 });
  }
  if (!isAllowed(target.hostname)) {
    return new Response("Host not allowed", { status: 403 });
  }
  const incoming = new URL(request.url);
  incoming.searchParams.forEach((v, k) => target.searchParams.set(k, v));

  const upstream = await fetch(target.toString(), {
    redirect: "follow",
    headers: {
      "user-agent": request.headers.get("user-agent") ?? "KINST",
      accept: request.headers.get("accept") ?? "*/*",
      range: request.headers.get("range") ?? "",
    },
  });

  const contentType = upstream.headers.get("content-type") ?? "";
  const isManifest =
    target.pathname.endsWith(".plist") ||
    contentType.includes("xml") ||
    contentType.includes("plist");

  const base = `${incoming.origin}/api/public/p/`;

  if (isManifest) {
    let body = await upstream.text();
    body = body.replace(/https:\/\/([a-z0-9.-]+)\//gi, (match, host: string) =>
      isAllowed(host) ? `${base}${host}/` : match,
    );
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type": "application/xml",
        "cache-control": "public, max-age=300",
        "access-control-allow-origin": "*",
      },
    });
  }

  const headers = new Headers();
  const passthrough = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("cache-control", "public, max-age=3600");
  headers.set("access-control-allow-origin", "*");

  return new Response(upstream.body, { status: upstream.status, headers });
}

export const Route = createFileRoute("/api/public/p/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => proxy(request, (params as { _splat?: string })._splat ?? ""),
      HEAD: async ({ request, params }) => proxy(request, (params as { _splat?: string })._splat ?? ""),
    },
  },
});
