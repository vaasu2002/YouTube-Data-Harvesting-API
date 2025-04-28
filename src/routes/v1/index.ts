import Router,{Request,Response} from 'express';
import { SuccessResponse } from '../../utils';

const v1Route = Router();

v1Route.get('/check', (_req: Request, res: Response)=>{
    const response = SuccessResponse('v1 route is live') 
    res.status(200).json(response);
});

export default v1Route;