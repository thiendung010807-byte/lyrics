import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Lyrics · Hòa Âm Hỏa Ý",
  description: "Cùng hòa giọng trong chương trình Hòa Âm Hỏa Ý"
};

export const viewport: Viewport = { themeColor: "#160807", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
