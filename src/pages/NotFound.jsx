import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-xl md:text-2xl mb-4">Page Not Found</h2>
      <p className="mb-8 text-base md:text-lg">Sorry, the page you are looking for does not exist.</p>
      <Link to="/" className="bg-primary text-white px-6 py-2 rounded">Go to Home</Link>
    </div>
  );
} 