import type { MetadataRoute } from "next"

// Lets crew add the staff app to a phone's home screen. Standalone mode drops
// the browser chrome, which is what the fixed bottom bars assume.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SailFuture Expeditions",
    short_name: "Expeditions",
    description: "Staff portal for recording and managing daily operations during sailing expeditions.",
    start_url: "/home",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  }
}
