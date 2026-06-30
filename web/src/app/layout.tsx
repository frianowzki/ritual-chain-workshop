import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Bounty Judge — Ritual Chain",
  description:
    "Submit answers to a bounty. After the deadline, Ritual AI ranks all submissions. The bounty owner finalizes the winner.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "AI Bounty Judge — Ritual Chain",
    description: "Crowd-judged bounties, settled by AI. Privacy-preserving AI bounty system on Ritual Chain.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AI Bounty Judge — Ritual Chain",
    description: "Crowd-judged bounties, settled by AI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-black text-white">
        <Providers>
          <Sidebar />
          <main className="lg:pl-[60px] min-h-screen transition-all duration-300">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
