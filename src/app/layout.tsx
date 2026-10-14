import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const title = "Techcity Studio";
const description =
  "Techcity Studio generates certificates, offer letters, and appreciation letters from approved TechCity templates.";
const logo = {
  url: "/techcity-logo.png",
  type: "image/png",
  width: 866,
  height: 842,
  alt: title,
};

export const metadata: Metadata = {
  title: {
    default: title,
    template: `%s — ${title}`,
  },
  description,
  applicationName: title,
  authors: [
    { name: "TechCity Skills Pvt. Ltd.", url: "https://www.techcityskills.com/" },
  ],
  creator: "TechCity Skills Pvt. Ltd.",
  publisher: "TechCity Skills Pvt. Ltd.",
  keywords: [
    "Techcity Studio",
    "TechCity",
    "TechCity Skills",
    "offer letter",
    "appreciation letter",
    "certificate",
  ],
  category: "productivity",
  referrer: "origin-when-cross-origin",
  icons: {
    icon: [{ url: logo.url, type: logo.type, sizes: "866x842" }],
    shortcut: [logo.url],
    apple: [{ url: logo.url, type: logo.type, sizes: "866x842" }],
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: title,
    title,
    description,
    images: [logo],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: [logo.url],
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f6f5",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
