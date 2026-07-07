/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Make sure the logo images are bundled into the serverless functions
  // that generate PDFs (they're read from disk at request time).
  experimental: {
    outputFileTracingIncludes: {
      "/api/requests/[id]/pdf": ["./public/*.jpg"],
      "/api/bills/[id]/pdf": ["./public/*.jpg"],
    },
  },
};

export default nextConfig;
