import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "اپلیکیشن",
  description: "Next.js front-end with BFF and token sync",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
