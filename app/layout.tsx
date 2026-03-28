import type { Metadata } from 'next';
import { Afacad } from 'next/font/google';
import './globals.css';

const afacad = Afacad({
  subsets: ['latin'],
  variable: '--font-afacad',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: "Jourdain Booking",
  description: "L'Appartement Jourdain – 예약 및 결제",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${afacad.variable} antialiased`}
        style={{
          minHeight: '100vh',
          backgroundColor: '#CAB1A4',
          color: 'rgba(13, 8, 34, 0.8)',
        }}
      >
        {children}
      </body>
    </html>
  );
}
