import dotenv from 'dotenv';

dotenv.config({
    path: './.env'
});


export const config = Object.freeze({
    server:{
        port: parseInt(process.env.PORT || '3000', 10),
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    youtube: {
        apiKeys: process.env.YOUTUBE_API_KEYS?.split(',') || [],
        searchQuery: process.env.SEARCH_QUERY || 'football',
        fetchInterval: parseInt(process.env.FETCH_INTERVAL || '10000', 10),
        maxResults: parseInt(process.env.MAX_RESULTS || '50', 10),
        quotaLimit: parseInt(process.env.YOUTUBE_QUOTA_LIMIT || '10000', 10),
    },
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/yt',
    },
});