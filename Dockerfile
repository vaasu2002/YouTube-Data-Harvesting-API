FROM node:18-alpine AS builder

WORKDIR /app

RUN npm install pm2 -g

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN npm install pm2 -g

RUN mkdir -p /app/logs

# Copy built code and dependencies from builder stage
COPY --from=builder /app/build /app/build
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package*.json /app/
COPY --from=builder /app/ecosystem.config.js /app/

ENV PORT=3000

EXPOSE 3000

# Create a non-root user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Start the application with PM2 in production mode
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]