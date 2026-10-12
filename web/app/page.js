import { redirect } from 'next/navigation';

/**
 * Root route — immediately redirects to /connections.
 * This is a server component; redirect() works at render time.
 */
export default function RootPage() {
  redirect('/connections');
}
