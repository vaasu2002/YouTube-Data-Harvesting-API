import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { ErrorResponse } from '../utils';

interface ApiKeyInfo {
    key: string;
    quotaUsed: number;
    lastUsed: number; 
    isExhausted: boolean;
}

class ApiKeyManager{
    private redisClient: RedisClientType;
    private initialized: boolean = false;
    private readonly REDIS_KEY_PREFIX = 'youtube-api:key:';
    private readonly REDIS_CURRENT_KEY_INDEX = 'youtube-api:current-key-index'; // key at the index is currently being used
    private readonly REDIS_KEY_COUNT = 'youtube-api:key-count'; // total number of available
    private readonly DAILY_QUOTA_LIMIT = 2; 
    
    constructor() {
        this.redisClient = createClient({
            url: config.redis.url
        });

        this.redisClient.on('error', (err) => {
            console.error('Redis error:', err);
        });

        this.redisClient.on('connect', () => {
            console.info('Connected to Redis');
        });
    }


    public async initialize(): Promise<void> {
        if(this.initialized) return;

        try {
            await this.redisClient.connect();
            
            // checks if keys are already initialized in Redis
            const keyCount = await this.redisClient.get(this.REDIS_KEY_COUNT);

            // If no keys are found, initialize them
            if(!keyCount){
                await this.initializeApiKeys();
            }
            this.initialized = true;
            console.info('Redis API Key Service initialized');
        }catch(error){
            console.error('Failed to initialize Redis API Key Service:', error);
            throw error;
        }
    }

    // todo: what if some keys are already initialized?
    private async initializeApiKeys(): Promise<void> {
        const apiKeys = config.youtube.apiKeys;

        if(apiKeys.length === 0){
            console.error('Cannot find Youtube API Keys.');
            return;
        }

        const now = Date.now();


        // WHY MULTI?
        // I want to send multiple commands(keys) to Redis rather than sending them one by one
        // this is because we want to set multiple keys in Redis at once
        const multi = this.redisClient.multi();

        // Store each API key with its info
        for (let i = 0; i < apiKeys.length; i++) {
            const keyInfo: ApiKeyInfo = {
                key: apiKeys[i],
                quotaUsed: 0,
                lastUsed: now,
                isExhausted: false
            };
            multi.set(`${this.REDIS_KEY_PREFIX}${i}`, JSON.stringify(keyInfo));
        }

        // Set the current key index and key count
        multi.set(this.REDIS_CURRENT_KEY_INDEX, '0');
        multi.set(this.REDIS_KEY_COUNT, apiKeys.length.toString());

        await multi.exec();
        console.info(`Initialized ${apiKeys.length} YouTube API keys in Redis`);
    }

    /**
     * Get the current API key
     * @returns {Promise<string>} The current API key
     */
    public async getCurrentKey(): Promise<string> {
        if(!this.initialized){
            await this.initialize();
        }
        
        const keyCount = parseInt(await this.redisClient.get(this.REDIS_KEY_COUNT) || '0', 10);
    
        if(keyCount===0){
            console.error('No API keys available');
            throw ErrorResponse('No YouTube API keys available');
        }

        // if all keys are exhausted, reset them
        await this.resetExhaustedKeysIfNeeded();

        // Get the current key index
        const currentKeyIndex = parseInt(await this.redisClient.get(this.REDIS_CURRENT_KEY_INDEX) || '0', 10);
    
        // Get the current key info
        const keyInfoStr = await this.redisClient.get(`${this.REDIS_KEY_PREFIX}${currentKeyIndex}`);
    
        if(!keyInfoStr){
            console.error(`API key at index ${currentKeyIndex} not found`);
            throw ErrorResponse('API key not found');
        }

        const keyInfo: ApiKeyInfo = JSON.parse(keyInfoStr);
    
        // If the current key is exhausted, find a non-exhausted key
        if(keyInfo.isExhausted){
            return await this.findAndSetNonExhaustedKey();
        }

        return keyInfo.key;
    }
    

    private async resetExhaustedKeysIfNeeded(): Promise<void> {
        const keyCount = parseInt(await this.redisClient.get(this.REDIS_KEY_COUNT) || '0', 10);
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        const midnightTimestamp = midnight.getTime();

        // Check if all keys are exhausted
        let allExhausted = true;
    
        for (let i = 0; i < keyCount; i++) {
            const keyInfoStr = await this.redisClient.get(`${this.REDIS_KEY_PREFIX}${i}`);
            if(!keyInfoStr) continue;
            const keyInfo: ApiKeyInfo = JSON.parse(keyInfoStr);
            // if there is at least one key that is not exhausted, we can exit
            if(!keyInfo.isExhausted){
                allExhausted = false;
                return;
            }
        }

        // If all keys are exhausted, reset those that were exhausted before today's midnight
        if(allExhausted){
            const multi = this.redisClient.multi();
        
            for(let i = 0;i<keyCount;i++){
                const keyInfoStr = await this.redisClient.get(`${this.REDIS_KEY_PREFIX}${i}`);
                if(!keyInfoStr) continue;
                
                const keyInfo:ApiKeyInfo = JSON.parse(keyInfoStr);
                
                // if the key was last used before today's midnight, reset it
                if(keyInfo.lastUsed < midnightTimestamp){
                    keyInfo.isExhausted = false;
                    keyInfo.quotaUsed = 0;
                    multi.set(`${this.REDIS_KEY_PREFIX}${i}`, JSON.stringify(keyInfo));
                }
            }
        
            await multi.exec();
        }
    }


    private async findAndSetNonExhaustedKey(): Promise<string> {
        const keyCount = parseInt(await this.redisClient.get(this.REDIS_KEY_COUNT) || '0', 10);
        const currentKeyIndex = parseInt(await this.redisClient.get(this.REDIS_CURRENT_KEY_INDEX) || '0', 10);
        
        for (let i = 1; i <= keyCount; i++) {
            const index = (currentKeyIndex + i) % keyCount;
            const keyInfoStr = await this.redisClient.get(`${this.REDIS_KEY_PREFIX}${index}`);
            
            if (!keyInfoStr) continue;
            
            const keyInfo: ApiKeyInfo = JSON.parse(keyInfoStr);
            
            if (!keyInfo.isExhausted) {
                // Update the current key index
                await this.redisClient.set(this.REDIS_CURRENT_KEY_INDEX, index.toString());
                console.info(`Switched to next API key: ${this.maskApiKey(keyInfo.key)}`);
                return keyInfo.key;
            }
        }
        
        console.error('All API keys are exhausted');
        throw ErrorResponse('All YouTube API keys are exhausted');
    }

    /**
     * Mark the current key as used and update its quota
     * @param {number} quotaCost - The quota cost for the current request
     */
    public async markKeyAsUsed(quotaCost: number = 100): Promise<void> {
        if(!this.initialized){
            await this.initialize();
        }

        const currentKeyIndex = parseInt(await this.redisClient.get(this.REDIS_CURRENT_KEY_INDEX) || '0', 10);
        const keyInfoStr = await this.redisClient.get(`${this.REDIS_KEY_PREFIX}${currentKeyIndex}`);
    
        if(!keyInfoStr){
            console.error(`API key at index ${currentKeyIndex} not found`);
            return;
        }
    
        const keyInfo: ApiKeyInfo = JSON.parse(keyInfoStr);
        keyInfo.quotaUsed += quotaCost;
        keyInfo.lastUsed = Date.now();
    
        if(keyInfo.quotaUsed >= this.DAILY_QUOTA_LIMIT){
            console.warn(`API key ${this.maskApiKey(keyInfo.key)} has been exhausted`);
            keyInfo.isExhausted = true;
            await this.redisClient.set(`${this.REDIS_KEY_PREFIX}${currentKeyIndex}`, JSON.stringify(keyInfo));
      
            // try to find another non-exhausted key
            await this.findAndSetNonExhaustedKey().catch(() => {
                console.error('Failed to find a non-exhausted key after marking the current key as exhausted');
            });
        }
        else{
            // not exhausted, just updating the key info
            await this.redisClient.set(`${this.REDIS_KEY_PREFIX}${currentKeyIndex}`, JSON.stringify(keyInfo));
        }
    }

  
    public async markKeyAsExhausted(): Promise<void> {
        if(!this.initialized){
            await this.initialize();
        }

        const currentKeyIndex = parseInt(await this.redisClient.get(this.REDIS_CURRENT_KEY_INDEX) || '0', 10);
        const keyInfoStr = await this.redisClient.get(`${this.REDIS_KEY_PREFIX}${currentKeyIndex}`);
        
        if(!keyInfoStr){
            console.error(`API key at index ${currentKeyIndex} not found`);
            return;
        }
        
        const keyInfo: ApiKeyInfo = JSON.parse(keyInfoStr);
        console.warn(`Marking API key ${this.maskApiKey(keyInfo.key)} as exhausted due to API error`);
        keyInfo.isExhausted = true;
        keyInfo.lastUsed = Date.now();
        
        // Update the key info
        await this.redisClient.set(`${this.REDIS_KEY_PREFIX}${currentKeyIndex}`, JSON.stringify(keyInfo));
        
        // Try to find another non-exhausted key
        await this.findAndSetNonExhaustedKey().catch(() => {
            console.error('Failed to find a non-exhausted key after marking the current key as exhausted');
        });
    }

    /**
     * Get the status of all API keys
     * @returns {Promise<{ total: number; available: number; exhausted: number }>} The status of all API keys
     */
    public async getKeysStatus(): Promise<{ total: number; available: number; exhausted: number }> {
        if(!this.initialized){
            await this.initialize();
        }

        const keyCount = parseInt(await this.redisClient.get(this.REDIS_KEY_COUNT) || '0', 10);
        let available = 0;
        
        for (let i = 0; i < keyCount; i++) {
            const keyInfoStr = await this.redisClient.get(`${this.REDIS_KEY_PREFIX}${i}`);
            if(!keyInfoStr) continue; // skip if key info not found

            const keyInfo: ApiKeyInfo = JSON.parse(keyInfoStr);
            if(!keyInfo.isExhausted){
                available++;
            }
        }
        
        return {
            total: keyCount,
            available,
            exhausted: keyCount - available
        };
    }


    public async close(): Promise<void> {
        if (this.redisClient.isOpen) {
        await this.redisClient.disconnect();
        console.info('Redis connection closed');
        }
    }


    private maskApiKey(key: string): string {
        if (key.length <= 8) return '****';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    }
}

export const apiKeyService = new ApiKeyManager();
export {ApiKeyManager};