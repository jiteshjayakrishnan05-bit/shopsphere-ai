/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // DummyJSON serves all product imagery from this CDN.
    remotePatterns: [{ protocol: "https", hostname: "cdn.dummyjson.com" }],
  },
};
export default nextConfig;
