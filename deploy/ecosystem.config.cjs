// PM2 process file — run the built Nitro node server without Docker.
// Usage on the VPS:
//   NITRO_PRESET=node_server npm run build
//   pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "the-intent",
      script: ".output/server/index.mjs",
      cwd: "/var/www/the-intent",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "8080",
        NITRO_PRESET: "node_server",
      },
    },
  ],
};
