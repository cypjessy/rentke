import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "RentKe — Find your perfect rental in Kenya",
  description:
    "RentKe helps you find the perfect rental property in Kenya. Browse listings, connect with landlords, and secure your next home.",
  manifest: "/manifest.json",
  themeColor: "#050505",
  colorScheme: "dark",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RentKe",
  },
  applicationName: "RentKe",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-touch-fullscreen": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050505",
};

import { AuthProvider } from "./AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <body
        className="min-h-full flex flex-col"
        style={{
          background: "#050505",
          color: "#e5e5e5",
          margin: 0,
          padding: 0,
          overflowX: "hidden",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* PWA Apple touch icons */}
        <link
          rel="apple-touch-icon"
          sizes="192x192"
          href="/icon-192x192.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="512x512"
          href="/icon-512x512.png"
        />
        <link
          rel="apple-touch-icon-precomposed"
          href="/icon-192x192-maskable.png"
        />
        {/* PWA Windows tile */}
        <meta name="msapplication-TileColor" content="#050505" />
        <meta name="msapplication-TileImage" content="/icon-192x192.png" />
        <AuthProvider>{children}</AuthProvider>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered:', reg.scope);
                  }, function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
