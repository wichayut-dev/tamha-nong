/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
const supa = "https://*.supabase.co wss://*.supabase.co";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com",
  "font-src 'self' data:",
  `connect-src 'self' ${supa} https://cdn.jsdelivr.net https://unpkg.com${isProd ? "" : " ws: wss: http: https:"}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig = {
  poweredByHeader: false,
  // ให้มือถือในวง Wi-Fi เดียวกันเปิดเว็บตอนพัฒนาได้ (เช่น http://192.168.1.9:3000)
  allowedDevOrigins: ["*.trycloudflare.com", "192.168.1.9", "192.168.1.*", "192.168.0.*", "*.local"],
  images: { unoptimized: true },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=(), payment=()" },
        ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ],
    }];
  },
};
export default nextConfig;
