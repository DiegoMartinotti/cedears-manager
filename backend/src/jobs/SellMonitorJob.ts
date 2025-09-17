/* eslint-disable max-lines-per-function */
import cron, { ScheduledTask } from 'node-cron';
import { sellAnalysisService } from '../services/SellAnalysisService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SellMonitorJob');

export class SellMonitorJob {
  private isRunning: boolean = false;
  private lastRunTime: Date | null = null;
  private runCount: number = 0;
  private errorCount: number = 0;
  private successfulRuns: number = 0;
  private scheduledTasks: ScheduledTask[] = [];

  constructor() {
    this.scheduleJobs();
  }

  private scheduleJobs(): void {
    // Main monitoring job - every 5 minutes during market hours
    // Monday to Friday, 9:30 AM to 4:00 PM Argentina time (market hours)
    const monitoringTask = cron.schedule('*/5 9-16 * * 1-5', async () => {
      await this.runSellMonitor();
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    });
    this.scheduledTasks.push(monitoringTask);

    // Cleanup job - daily at 6:00 PM Argentina time
    const cleanupTask = cron.schedule('0 18 * * *', async () => {
      await this.runCleanup();
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    });
    this.scheduledTasks.push(cleanupTask);

    // Weekend preparation job - Friday at 5:00 PM
    const weekendTask = cron.schedule('0 17 * * 5', async () => {
      await this.runWeekendPreparation();
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    });
    this.scheduledTasks.push(weekendTask);

    // Health check job - every hour
    const healthCheckTask = cron.schedule('0 * * * *', () => {
      this.logHealthStatus();
    });
    this.scheduledTasks.push(healthCheckTask);

    logger.info('SellMonitorJob scheduled:');
    logger.info('- Sell monitoring: Every 5 minutes during market hours (Mon-Fri 9:30-16:00 ART)');
    logger.info('- Daily cleanup: 18:00 ART');
    logger.info('- Weekend prep: Friday 17:00 ART');
    logger.info('- Health check: Every hour');
  }

  /**
   * Main sell monitoring job
   */
  private async runSellMonitor(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Sell monitor job already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    this.runCount++;
    const startTime = Date.now();

    try {
      logger.info(`Starting sell monitor job #${this.runCount}`);

      // Check if market is open (additional safety check)
      if (!this.isMarketHours()) {
        logger.info('Market is closed, skipping sell monitor');
        this.isRunning = false;
        return;
      }

      // Analyze all positions
      const analyses = await sellAnalysisService.analyzeAllPositions();
      
      // Count results
      const recommendations = analyses.reduce((acc, analysis) => {
        const rec = analysis.analysis.recommendation;
        acc[rec] = (acc[rec] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalAlerts = analyses.reduce((sum, analysis) => sum + analysis.alerts.length, 0);
      const criticalAlerts = analyses.filter(analysis => 
        analysis.alerts.some(alert => alert.priority === 'CRITICAL')
      ).length;

      const duration = Date.now() - startTime;
      this.lastRunTime = new Date();
      this.successfulRuns++;

      logger.info(`Sell monitor job #${this.runCount} completed in ${duration}ms:`, {
        positions_analyzed: analyses.length,
        recommendations,
        total_alerts: totalAlerts,
        critical_alerts: criticalAlerts,
        duration_ms: duration
      });

      // Log critical alerts separately for visibility
      if (criticalAlerts > 0) {
        logger.warn(`🚨 ${criticalAlerts} positions have CRITICAL alerts - immediate attention required`);
      }

      // Log high-priority recommendations
      const sellRecommendations = analyses.filter(a => 
        ['TAKE_PROFIT_1', 'TAKE_PROFIT_2', 'STOP_LOSS'].includes(a.analysis.recommendation)
      );

      if (sellRecommendations.length > 0) {
        logger.info(`💰 ${sellRecommendations.length} positions have sell recommendations:`, 
          sellRecommendations.map(a => `${a.position.ticker}: ${a.analysis.recommendation}`)
        );
      }

    } catch (error) {
      this.errorCount++;
      logger.error(`Sell monitor job #${this.runCount} failed:`, error);
      
      // If too many consecutive errors, log a warning
      if (this.errorCount > 3 && this.errorCount > this.successfulRuns * 0.5) {
        logger.warn(`High error rate in sell monitor: ${this.errorCount} errors out of ${this.runCount} runs`);
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Daily cleanup job
   */
  private async runCleanup(): Promise<void> {
    try {
      logger.info('Starting daily sell analysis cleanup');
      
      const result = await sellAnalysisService.cleanup();
      
      logger.info('Daily cleanup completed:', result);
    } catch (error) {
      logger.error('Error during daily cleanup:', error);
    }
  }

  /**
   * Weekend preparation job
   */
  private async runWeekendPreparation(): Promise<void> {
    try {
      logger.info('Starting weekend preparation for sell analysis');
      
      // Run final analysis for the week
      const analyses = await sellAnalysisService.analyzeAllPositions();
      
      // Generate weekend summary
      const sellRecommendations = analyses.filter(a => 
        a.analysis.recommendation !== 'HOLD'
      ).length;

      const criticalPositions = analyses.filter(a => 
        a.analysis.risk_level === 'CRITICAL'
      ).length;

      const avgScore = analyses.length > 0 
        ? analyses.reduce((sum, a) => sum + a.analysis.sell_score, 0) / analyses.length 
        : 0;

      logger.info('Weekend summary generated:', {
        total_positions: analyses.length,
        sell_recommendations: sellRecommendations,
        critical_positions: criticalPositions,
        avg_sell_score: Math.round(avgScore * 100) / 100,
        next_analysis: 'Monday 9:30 AM ART'
      });

    } catch (error) {
      logger.error('Error during weekend preparation:', error);
    }
  }

  /**
   * Check if current time is during market hours
   */
  private isMarketHours(): boolean {
    const now = new Date();
    const argTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
    
    const hour = argTime.getHours();
    const minute = argTime.getMinutes();
    const day = argTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Check if it's a weekday (Monday = 1 to Friday = 5)
    if (day < 1 || day > 5) {
      return false;
    }
    
    // Check if it's during market hours (9:30 AM to 4:00 PM)
    const currentMinutes = hour * 60 + minute;
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    return currentMinutes >= marketOpen && currentMinutes <= marketClose;
  }

  /**
   * Manual trigger for immediate analysis
   */
  async triggerManualRun(): Promise<{
    success: boolean;
    message: string;
    results?: any;
  }> {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Sell monitor job is already running'
      };
    }

    try {
      logger.info('Manual sell analysis triggered');
      await this.runSellMonitor();
      
      return {
        success: true,
        message: 'Manual sell analysis completed successfully',
        results: {
          run_count: this.runCount,
          last_run: this.lastRunTime,
          is_market_hours: this.isMarketHours()
        }
      };
    } catch (error) {
      logger.error('Manual sell analysis failed:', error);
      return {
        success: false,
        message: `Manual analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get job status and statistics
   */
  getJobStatus(): {
    is_running: boolean;
    last_run_time: Date | null;
    total_runs: number;
    successful_runs: number;
    error_count: number;
    success_rate: number;
    is_market_hours: boolean;
    next_scheduled_run: string;
  } {
    const successRate = this.runCount > 0 ? (this.successfulRuns / this.runCount) * 100 : 0;
    
    // Calculate next scheduled run (next 5-minute interval during market hours)
    const now = new Date();
    const argTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
    const nextRun = new Date(argTime);
    
    if (this.isMarketHours()) {
      // Next 5-minute interval
      const minutes = nextRun.getMinutes();
      const roundedMinutes = Math.ceil(minutes / 5) * 5;
      nextRun.setMinutes(roundedMinutes, 0, 0);
    } else {
      // Next market open (9:30 AM next business day)
      const day = nextRun.getDay();
      if (day === 5) { // Friday
        nextRun.setDate(nextRun.getDate() + 3); // Monday
      } else if (day === 6) { // Saturday
        nextRun.setDate(nextRun.getDate() + 2); // Monday
      } else if (day === 0) { // Sunday
        nextRun.setDate(nextRun.getDate() + 1); // Monday
      } else {
        nextRun.setDate(nextRun.getDate() + 1); // Next day
      }
      nextRun.setHours(9, 30, 0, 0);
    }

    return {
      is_running: this.isRunning,
      last_run_time: this.lastRunTime,
      total_runs: this.runCount,
      successful_runs: this.successfulRuns,
      error_count: this.errorCount,
      success_rate: Math.round(successRate * 100) / 100,
      is_market_hours: this.isMarketHours(),
      next_scheduled_run: nextRun.toISOString()
    };
  }

  /**
   * Log health status
   */
  private logHealthStatus(): void {
    const status = this.getJobStatus();
    
    if (status.error_count > 0 && status.success_rate < 80) {
      logger.warn('SellMonitorJob health check - HIGH ERROR RATE:', status);
    } else if (status.total_runs > 0) {
      logger.info('SellMonitorJob health check - OK:', {
        total_runs: status.total_runs,
        success_rate: status.success_rate,
        last_run: status.last_run_time,
        market_hours: status.is_market_hours
      });
    } else {
      logger.info('SellMonitorJob health check - NO RUNS YET:', status);
    }
  }

  /**
   * Stop all scheduled jobs (for testing or shutdown)
   */
  stopJobs(): void {
    for (const task of this.scheduledTasks) {
      task.stop();
    }
    this.scheduledTasks = [];
    logger.info('SellMonitorJob stopped');
  }
}

// Create and export singleton instance
export const sellMonitorJob = new SellMonitorJob();