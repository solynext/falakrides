import type {NextConfig} from "next";
const nextConfig:NextConfig = {turbopack:{rules:{"*.css":{loaders:["@tailwindcss/turbopack"],as:"*.css"}}},experimental:{proxyClientMaxBodySize:"21mb"},distDir: process.env.NEXT_DIST_DIR || ".next",async redirects(){return [{source:"/locations/jeddah-airport-jed-b4dd7",destination:"/locations/jeddah-airport",permanent:true}];},images:{remotePatterns:[{protocol:"https",hostname:"images.unsplash.com"},{protocol:"https",hostname:"res.cloudinary.com",pathname:"/*/image/upload/**"}]}};
export default nextConfig;
