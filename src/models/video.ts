import mongoose, { Document, Schema } from 'mongoose';

export interface IVideo extends Document {
    videoId: string;
    title: string;
    description: string;
    publishedAt: Date;
    thumbnails: {
        default?: { url: string; width: number; height: number };
        medium?: { url: string; width: number; height: number };
        high?: { url: string; width: number; height: number };
    };
    channelId: string;
    channelTitle: string;
    createdAt: Date;
    updatedAt: Date;
}

//  for the Video model
const VideoSchema: Schema = new Schema({
    videoId: { 
        type: String, 
        required: true, 
        unique: true, 
        index: true 
    },
    title: { 
        type: String, 
        required: true, 
        index: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    publishedAt: { 
        type: Date, 
        required: true, 
        index: true 
    },
    thumbnails: {
        default: {
            url: String,
            width: Number,
            height: Number
        },
        medium: {
            url: String,
            width: Number,
            height: Number
        },
        high: {
            url: String,
            width: Number,
            height: Number
        }
    },
    channelId: { 
        type: String, 
        required: true 
    },
    channelTitle: { 
        type: String, 
        required: true 
    }
},
{ 
    timestamps: true 
});

VideoSchema.index({ 
    title: 'text', 
    description: 'text' 
    }, 
    {
    weights: {
        title: 10,
        description: 5
    },
    name: 'text_index'
});

VideoSchema.index({ 
    publishedAt: -1 
});

export const Video = mongoose.model<IVideo>('Video', VideoSchema);