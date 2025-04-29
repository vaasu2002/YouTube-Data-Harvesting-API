# Docker Deployment Guide

This application is fully containerized using Docker, making it easy to deploy in any environment. The configuration uses Docker Compose to orchestrate multiple services including the Node.js application with PM2, MongoDB, and Redis.

## Prerequisites

- Docker and Docker Compose installed on your system
- YouTube API key(s)

## Quick Start

1. Clone the repository
2. Create a `.env` file with your YouTube API key(s)
3. Run Docker Compose:

```bash
docker-compose up -d
```

This will start three containers:
- `serri-assignment`: The Node.js application with PM2
- `serri-assignment-mongo`: MongoDB database
- `serri-assignment-redis`: Redis for API key management

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
YOUTUBE_API_KEYS=your_youtube_api_key_1,your_youtube_api_key_2
SEARCH_QUERY=football
FETCH_INTERVAL=10000
MAX_RESULTS=50
YOUTUBE_QUOTA_LIMIT=10000
```

## Docker Compose Services

### Application (Node.js + PM2)

- Built from the project Dockerfile
- Runs with PM2 in cluster mode
- Automatically restarts if it crashes
- Configured with healthchecks

### MongoDB

- Uses the official MongoDB 6.0 image
- Persists data using Docker volumes
- Configured with healthchecks

### Redis

- Uses the official Redis 7.0 Alpine image
- Configured with appendonly persistence
- Persists data using Docker volumes
- Configured with healthchecks

## Container Management

### Starting the Application

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d app
```

### Viewing Logs

```bash
# View logs from all services
docker-compose logs

# View logs from a specific service with follow
docker-compose logs -f app

# View last 100 lines of app logs
docker-compose logs --tail=100 app
```

### Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop all services and remove volumes
docker-compose down -v
```

### Restarting Services

```bash
# Restart a specific service
docker-compose restart app

# Rebuild and restart after code changes
docker-compose up -d --build app
```

## Scaling in Production

For production environments, you can scale the application service:

```bash
# Run 3 instances of the app service
docker-compose up -d --scale app=3
```

Note: When scaling, you'll need a load balancer in front of your application containers.

## Monitoring Containers

```bash
# View container status
docker-compose ps

# View container resource usage
docker stats

# View process list inside the app container
docker-compose exec app pm2 list

# Access MongoDB shell
docker-compose exec mongo mongosh
```

## Container Health Monitoring

All services are configured with healthchecks to ensure they're running properly. You can check the health status with:

```bash
docker inspect --format='{{json .State.Health}}' serri-assignment | jq
```

## Building for Different Environments

The configuration supports different environments:

```bash
# Build for development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Build for production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Note: You'll need to create the environment-specific compose files.

## Security Considerations

- The application runs as a non-root user inside the container
- Sensitive information is passed through environment variables
- Container networking is isolated with a bridge network