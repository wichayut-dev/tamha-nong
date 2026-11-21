// Service worker: รับแจ้งเตือนเข้ามือถือ แม้ปิดหน้าเว็บอยู่
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch {}
  const url = typeof d.url === "string" && d.url.startsWith("/") ? d.url : "/";
  event.waitUntil(self.registration.showNotification(d.title || "ตามหาน้อง ภูเก็ต", {
    body: d.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: d.tag || url,
    renotify: true,
    data: { url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of list) {
      if ("focus" in c) {
        if ("navigate" in c) { try { await c.navigate(url); } catch {} }
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
