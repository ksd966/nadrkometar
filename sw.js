/* Radi bez interneta: aplikacija, fontovi, slika i ikonice se čuvaju na telefonu.
   Nova verzija se preuzme u pozadini, a aplikacija ponudi „Osveži”. Pri svakoj izmeni promeni CACHE.
   Sve aplikacije na ksd966.github.io dele isti keš prostor, pa ovaj worker briše samo svoje stare keševe
   i sam vraća fajlove ako ih neka druga aplikacija obriše. */
const PREFIX = "nadrkometar-";
const CACHE = PREFIX + "1.6.1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./fonts/fonts.css",
  "./fonts/Archivo-latin-65449f.woff2", "./fonts/Archivo-latin-ext-7301cd.woff2",
  "./fonts/BigShouldersDisplay-latin-caf8e2.woff2", "./fonts/BigShouldersDisplay-latin-ext-b0801e.woff2",
  "./fonts/JetBrainsMono-latin-4f2720.woff2", "./fonts/JetBrainsMono-latin-ext-06ad36.woff2",
  "./img/stefan.webp", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE))); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "skip") self.skipWaiting(); });
const remember = (req, res) => { if (res.ok && res.type === "basic") { const cl = res.clone(); caches.open(CACHE).then((k) => k.put(req, cl)); } return res; };
self.addEventListener("fetch", (e) => {
  const r = e.request;
  const url = new URL(r.url);
  if (r.method !== "GET" || url.origin !== location.origin || !url.pathname.startsWith(new URL("./", self.registration.scope).pathname)) return;
  // Stranica: prvo mreža (uvek najnovija verzija), sačuvana kopija samo bez interneta ili kad mreža kasni 3 s
  if (r.mode === "navigate") {
    const net = fetch(r, { cache: "no-store" }).then((res) => {
      if (res.ok) { const cl = res.clone(); caches.open(CACHE).then((k) => k.put("./index.html", cl)); }
      return res;
    });
    const slow = new Promise((resolve) => setTimeout(resolve, 3000)).then(() => caches.match("./index.html"));
    e.respondWith(Promise.race([net.catch(() => caches.match("./index.html")), slow.then((c) => c || net)])
      .then((res) => res || net));
    return;
  }
  e.respondWith(caches.match(r, { ignoreSearch: true }).then((c) => c || fetch(r).then((res) => remember(r, res))));
});
