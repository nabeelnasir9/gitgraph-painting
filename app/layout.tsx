import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const title = "GitGraph Painter - Paint Your GitHub Contribution Graph";
const description =
  "Design a GitHub contribution graph pattern, preview the exact commit count, and download a safe local script. No OAuth, no tokens, no backend.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "GitGraph Painter",
  title: {
    default: title,
    template: "%s | GitGraph Painter",
  },
  description,
  keywords: [
    "GitHub contribution graph",
    "GitHub contribution painter",
    "GitHub graph generator",
    "commit graph painter",
    "GitHub profile art",
    "backdated git commits",
    "contribution graph art",
  ],
  authors: [{ name: "GitGraph Painter" }],
  creator: "GitGraph Painter",
  publisher: "GitGraph Painter",
  category: "Developer Tools",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "GitGraph Painter",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "GitGraph Painter contribution graph canvas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=4", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico?v=4",
    apple: "/apple-icon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#FAF7F0",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "GitGraph Painter",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Paint a 7 by 53 GitHub contribution grid",
      "Generate downloadable shell scripts",
      "Create shareable URLs without a database",
      "Export contribution art as PNG",
      "No OAuth, tokens, backend, or database",
    ],
  };

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
