import Router from 'express';
import { videoController } from '../../controllers/video';

const vidRouter = Router();

/**
 * @route GET /api/videos
 * @desc Get videos with pagination
 * @access Public
 * @query page - Page number (default: 1)
 * @query limit - Number of videos per page (default: 10)
 */
vidRouter.get('/videos', videoController.getVideos.bind(videoController));

/**
 * @route GET /api/videos/search
 * @desc Search videos by title and description
 * @access Public
 * @query q - Search query
 * @query page - Page number (default: 1)
 * @query limit - Number of videos per page (default: 10)
 */
vidRouter.get('/videos/search', videoController.searchVideos.bind(videoController));

export default vidRouter;