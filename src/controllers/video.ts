import { Request, Response } from 'express';
import { videoService } from '../services/video';
import { ErrorResponse, SuccessResponse } from '../utils';

export class VideoController {
    public async getVideos(req: Request, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string || '1', 10);
            const limit = parseInt(req.query.limit as string || '10', 10);
        
            if(page < 1 || limit < 1 || limit > 100){
                const errorResponse = ErrorResponse('Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.');
                res
                    .status(400)
                    .json(errorResponse);
                return;
            }

            const skip = (page - 1) * limit;
            
            const data  = await videoService.getVideos(skip, limit);
            const successResponse = SuccessResponse(data);
            res
                .status(200)
                .json(successResponse);

        } catch (error) {
            console.error('Error fetching videos:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Server error while fetching videos' 
            });
        }
    }

    public async searchVideos(req: Request, res: Response): Promise<void> {
        try {
            const query = req.query.q as string;
            const page = parseInt(req.query.page as string || '1', 10);
            const limit = parseInt(req.query.limit as string || '10', 10);
            
            if(page < 1 || limit < 1 || limit > 100){
                const errorResponse = ErrorResponse('Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.');
                res
                    .status(400)
                    .json(errorResponse);
                return;
            }

            if(!query){
                res.status(400).json({ 
                    success: false, 
                    message: 'Search query is required' 
                });
                return;
            }

            const data = await videoService.searchVideos(query, page, limit);
            const successResponse = SuccessResponse(data);
            res
                .status(200)
                .json(successResponse);

        }catch(error){
            const errorResponse = ErrorResponse('Error searching videos');
            res
                .status(400)
                .json(errorResponse);
        }
    }
}

export const videoController = new VideoController();