import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages serves this project below the repository path. Building with
  // the same base path keeps both asset loading and client-side hydration in
  // sync with the deployed URL.
  basePath: "/boc",
  // `pages/` is the checked-in GitHub Pages artifact, not a Pages Router
  // source directory. Limiting route extensions keeps its compiled `.js`
  // assets out of vinext's route graph on subsequent builds.
  pageExtensions: ["tsx", "ts", "jsx"],
};

export default nextConfig;
