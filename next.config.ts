import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 상위 폴더 lockfile 경고 방지 (프로젝트 루트 명시)
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
