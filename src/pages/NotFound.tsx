import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center">
      <p className="mb-2 text-7xl font-black text-gray-700">404</p>
      <h1 className="mb-3 text-2xl font-bold text-gray-100">Page Not Found</h1>
      <p className="mb-8 text-gray-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        <Home className="h-4 w-4" />
        Back to Home
      </Link>
    </main>
  );
}
