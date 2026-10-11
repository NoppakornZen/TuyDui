import type { Metadata } from 'next';
import AuthProvider from './components/AuthProvider';

export const metadata: Metadata = {
  title: 'TuyDui',
  description: 'Brief-to-project workspace with scope change intelligence.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
