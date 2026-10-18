export type WebsiteAvailability = {paused: boolean; messageEnabled: boolean; image: string; audio: string; version: number};

export function availabilityValues(value: unknown): Omit<WebsiteAvailability, "version"> {
  const object = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {paused: websitePaused(value), messageEnabled: object.messageEnabled === true, image: typeof object.image === "string" ? object.image : "", audio: typeof object.audio === "string" ? object.audio : ""};
}

export function websitePaused(value: unknown): boolean {
  return !!value && typeof value === "object" && "paused" in value && value.paused === true;
}

export function isPublicPage(pathname: string): boolean {
  return !["/admin", "/api", "/_next", "/login", "/register", "/forgot-password", "/images", "/fonts"].some(path => pathname === path || pathname.startsWith(`${path}/`))
    && !["/favicon.ico", "/robots.txt", "/sitemap.xml"].includes(pathname);
}

export async function websiteAvailabilityResponse(pathname: string, read: () => Promise<{paused: boolean; messageEnabled?: boolean; image?: string; audio?: string}>): Promise<Response | null> {
  if (!isPublicPage(pathname)) return null;
  const state = await read();
  if (state.messageEnabled) return isSafePauseMedia(state.image || "", "image") ? customMessageResponse(state.image!, state.audio) : pausedWebsiteResponse();
  return state.paused ? pausedWebsiteResponse() : null;
}

export function isSafePauseMedia(value: string, kind: "image" | "audio"): boolean {
  if (!value || value.length > 2000 || /[\u0000-\u0020\\]/.test(value)) return false;
  if (value.startsWith("/")) return kind === "image" ? /^\/images\/(?!.*\.\.)[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|gif|avif)$/i.test(value) : /^\/audio\/(?!.*\.\.)[a-zA-Z0-9_./-]+\.mp3$/i.test(value);
  try {const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && (kind === "image" || url.pathname.toLowerCase().endsWith(".mp3"));} catch {return false;}
}

export function customMessageResponse(image: string, audio = ""): Response {
  if (!isSafePauseMedia(image, "image")) return pausedWebsiteResponse();
  const escape = (value: string) => value.replace(/[&<>"']/g, character => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[character]!));
  const sound = isSafePauseMedia(audio, "audio") ? `<audio id="background-sound" src="${escape(audio)}" autoplay loop preload="auto"></audio><button id="play-sound" type="button" aria-label="Reload">Reload</button><script>(()=>{const audio=document.getElementById("background-sound"),button=document.getElementById("play-sound");const started=()=>{button.hidden=true;};const play=()=>{button.disabled=true;audio.play().then(started).catch(()=>{button.disabled=false;button.hidden=false;});};audio.addEventListener("play",started);audio.addEventListener("error",()=>{button.disabled=false;button.hidden=false;button.setAttribute("aria-label","Retry playing background audio");});button.addEventListener("click",play);play();})();</script>` : "";
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Website unavailable</title><style>html,body{margin:0;width:100%;height:100%;background:#111;overflow:hidden}img{position:fixed;inset:0;width:100%;height:100%;height:100dvh;object-fit:cover}#play-sound{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);display:grid;place-items:center;min-width:140px;min-height:48px;padding:13px 30px;border:1px solid #ffffff80;border-radius:6px;font:600 16px Arial,sans-serif;background:#87cefa;color:#17324d;box-shadow:0 8px 40px #0005;cursor:pointer;z-index:2}#play-sound:hover{background:#6bbcf0}#play-sound:focus-visible{outline:3px solid #fff;outline-offset:6px}#play-sound[hidden]{display:none}#play-sound:disabled{cursor:wait}</style></head><body><img src="${escape(image)}" alt="" fetchpriority="high">${sound}</body></html>`, {
    status: 404,
    headers: {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin"},
  });
}

export function pausedWebsiteResponse(): Response {
  return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>404 | Page not found</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#2a2b34;font:16px Arial,sans-serif}main{text-align:center;padding:32px}strong{display:block;font-size:72px;color:#8dc73f}h1{font-size:24px}p{color:#626862}</style></head><body><main><strong>404</strong><h1>Page not found</h1><p>This page is unavailable.</p></main></body></html>', {
    status: 404,
    headers: {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "same-origin"},
  });
}
