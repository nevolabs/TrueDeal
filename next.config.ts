import type { NextConfig } from "next";

const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const nextConfig: NextConfig = {
  images: {
    remotePatterns: storageUrl ? ['listing-photos/**', 'site-assets/brand/**', 'site-assets/providers/**'].map(path => ({
      protocol: storageUrl.protocol.replace(':', '') as 'http' | 'https',
      hostname: storageUrl.hostname,
      port: storageUrl.port,
      pathname: `/storage/v1/object/public/${path}`,
      search: '',
    })) : [],
    maximumRedirects: 0,
  },
};

export default nextConfig;
