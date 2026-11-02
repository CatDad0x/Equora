/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@equora/shared"],
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Optional payment SDK modules pulled in transitively by wallet connectors; not used by Equora.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core/client": false,
      "@x402/evm": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/svm/exact/client": false,
    };
    return config;
  },
};
export default nextConfig;
