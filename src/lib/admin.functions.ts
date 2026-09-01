import { createHash, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

type AdminSession = { unlocked?: boolean };

function sessionConfig() {
  const password = process.env["ADMIN_SESSION_SECRET"];
  if (!password) throw new Error("Секрет сессии панели не настроен");
  return {
    password,
    name: "kinst-admin",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

function matches(input: string, expected: string) {
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

async function requireAdmin() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.unlocked) throw new Error("Нет доступа");
}

const appSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).default(""),
  category: z.string().trim().max(40).default("Приложения"),
  version: z.string().trim().max(30).default(""),
  icon_url: z.string().url(),
  install_url: z.string().url(),
  is_published: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(100000).default(0),
});

export const getAdminState = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { unlocked: session.data.unlocked === true };
});

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ code: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PANEL_CODE"];
    if (!expected || !matches(data.code, expected)) return { ok: false as const };
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const listAdminApps = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("library_apps").select("*").order("sort_order");
  if (error) throw error;
  return data;
});

export const saveAdminApp = createServerFn({ method: "POST" })
  .inputValidator((input) => appSchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...app } = data;
    const row = id ? { ...app, id } : app;
    const { data: saved, error } = await supabaseAdmin
      .from("library_apps")
      .upsert(row)
      .select("*")
      .single();
    if (error) throw error;
    return saved;
  });

export const deleteAdminApp = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("library_apps").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });