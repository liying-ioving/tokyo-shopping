// Минимальный service worker: нужен, чтобы приложение ставилось на экран «Домой».
// Офлайн не делаем — всегда берём свежее из сети.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
