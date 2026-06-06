import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Who's Better 1v1? — Check-Up",
  description:
    "Settle the debate. Vote 1v1 matchups across NBA legends, WNBA stars, streetball icons, and celebrity ballers. Powered by Check-Up — The Basketball Network.",
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
  themeColor: "#0A0A0A",   // matches Check-Up app background
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* bg-checkup-black is now #0A0A0A — true app background */}
      <body className="bg-[#0A0A0A] font-body text-white antialiased">
        {children}
      </body>
    </html>
  );
}
