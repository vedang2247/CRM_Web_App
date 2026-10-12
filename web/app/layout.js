import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Unified Inbox — WhatsApp & Gmail",
  description:
    "A unified communication inbox integrating WhatsApp (QR scan) and Gmail (OAuth 2.0). Built as an intern assignment demo.",
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
