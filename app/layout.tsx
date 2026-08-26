import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://zzg2566.github.io/boc/"),
  title: "青鉴实干｜青年政绩观｜中国银行益阳分行",
  description: "以实干立身、以实绩检验。中国银行益阳分行青年政绩观主题栏目。",
  applicationName: "青鉴实干",
  icons: {
    icon: "./boc-logo.jpg",
    shortcut: "./boc-logo.jpg",
  },
  openGraph: {
    type: "website",
    title: "青鉴实干｜青年政绩观",
    description: "以实干立身、以实绩检验。",
    images: [{ url: "./og.jpg", width: 1200, height: 800, alt: "青鉴实干｜青年政绩观" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "青鉴实干｜青年政绩观",
    description: "以实干立身、以实绩检验。",
    images: ["./og.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
