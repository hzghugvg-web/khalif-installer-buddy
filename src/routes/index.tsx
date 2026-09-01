import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "KINST — KHALIFINSTALLER" },
      { name: "description", content: "KINST (KHALIFINSTALLER) — установщик IPA для iOS. ESign, Scarlet, KSign, SideInstaller и подпись IPA прямо с iPhone." },
      { property: "og:title", content: "KINST — KHALIFINSTALLER" },
      { property: "og:description", content: "Установка IPA на iOS без компьютера. ESign, Scarlet, KSign и Signer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  useEffect(() => {
    window.location.replace("/site/index.htm");
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      Загрузка KINST…
    </div>
  );
}
