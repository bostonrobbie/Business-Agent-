/**
 * APPROVAL QUEUE
 *
 * Manages pending approval requests from Rob.
 * Tracks status, sends notifications, handles responses.
 */

import { ApprovalRequest, formatApprovalRequest } from './financial_locks';
import * as fs from 'fs';
import * as path from 'path';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  EXPIRED = 'EXPIRED'
}

export interface ApprovalQueueItem {
  id: string;
  request: ApprovalRequest;
  status: ApprovalStatus;
  submitted_at: Date;
  responded_at?: Date;
  response_notes?: string;
  telegram_message_id?: number;
}

export class ApprovalQueue {
  private queue: ApprovalQueueItem[] = [];
  private queueFile: string;

  constructor(dataDir: string = './data') {
    this.queueFile = path.join(dataDir, 'approval_queue.json');
    this.load();
  }

  /**
   * Add approval request to queue
   */
  add(request: ApprovalRequest): ApprovalQueueItem {
    const item: ApprovalQueueItem = {
      id: this.generateId(),
      request,
      status: ApprovalStatus.PENDING,
      submitted_at: new Date()
    };

    this.queue.push(item);
    this.save();

    return item;
  }

  /**
   * Get pending approvals
   */
  getPending(): ApprovalQueueItem[] {
    return this.queue.filter(item => item.status === ApprovalStatus.PENDING);
  }

  /**
   * Get all approvals
   */
  getAll(): ApprovalQueueItem[] {
    return [...this.queue];
  }

  /**
   * Get specific approval by ID
   */
  getById(id: string): ApprovalQueueItem | undefined {
    return this.queue.find(item => item.id === id);
  }

  /**
   * Approve request
   */
  approve(id: string, notes?: string): boolean {
    const item = this.getById(id);
    if (!item) return false;

    item.status = ApprovalStatus.APPROVED;
    item.responded_at = new Date();
    item.response_notes = notes;

    this.save();
    return true;
  }

  /**
   * Deny request
   */
  deny(id: string, notes?: string): boolean {
    const item = this.getById(id);
    if (!item) return false;

    item.status = ApprovalStatus.DENIED;
    item.responded_at = new Date();
    item.response_notes = notes;

    this.save();
    return true;
  }

  /**
   * Mark as expired (e.g., after 7 days)
   */
  expire(id: string): boolean {
    const item = this.getById(id);
    if (!item) return false;

    item.status = ApprovalStatus.EXPIRED;
    item.responded_at = new Date();

    this.save();
    return true;
  }

  /**
   * Clean up old approvals (>30 days)
   */
  cleanup(): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const beforeCount = this.queue.length;

    this.queue = this.queue.filter(item => {
      const itemDate = new Date(item.submitted_at);
      return itemDate > thirtyDaysAgo;
    });

    const removedCount = beforeCount - this.queue.length;

    if (removedCount > 0) {
      this.save();
    }

    return removedCount;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    pending: number;
    approved: number;
    denied: number;
    expired: number;
    approval_rate: number;
  } {
    const total = this.queue.length;
    const pending = this.queue.filter(i => i.status === ApprovalStatus.PENDING).length;
    const approved = this.queue.filter(i => i.status === ApprovalStatus.APPROVED).length;
    const denied = this.queue.filter(i => i.status === ApprovalStatus.DENIED).length;
    const expired = this.queue.filter(i => i.status === ApprovalStatus.EXPIRED).length;

    const resolved = approved + denied;
    const approval_rate = resolved > 0 ? (approved / resolved) * 100 : 0;

    return {
      total,
      pending,
      approved,
      denied,
      expired,
      approval_rate
    };
  }

  /**
   * Format approval for Telegram notification
   */
  formatForTelegram(item: ApprovalQueueItem): string {
    let message = formatApprovalRequest(item.request);
    message += `\n\nApproval ID: ${item.id}`;
    return message;
  }

  /**
   * Save queue to disk
   */
  private save(): void {
    try {
      const dir = path.dirname(this.queueFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.queueFile, JSON.stringify(this.queue, null, 2));
    } catch (error) {
      console.error('Failed to save approval queue:', error);
    }
  }

  /**
   * Load queue from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.queueFile)) {
        const data = fs.readFileSync(this.queueFile, 'utf-8');
        this.queue = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load approval queue:', error);
      this.queue = [];
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `approval_${timestamp}_${random}`;
  }
}

// Singleton instance
let _approvalQueue: ApprovalQueue | null = null;

export function getApprovalQueue(): ApprovalQueue {
  if (!_approvalQueue) {
    _approvalQueue = new ApprovalQueue();
  }
  return _approvalQueue;
}
