/** @type {import('next').NextConfig} */
const bundleAnalyzer = require("@next/bundle-analyzer");

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, options) => {
    const cfg = {
      ...config,
      resolve: {
        ...config.resolve,
        fallback: {
          fs: false,
          os: false,
          path: false,
        },
      },
    };
    if (!options.isServer) {
      cfg.optimization.splitChunks = {
        chunks: "all",
        minSize: 20480,
        cacheGroups: {
          solanaTokenList: {
            name: "solana-token-list",
            test: (module) =>
              /[@solana\\/]spl-token-registry[\\/].*[\\/]solana.tokenlist.json/.test(
                module.resource
              ),
            maxSize: 7 * 1e6,
          },
          jupAgCore: {
            name: "jup-ag-core",
            test: /[\\/]@jup-ag[\\/]core[\\/]/,
            priority: -10,
          },
          jupAgSDK: {
            name: "jup-ag-sdk",
            test: /[\\/]@jup-ag[\\/].*-sdk(-v\d*)?[\\/]/,
            priority: -10,
          },
          jupAg: {
            name: "jup-ag",
            test: /[\\/]@jup-ag[\\/]/,
            priority: -20,
          },
          franciumSDK: {
            name: "francium",
            test: /[\\/]francium-sdk[\\/]/,
            priority: -10,
          },
          mercurialFinance: {
            name: "mercurial",
            test: /[\\/]@mercurial-finance[\\/]/,
            priority: -10,
          },
          solendProtocol: {
            name: "solend",
            test: /[\\/]@solendprotocol[\\/]/,
            priority: -10,
          },
          apricotLend: {
            name: "apricot-lend",
            test: /[\\/]@apricot-lend[\\/]/,
            priority: -10,
          },
          projectSerum: {
            name: "serum",
            test: /[\\/]@project-serum[\\/]/,
            priority: -30,
          },
          default: {
            reuseExistingChunk: true,
            priority: -40,
            minChunks: 2,
          },
        },
      };
    }
    return cfg;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
