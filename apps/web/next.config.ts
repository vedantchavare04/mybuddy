import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      // Tailwind's Turbopack loader must only process the global entry point.
      // Applying it to *.css also captures *.module.css and breaks the
      // CSS-module class-name mapping used by the page and demo components.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
