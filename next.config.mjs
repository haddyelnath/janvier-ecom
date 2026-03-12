// next.config.mjs — plain ESM JavaScript (no TypeScript types in .mjs files)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // No special config needed for this app.
  // Body size limits for image uploads are handled at the Vercel/platform level.
  // Free Vercel Hobby plan: 4.5MB request body limit
  // Vercel Pro plan: 50MB request body limit
};

export default nextConfig;
