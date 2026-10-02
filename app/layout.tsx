import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TuyDui',
  description: 'Brief-to-project workspace with scope change intelligence.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
