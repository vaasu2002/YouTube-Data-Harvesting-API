import express from 'express';
import cors from 'cors';
import { config,connectDatabase } from './config';
import apiRoute from './routes';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api',apiRoute);

const initServer = async () => {
    try{
        const PORT = config.server.port;
        app.listen(PORT, () => {
            console.info(`Server running on port ${PORT}.`);
        });
        await connectDatabase();
    }catch(error){
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

initServer();