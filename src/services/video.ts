import { youtube_v3 } from 'googleapis';
import { Video } from '../models/video';

type Meta = {
    page: number;
    limit: number;
    totalPages: number;
    totalVideos: number;
}

type VideoResponse = {
    meta: Meta;
    data: youtube_v3.Schema$Video[];
}


export class VideoService {

    public async getVideos(skip:number,limit:number): Promise<VideoResponse> {
        try{
            const videos = await Video.find()
                .sort({ publishedAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Video.countDocuments();
            return {
                meta: {
                    page: Math.floor(skip / limit) + 1,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    totalVideos: total
                },  
                data: videos
            };
        }catch(error){
            console.error('Error fetching videos:', error);
            throw new Error('Server error while fetching videos');
        }
    }

    public async searchVideos(query: string, page: number, limit: number): Promise<any> {
        try{
            const skip = (page - 1) * limit;

            const searchRegex = new RegExp(query, 'i');
            const videos = await Video.find({
                $or: [
                    { title: searchRegex },
                    { description: searchRegex }
                ]
            }).sort({ publishedAt: -1 }).skip(skip).limit(limit);

            const total = await Video.countDocuments({
                $or: [
                { title: searchRegex },
                { description: searchRegex }
                ]
            });

            return {
                meta: {
                    page: Math.floor(skip / limit) + 1,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    totalVideos: total
                },  
                data: videos
            };
        }catch(error){
            console.error('Error searching videos:', error);
            throw new Error('Server error while searching videos');
        }
    }
}

export const videoService = new VideoService();