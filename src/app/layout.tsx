import type { Metadata } from 'next';
import { Inter, Noto_Sans_KR } from 'next/font/google';
import { Providers } from '@/components/providers/Providers';

const inter = Inter({ subsets: ['latin'] });
const notoSansKr = Noto_Sans_KR({ 
  subsets: ['latin'], 
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-kr'
});

export const metadata: Metadata = {
  title: '견적서 관리 시스템',
  description: 'Motion Sense 견적서 관리 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='ko'>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className={`${inter.className} ${notoSansKr.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
