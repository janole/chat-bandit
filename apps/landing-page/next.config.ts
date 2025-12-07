import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    output: "standalone",
    eslint: {
        ignoreDuringBuilds: true,
    },
    outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
