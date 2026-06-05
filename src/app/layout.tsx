import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Who's Better 1v1? — Check-Up",
  description:
    "Settle the debate. Vote 1v1 matchups across NBA legends, streetball icons, and celebrity ballers. Powered by Check-Up — The Basketball Network.",
  openGraph: {
    title: "Who's Better 1v1?",
    description: "Settle the debate. Powered by Check-Up.",
    images: ["/api/og"],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1E1E1E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-checkup-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
