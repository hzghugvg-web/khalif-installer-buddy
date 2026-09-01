import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAdminApp,
  getAdminState,
  listAdminApps,
  saveAdminApp,
  unlockAdmin,
} from "@/lib/admin.functions";
import type { Tables } from "@/integrations/supabase/types";

type App = Tables<"library_apps">;

export const Route = createFileRoute("/kinst-control")({
  head: () => ({
    meta: [
      { title: "Панель управления — KINST" },
      { name: "description", content: "Закрытая панель управления библиотекой KINST." },
      { property: "og:title", content: "Панель управления — KINST" },
      { property: "og:description", content: "Закрытая панель управления библиотекой KINST." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

const emptyForm = {
  name: "",
  description: "",
  category: "Приложения",
  version: "",
  icon_url: "",
  install_url: "",
  is_published: true,
  sort_order: 0,
};

function AdminPage() {
  const router = useRouter();
  const stateFn = useServerFn(getAdminState);
  const unlockFn = useServerFn(unlockAdmin);
  const listFn = useServerFn(listAdminApps);
  const saveFn = useServerFn(saveAdminApp);
  const deleteFn = useServerFn(deleteAdminApp);
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  async function refresh() {
    setApps(await listFn());
  }

  useEffect(() => {
    stateFn().then(async ({ unlocked: isUnlocked }) => {
      setUnlocked(isUnlocked);
      if (isUnlocked) await refresh();
      setReady(true);
    });
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    const result = await unlockFn({ data: { code } });
    if (!result.ok) return setError("Неверный секретный код");
    setUnlocked(true);
    setError("");
    await refresh();
    await router.invalidate();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveFn({ data: { ...form, id: editingId } });
    setForm(emptyForm);
    setEditingId(undefined);
    await refresh();
  }

  function edit(app: App) {
    setEditingId(app.id);
    setForm({
      name: app.name,
      description: app.description,
      category: app.category,
      version: app.version,
      icon_url: app.icon_url,
      install_url: app.install_url,
      is_published: app.is_published,
      sort_order: app.sort_order,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!ready) return <main className="min-h-screen bg-background" />;
  if (!unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-5">
        <form onSubmit={login} className="w-full max-w-sm space-y-5 rounded-lg border bg-card p-6 shadow-xl">
          <div><p className="text-xs font-semibold text-primary">KINST CONTROL</p><h1 className="mt-1 text-2xl font-bold">Вход в панель</h1></div>
          <div className="space-y-2"><Label htmlFor="code">Секретный код</Label><Input id="code" name="code" type="password" autoFocus required /></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" type="submit">Войти</Button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7"><p className="text-xs font-semibold text-primary">KINST CONTROL</p><h1 className="text-3xl font-bold">Библиотека приложений</h1></header>
        <form onSubmit={submit} className="mb-8 grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-2">
          <div className="space-y-2"><Label>Название</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Версия</Label><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
          <div className="space-y-2"><Label>Категория</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div className="space-y-2"><Label>Порядок</Label><Input type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Описание</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="space-y-2"><Label>Ссылка на иконку</Label><Input type="url" value={form.icon_url} onChange={(e) => setForm({ ...form, icon_url: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Ссылка установки</Label><Input type="url" value={form.install_url} onChange={(e) => setForm({ ...form, install_url: e.target.value })} required /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Показывать на сайте</label>
          <div className="flex justify-end gap-2">
            {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(undefined); setForm(emptyForm); }}><X /> Отмена</Button>}
            <Button type="submit">{editingId ? <Save /> : <Plus />}{editingId ? "Сохранить" : "Добавить"}</Button>
          </div>
        </form>
        <section className="grid gap-3">
          {!apps.length && <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Библиотека пуста.</p>}
          {apps.map((app) => (
            <article key={app.id} className="flex items-center gap-4 rounded-lg border bg-card p-4">
              <img src={app.icon_url} alt="" className="h-14 w-14 rounded-md object-cover" />
              <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{app.name}</h2><p className="truncate text-sm text-muted-foreground">{app.category} {app.version && `• ${app.version}`}</p></div>
              <Button size="icon" variant="outline" title="Редактировать" onClick={() => edit(app)}><Pencil /></Button>
              <Button size="icon" variant="destructive" title="Удалить" onClick={async () => { if (confirm(`Удалить ${app.name}?`)) { await deleteFn({ data: { id: app.id } }); await refresh(); } }}><Trash2 /></Button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}