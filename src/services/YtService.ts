import { google, youtube_v3 } from 'googleapis';
import { config } from '../config';
import { Video } from '../models/video';
import { apiKeyService } from './ApiKeyManager';

export class YtService {
    private youtube: youtube_v3.Youtube | null = null;
    private latestPublishedAt: Date | null = null;
    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        const apiKey = await apiKeyService.getCurrentKey();
        if(!apiKey){
            this.youtube = null;
            console.error('No YouTube API key available');
            return;
        }
        this.youtube = google.youtube({
            version: 'v3',
            auth: apiKey
        });
    }

    private reinitializeWithNewKey(): void {
        this.initialize();
        if(!this.youtube){
            console.error('Failed to reinitialize YouTube API with a new key');
            return;
        }
    }

    private async getLatestPublishedDate(): Promise<Date> {
        try {
            const latestVideo = await Video.findOne().sort({ publishedAt: -1 }).limit(1);

            if(latestVideo){
                return latestVideo.publishedAt;
            }
            return null;
        }catch(error){
            console.error('Error getting latest published date:', error);
            return null;
        }
    }

    public async fetchLatestVideos(): Promise<void> {
        if(!this.youtube){
            this.initialize();
            if(!this.youtube){
                console.error('YouTube service cannot be not initialized');
                return;
            }
        }

        try{
            const costOfOperation = 100;
            if(!this.latestPublishedAt){
                this.latestPublishedAt = await this.getLatestPublishedDate();
            }
            
            const publishedAfter = this.latestPublishedAt.toISOString();


            // if this fails, it means that quota is less than opearation cost(i.e. <100)
            // handleYoutubeApiError() in catch block will handle new key initialization
            const response = await this.youtube.search.list({
                part: ['snippet'],
                q: config.youtube.searchQuery,
                type: ['video'],
                order: 'date',
                publishedAfter,
                maxResults: config.youtube.maxResults
            });

            apiKeyService.UpdateIfQuotaReachedMarkAsUsed(costOfOperation);

            if(!response.data.items || response.data.items.length === 0){
                console.info('No new videos found');
                return;
            }

            // Process and save the videos
            await this.processAndSaveVideos(response.data.items);

            // Update the latest published date
            this.updateLatestPublishedDate(response.data.items);

            console.info(`Fetched and processed ${response.data.items.length} videos`);
        }catch (error: any) {
            console.error('Error fetching videos from YouTube API:', error);
            this.handleYoutubeApiError(error);
        }
    }

    private async processAndSaveVideos(items: youtube_v3.Schema$SearchResult[]): Promise<void> {
        const videosToSave = items
        .filter(item => 
            item.id?.videoId && 
            item.snippet?.publishedAt &&
            item.snippet?.title &&
            item.snippet?.description
        )
        .map(item => ({
            videoId: item.id!.videoId!,
            title: item.snippet!.title!,
            description: item.snippet!.description!,
            publishedAt: new Date(item.snippet!.publishedAt!),
            thumbnails: {
            default: item.snippet!.thumbnails?.default ? {
                url: item.snippet!.thumbnails.default.url!,
                width: item.snippet!.thumbnails.default.width || 120,
                height: item.snippet!.thumbnails.default.height || 90
            } : undefined,
            medium: item.snippet!.thumbnails?.medium ? {
                url: item.snippet!.thumbnails.medium.url!,
                width: item.snippet!.thumbnails.medium.width || 320,
                height: item.snippet!.thumbnails.medium.height || 180
            } : undefined,
            high: item.snippet!.thumbnails?.high ? {
                url: item.snippet!.thumbnails.high.url!,
                width: item.snippet!.thumbnails.high.width || 480,
                height: item.snippet!.thumbnails.high.height || 360
            } : undefined
            },
            channelId: item.snippet!.channelId!,
            channelTitle: item.snippet!.channelTitle!
        }));

        // Use bulk operations for better performance
        const bulkOps = videosToSave.map(video => ({
        updateOne: {
            filter: { videoId: video.videoId },
            update: { $set: video },
            upsert: true
        }
        }));

        if(bulkOps.length > 0){
            try {
                await Video.bulkWrite(bulkOps);
            }catch(error){
                console.error('Error saving videos to database:', error);
            }
        }
    }

    private updateLatestPublishedDate(items: youtube_v3.Schema$SearchResult[]): void {
        // Find the most recent publishedAt date from the fetched videos
        let mostRecent: Date | null = null;

        for (const item of items) {
        if (item.snippet?.publishedAt) {
            const publishedAt = new Date(item.snippet.publishedAt);
            if (!mostRecent || publishedAt > mostRecent) {
            mostRecent = publishedAt;
            }
        }
        }

        if (mostRecent && (!this.latestPublishedAt || mostRecent > this.latestPublishedAt)) {
        this.latestPublishedAt = mostRecent;
        }
    }

    private handleYoutubeApiError(error: any): void {
        console.error('YouTube API error:', error);

        if( error.code === 403 ||
           (error.response && error.response.status === 403) ||
           (error.message && error.message.includes('quota'))){
            
            console.warn('YouTube API quota exceeded');
        
            apiKeyService.markKeyAsExhausted();
        
            this.reinitializeWithNewKey();
        }
    }

    public async getApiKeysStatus(): Promise<{ total: number; available: number; exhausted: number }> {
        return await apiKeyService.getKeysStatus();
    }
}

export const ytService = new YtService();