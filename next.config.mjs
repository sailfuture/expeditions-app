/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Recipe and record photos live in Xano's file vault as ~1 MB PNGs. Vercel's image
    // optimizer resizes them to the rendered size and serves WebP/AVIF, so a 48 px
    // thumbnail is a few KB instead of a megabyte. The vault URL 303-redirects to Google
    // Cloud Storage, so both hosts are allowed.
    remotePatterns: [
      { protocol: "https", hostname: "xsc3-mvx7-r86m.n7e.xano.io", pathname: "/vault/**" },
      { protocol: "https", hostname: "storage.googleapis.com", pathname: "/xsc3-mvx7-r86m.n7e.xano.io/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
    // Thumbnails are 28–320 px; keep the small sizes dense so each renders at its own size.
    imageSizes: [16, 28, 32, 48, 64, 96, 128, 192, 256, 320, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
}

export default nextConfig
