import { activityLog } from './activity-log.service';
import logger from '../utils/logger';

const RETENTION_DAYS = 30;
const INTERVAL_MS = 24 * 60 * 60 * 1000;

function runCleanup(): void {
  try {
    const result = activityLog.deleteOlderThan(RETENTION_DAYS);
    logger.info(`[cleanup] deleted ${result.rows} SQLite rows, ${result.files} log files`);
  } catch (err) {
    logger.error('[cleanup] failed', { error: (err as Error).message });
  }
}

export function startCleanupCron(): void {
  runCleanup();
  setInterval(runCleanup, INTERVAL_MS);
}
