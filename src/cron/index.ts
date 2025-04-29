import cron from 'node-cron';
import { config } from '../config';
import { ytService } from '../services/YtService';

const intervalToSeconds = Math.max(Math.floor(config.youtube.fetchInterval / 1000), 10);
const cronExpression = `*/${intervalToSeconds} * * * * *`; // Run every _ seconds

export class FetchVideosCron {
    private task: cron.ScheduledTask | null = null;
    private isRunning = false;

    public start(): void {
        this.task = cron.schedule(cronExpression, () => this.runFetch());
        console.info(`Scheduled video fetch task to run every ${intervalToSeconds} seconds`);

        this.runFetch();
    }

    public stop(): void {
        if (this.task){
            this.task.stop();
            console.info('Stopped video fetch task');
        }
    }

    private async runFetch(): Promise<void> {
        if(this.isRunning){
            console.info('Skipping fetch task as the previous one is still running');
            return;
        }

        this.isRunning = true;
        console.info('Starting video fetch task');

        try {
            await ytService.fetchLatestVideos();
        } catch (error) {
            console.error('Error in fetch task:', error);
        } finally {
            this.isRunning = false;
        }
    }
}

export const fetchVideosCron = new FetchVideosCron();