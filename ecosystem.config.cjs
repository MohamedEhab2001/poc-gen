module.exports = {
  apps: [
    {
      name: "poc-gen",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 --port 3010",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "900M",
      kill_timeout: 10_000,
      listen_timeout: 10_000,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: "3010",
      },
    },
  ],
};
