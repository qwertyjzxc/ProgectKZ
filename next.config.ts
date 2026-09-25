import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  // Перф: tree-shake иконок lucide-react — в бандл едет только используемое
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Фото объектов лежат в Supabase Storage — next/image отдаёт ресайз + WebP
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default withAnalyzer(nextConfig);
