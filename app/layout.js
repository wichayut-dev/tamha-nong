import { Mitr, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import TabBar from "@/components/TabBar";
import Footer from "@/components/Footer";
import NotificationsProvider from "@/components/Notifications";
import LangProvider from "@/components/LangProvider";

const display = Mitr({ subsets: ["thai", "latin"], weight: ["400", "500"], variable: "--font-display" });
const body = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "600"], variable: "--font-body" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata = {
  metadataBase: new URL(SITE),
  openGraph: { siteName: "ตามหาน้อง ภูเก็ต", locale: "th_TH", type: "website", images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }] },
  title: { default: "ตามหาน้อง ภูเก็ต", template: "%s | ตามหาน้อง ภูเก็ต" },
  description: "รวมประกาศสัตว์เลี้ยงหายและพบในภูเก็ตไว้ที่เดียว พร้อมแผนที่ แจ้งได้ทันทีไม่ต้องสมัครสมาชิก",
  applicationName: "ตามหาน้อง",
  appleWebApp: { capable: true, title: "ตามหาน้อง", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#16110e" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${display.variable} ${body.variable}`}>
      <body>
        <LangProvider>
          <NotificationsProvider>
            <Header />
            <main className="wrap">{children}</main>
            <Footer />
            <TabBar />
          </NotificationsProvider>
        </LangProvider>
      </body>
    </html>
  );
}
