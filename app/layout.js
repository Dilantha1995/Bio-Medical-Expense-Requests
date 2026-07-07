import "./globals.css";

export const metadata = {
  title: "PSMS Travel Advance & Bills",
  description: "Travel advance requests and bill summaries for PSMS Bio-Medical engineers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
