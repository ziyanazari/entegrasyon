import type { NextConfig } from "next";

const nextConfig = {
  /* Diğer ayarların varsa buraya ekleyebilirsin */
  output: "standalone",
  


  typescript: {
    // TypeScript hataları olsa bile projeyi yayına al (Build'e devam et)
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint (yazım kuralı) hatalarını build sırasında görmezden gel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;