import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MBS StarRocks Chatbot POC",
  description: "NLP analytics assistant on StarRocks with OpenAI/Claude fallback",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
