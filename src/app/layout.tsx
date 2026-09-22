import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vouxr Business OS",
    template: "%s · Vouxr Business OS",
  },
  description:
    "AI-assisted accounting, inventory, stocks, recipes, purchasing, sales, and reporting for growing businesses.",
  applicationName: "Vouxr Business OS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
