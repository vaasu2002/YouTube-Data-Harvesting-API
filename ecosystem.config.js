module.exports = {
    apps: [
      {
        name: "serri-assignment",
        script: "build/index.js",
        instances: "max", // Use max CPU cores in production
        exec_mode: "cluster", // Run in cluster mode for load balancing
        watch: false, // Don't watch for file changes in production
        max_memory_restart: "1G", // Restart if memory exceeds 1GB
        env_development: {
          NODE_ENV: "development",
          PORT: 3000
        },
        env_production: {
          NODE_ENV: "production",
          PORT: 3000
        },
        // Deployment settings
        time: true, // Add timestamps to logs
        log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        // Error handling
        max_restarts: 10,
        restart_delay: 5000, // Wait 5 seconds between restarts
        // Auto-restart on file change
        ignore_watch: ["node_modules", "logs"],
        // Merge logs
        merge_logs: true,
        // Output logs to specific files
        out_file: "logs/pm2-out.log",
        error_file: "logs/pm2-error.log",
        // Clean logs
        combine_logs: true
      }
    ]
  };