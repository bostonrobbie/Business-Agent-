/**
 * DAILY SCHEDULER
 *
 * Automates daily operations for UBOS
 * Runs opportunity scans, reviews tasks, sends reports
 */

import { getUBOS } from '../ubos';
import * as cron from 'node-cron';
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = '7509919329:AAEm5g4H7YYiUTkrQiRNdoJmMgM4PW5M4gA';
const TELEGRAM_CHAT_ID = '5791597360';

export class DailyScheduler {
  private ubos = getUBOS();
  private tasks: cron.ScheduledTask[] = [];

  /**
   * Start all scheduled tasks
   */
  start(): void {
    console.log('🕐 Starting UBOS Daily Scheduler...\n');

    // Morning routine - 7:00 AM
    const morningTask = cron.schedule('0 7 * * *', async () => {
      await this.runMorningRoutine();
    });
    this.tasks.push(morningTask);
    console.log('✅ Scheduled: Morning routine at 7:00 AM');

    // Opportunity scan - 9:00 AM, 2:00 PM, 7:00 PM
    const scanTask = cron.schedule('0 9,14,19 * * *', async () => {
      await this.runOpportunityScan();
    });
    this.tasks.push(scanTask);
    console.log('✅ Scheduled: Opportunity scans at 9:00 AM, 2:00 PM, 7:00 PM');

    // Progress check - Every 4 hours
    const progressTask = cron.schedule('0 */4 * * *', async () => {
      await this.checkProgress();
    });
    this.tasks.push(progressTask);
    console.log('✅ Scheduled: Progress checks every 4 hours');

    // Evening summary - 9:00 PM
    const eveningTask = cron.schedule('0 21 * * *', async () => {
      await this.runEveningSummary();
    });
    this.tasks.push(eveningTask);
    console.log('✅ Scheduled: Evening summary at 9:00 PM');

    // Weekly review - Sunday 10:00 AM
    const weeklyTask = cron.schedule('0 10 * * 0', async () => {
      await this.runWeeklyReview();
    });
    this.tasks.push(weeklyTask);
    console.log('✅ Scheduled: Weekly review on Sundays at 10:00 AM');

    console.log('\n🚀 All schedules active. UBOS running autonomously.\n');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    console.log('⏹️ Daily scheduler stopped');
  }

  /**
   * Morning routine - 7:00 AM
   */
  private async runMorningRoutine(): Promise<void> {
    console.log('\n🌅 Running morning routine...\n');

    try {
      // 1. System status
      const status = this.ubos.getCoordinator().getSystemStatus();

      // 2. Get top opportunities
      const opportunities = this.ubos.getTopOpportunities(3);

      // 3. Build message
      let message = '🌅 GOOD MORNING - Daily UBOS Report\n\n';
      message += '📊 SYSTEM STATUS:\n';
      message += `- Active Tasks: ${status.active_tasks}\n`;
      message += `- Pending Tasks: ${status.pending_tasks}\n`;
      message += `- Pending Approvals: ${status.pending_approvals}\n\n`;

      message += '💡 TOP OPPORTUNITIES:\n';
      opportunities.forEach((opp, i) => {
        message += `${i + 1}. ${opp.title} (${opp.confidence_score}%)\n`;
        message += `   ROI: ${opp.estimated_roi}\n`;
      });

      message += '\n🤖 UBOS is working autonomously today.';

      // Send to Telegram
      await this.sendTelegram(message);

      console.log('✅ Morning routine completed\n');
    } catch (error) {
      console.error('❌ Morning routine failed:', error);
    }
  }

  /**
   * Opportunity scan
   */
  private async runOpportunityScan(): Promise<void> {
    console.log('\n📊 Running opportunity scan...\n');

    try {
      const scanner = this.ubos.getScanner();
      const opportunities = await scanner.runDailyScan();

      // Only notify if high-confidence opportunities found
      const highConfidence = opportunities.filter(o => o.confidence_score >= 80);

      if (highConfidence.length > 0) {
        let message = '💡 NEW HIGH-CONFIDENCE OPPORTUNITIES\n\n';
        highConfidence.slice(0, 3).forEach((opp, i) => {
          message += `${i + 1}. ${opp.title}\n`;
          message += `   Confidence: ${opp.confidence_score}%\n`;
          message += `   ROI: ${opp.estimated_roi}\n`;
          message += `   Effort: ${opp.effort_level}\n\n`;
        });

        message += 'Reply "details [number]" for full report.';

        await this.sendTelegram(message);
      }

      console.log(`✅ Scan complete. Found ${opportunities.length} opportunities\n`);
    } catch (error) {
      console.error('❌ Opportunity scan failed:', error);
    }
  }

  /**
   * Progress check
   */
  private async checkProgress(): Promise<void> {
    console.log('\n⏳ Checking progress...\n');

    try {
      const status = this.ubos.getCoordinator().getSystemStatus();

      // Alert if tasks are blocked
      if (status.blocked_tasks > 0) {
        const message = `⚠️ ALERT: ${status.blocked_tasks} task(s) blocked and need attention.`;
        await this.sendTelegram(message);
      }

      // Alert if approvals are pending
      if (status.pending_approvals > 0) {
        const message = `⚠️ ${status.pending_approvals} approval(s) pending. System waiting for your decision.`;
        await this.sendTelegram(message);
      }

      console.log('✅ Progress check completed\n');
    } catch (error) {
      console.error('❌ Progress check failed:', error);
    }
  }

  /**
   * Evening summary - 9:00 PM
   */
  private async runEveningSummary(): Promise<void> {
    console.log('\n🌙 Running evening summary...\n');

    try {
      const status = this.ubos.getCoordinator().getSystemStatus();

      let message = '🌙 EVENING SUMMARY\n\n';
      message += '📊 TODAY\'S ACTIVITY:\n';
      message += `- Tasks Completed: ${status.completed_tasks}\n`;
      message += `- Tasks In Progress: ${status.active_tasks}\n`;
      message += `- Tasks Pending: ${status.pending_tasks}\n\n`;

      if (status.blocked_tasks > 0) {
        message += `⚠️ ${status.blocked_tasks} task(s) blocked\n\n`;
      }

      message += '🤖 UBOS will continue working overnight.\n';
      message += 'Next update: Tomorrow morning at 7:00 AM';

      await this.sendTelegram(message);

      console.log('✅ Evening summary sent\n');
    } catch (error) {
      console.error('❌ Evening summary failed:', error);
    }
  }

  /**
   * Weekly review - Sunday 10:00 AM
   */
  private async runWeeklyReview(): Promise<void> {
    console.log('\n📅 Running weekly review...\n');

    try {
      const status = this.ubos.getCoordinator().getSystemStatus();
      const approvalStats = this.ubos.getApprovals().getStats();

      let message = '📅 WEEKLY REVIEW\n\n';
      message += '📊 THIS WEEK:\n';
      message += `- Tasks Completed: ${status.completed_tasks}\n`;
      message += `- Approval Rate: ${approvalStats.approval_rate.toFixed(1)}%\n`;
      message += `- Active Goals: ${status.active_goals}\n\n`;

      message += '💡 OPPORTUNITIES IDENTIFIED:\n';
      const opportunities = this.ubos.getScanner().getAll();
      const thisWeek = opportunities.filter(o => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(o.discovered_at) > weekAgo;
      });
      message += `- New this week: ${thisWeek.length}\n`;
      message += `- High confidence: ${thisWeek.filter(o => o.confidence_score >= 80).length}\n\n`;

      message += '🎯 NEXT WEEK:\n';
      message += 'UBOS will continue autonomous operations.\n';
      message += 'Focus: Opportunity execution & optimization.';

      await this.sendTelegram(message);

      console.log('✅ Weekly review sent\n');
    } catch (error) {
      console.error('❌ Weekly review failed:', error);
    }
  }

  /**
   * Send Telegram notification
   */
  private async sendTelegram(message: string): Promise<void> {
    try {
      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: TELEGRAM_CHAT_ID,
          text: message
        }
      );
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
    }
  }

  /**
   * Send immediate alert
   */
  async sendAlert(message: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    const icon = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨'
    };

    await this.sendTelegram(`${icon[priority]} ${message}`);
  }
}

// Export singleton
let _scheduler: DailyScheduler | null = null;

export function getScheduler(): DailyScheduler {
  if (!_scheduler) {
    _scheduler = new DailyScheduler();
  }
  return _scheduler;
}
