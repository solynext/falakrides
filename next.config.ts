import type {NextConfig} from "next";
const nextConfig:NextConfig = {experimental:{proxyClientMaxBodySize:"21mb"},distDir: process.env.NEXT_DIST_DIR || ".next",async redirects(){return [{source:"/locations/jeddah-airport-jed-b4dd7",destination:"/locations/jeddah-airport",permanent:true}];},images:{remotePatterns:[{protocol:"https",hostname:"images.unsplash.com"}, ...(process.env.CLOUDINARY_CLOUD_NAME ? [{protocol: "https" as const, hostname: "res.cloudinary.com", pathname: `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/**`}] : [])]}};
export default nextConfig;
