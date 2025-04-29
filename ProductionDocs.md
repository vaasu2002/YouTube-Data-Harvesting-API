# Production Deployment with PM2

This application is configured to use PM2 for production deployments. PM2 is a process manager for Node.js applications that helps to keep server online 24/7, reload it without downtime, and manage application logs.

## PM2 Scripts

The following PM2-related scripts are available in package.json:

- `npm run start` - Start the application with PM2 in single instance mode
- `npm run stop` - Stop the PM2 managed application
- `npm run restart` - Restart the application without downtime
- `npm run logs` - View application logs
- `npm run monit` - Monitor CPU/Memory usage
- `npm run status` - Check application status
- `npm run cluster` - Start the application in cluster mode (utilizing all CPU cores)

## PM2 Configuration

The application includes an `ecosystem.config.js` file with advanced PM2 configuration:

```bash
# Start application in cluster mode (all CPU cores)
pm2 start ecosystem.config.js

# Start application with production environment variables
pm2 start ecosystem.config.js --env production

# Start in development mode
pm2 start ecosystem.config.js --env development
```

## Scaling in Production

For handling high loads, start the application in cluster mode:

```bash
npm run cluster
```

This will automatically spawn multiple worker processes across all CPU cores, allowing the server to handle more concurrent requests and provide better reliability.

## Monitoring

PM2 provides several ways to monitor your application:

```bash
# Terminal-based monitoring
npm run monit

# Web-based dashboard (requires PM2 Plus)
pm2 plus
```

## Log Management

PM2 automatically manages application logs:

```bash
# View logs in real-time
npm run logs

# View last 200 lines of logs
pm2 logs serri-assignment --lines 200
```

Logs are saved in the logs directory:
- `logs/pm2-out.log` - Standard output logs
- `logs/pm2-error.log` - Error logs

## Auto-restart on Server Reboot

To ensure server automatically restarts after server reboots:

```bash
# Generate and save the current process list
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions provided by the above command
```

## Zero-Downtime Restarts

PM2 allows us to update server with zero downtime:

```bash
npm run restart
```

This will restart server  without dropping any incoming requests.