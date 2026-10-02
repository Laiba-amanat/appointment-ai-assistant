/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy /api/* requests to the backend during development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
