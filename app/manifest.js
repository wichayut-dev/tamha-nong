export default function manifest() {
  return {
    name: "ตามหาน้อง ภูเก็ต",
    short_name: "ตามหาน้อง",
    description: "ประกาศสัตว์เลี้ยงหายและพบในภูเก็ต",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf6ef",
    theme_color: "#0b7f8a",
    lang: "th",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "ลงประกาศ", url: "/new" },
      { name: "แผนที่", url: "/map" },
    ],
  };
}
