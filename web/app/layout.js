import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "CRM — Unified Communications",
  description:
    "Task-based CRM with WhatsApp and Gmail integration. Manage tasks, clients, and team communications in one unified inbox.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
