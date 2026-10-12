import type { Metadata } from 'next';
import AuthProvider from './components/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'TuyDui',
  description: 'Brief-to-project workspace with scope change intelligence.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
