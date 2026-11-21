import type { Metadata } from "next";
import { Public_Sans, Schibsted_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SessionProvider } from "@/lib/session-context";
import { ToastProvider } from "@/lib/toast-context";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrueDeal — Verified Products. Protected Payments. Trusted Transactions.",
  description: "Explore pre-owned hardware on TrueDeal. Browse detailed listings and connect buying and selling through one account.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${displayFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>
          <ToastProvider>
            <a className="skip-link" href="#main-content">Skip to content</a>
            <Header />
            <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
            <Footer />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
