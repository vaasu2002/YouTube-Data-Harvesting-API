import mongoose from 'mongoose';
import { config } from './';

export const connectDatabase = async (): Promise<void> => {
    try{
        await mongoose.connect(config.database.uri);
        console.info('Connected to MongoDB');
    
        mongoose.connection.on('connected', () => {
            console.info('Setting up database indexes');
        });
    }catch(error){
        console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};