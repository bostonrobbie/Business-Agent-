/**
 * UNIVERSAL BUSINESS OPERATING SYSTEM (UBOS)
 *
 * Main entry point for the autonomous business system.
 * Integrates all components: orchestration, agents, intelligence, approvals.
 */

import { getCoordinator } from './orchestration/master_coordinator';
import { getScanner } from './intelligence/opportunity_scanner';
import { getApprovalQueue } from './approval/approval_queue';
import { Action, createApprovalRequest } from './approval/financial_locks';
import { classifyDecision, DecisionClass } from './approval/decision_classifier';
import { TaskPriority, AgentRole } from './orchestration/types';

export class UniversalBusinessOS {
  private coordinator = getCoordinator();
  private scanner = getScanner();
  private approvalQueue = getApprovalQueue();

  /**
   * Initialize the system
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Universal Business OS...\n');

    // Run initial opportunity scan
    console.log('📊 Running initial opportunity scan...');
    const opportunities = await this.scanner.runDailyScan();
    console.log(`✅ Found ${opportunities.length} opportunities\n`);

    // Create initial goal
    const goal = this.coordinator.createGoal(
      'Build Autonomous Business Capability',
      'Establish fully autonomous business operations with AI agents',
      undefined,
      ['System operational 24/7', 'Zero financial violations', 'Generate profitable opportunities']
    );
    console.log(`🎯 Created goal: ${goal.title}\n`);

    // Show system status
    this.showStatus();
  }

  /**
   * Execute an action (with approval checking)
   */
  async executeAction(action: Action): Promise<{ success: boolean; message: string }> {
    // Classify the decision
    const decision = classifyDecision(action);

    if (decision.classification === DecisionClass.BLOCKED) {
      return {
        success: false,
        message: `❌ BLOCKED: ${decision.reason}`
      };
    }

    if (decision.classification === DecisionClass.REQUIRES_APPROVAL) {
      // Create approval request
      const request = createApprovalRequest(
        action,
        decision.reason,
        ['Find alternative approach', 'Defer until later'],
        undefined,
        'medium'
      );

      const queueItem = this.approvalQueue.add(request);

      return {
        success: false,
        message: `⚠️ REQUIRES APPROVAL: ${decision.reason}\nApproval ID: ${queueItem.id}`
      };
    }

    // Action is autonomous - execute it
    return {
      success: true,
      message: `✅ AUTONOMOUS: Executing ${action.description}`
    };
  }

  /**
   * Create and assign a task
   */
  createTask(
    title: string,
    description: string,
    priority: TaskPriority = TaskPriority.MEDIUM
  ): { taskId: string; assigned_to?: AgentRole } {
    const task = this.coordinator.createTask(title, description, priority);
    this.coordinator.assignTask(task.id);

    return {
      taskId: task.id,
      assigned_to: task.assigned_to
    };
  }

  /**
   * Get top business opportunities
   */
  getTopOpportunities(limit: number = 5) {
    return this.scanner.getTopOpportunities(limit);
  }

  /**
   * Show system status
   */
  showStatus(): void {
    const status = this.coordinator.getSystemStatus();
    const approvalStats = this.approvalQueue.getStats();

    console.log('═══════════════════════════════════════════════');
    console.log('         UNIVERSAL BUSINESS OS STATUS          ');
    console.log('═══════════════════════════════════════════════\n');

    console.log('📋 TASKS:');
    console.log(`   Pending: ${status.pending_tasks}`);
    console.log(`   Active: ${status.active_tasks}`);
    console.log(`   Completed: ${status.completed_tasks}`);
    console.log(`   Blocked: ${status.blocked_tasks}\n`);

    console.log('🎯 GOALS:');
    console.log(`   Active: ${status.active_goals}\n`);

    console.log('🤖 AGENTS:');
    console.log(`   Active: ${status.active_agents}/8\n`);

    console.log('⚠️ APPROVALS:');
    console.log(`   Pending: ${approvalStats.pending}`);
    console.log(`   Approved: ${approvalStats.approved}`);
    console.log(`   Denied: ${approvalStats.denied}`);
    console.log(`   Approval Rate: ${approvalStats.approval_rate.toFixed(1)}%\n`);

    console.log('💡 OPPORTUNITIES:');
    const topOpps = this.scanner.getTopOpportunities(3);
    topOpps.forEach(opp => {
      console.log(`   ${opp.confidence_score}% - ${opp.title}`);
    });

    console.log('\n═══════════════════════════════════════════════\n');
  }

  /**
   * Run daily cycle
   */
  async runDailyCycle(): Promise<void> {
    console.log('🌅 Running daily cycle...\n');

    // 1. Scan for new opportunities
    console.log('📊 Scanning for opportunities...');
    await this.scanner.runDailyScan();

    // 2. Review pending tasks
    console.log('📋 Reviewing pending tasks...');
    const pending = this.coordinator.getPendingTasks();
    console.log(`   Found ${pending.length} pending tasks`);

    // 3. Assign unassigned tasks
    pending.forEach(task => {
      if (!task.assigned_to) {
        this.coordinator.assignTask(task.id);
      }
    });

    // 4. Check for blocked tasks
    const blocked = this.coordinator.getSystemStatus().blocked_tasks;
    if (blocked > 0) {
      console.log(`⚠️ WARNING: ${blocked} blocked tasks need attention`);
    }

    // 5. Show status
    this.showStatus();
  }

  /**
   * Get approval queue
   */
  getApprovals() {
    return this.approvalQueue;
  }

  /**
   * Get coordinator
   */
  getCoordinator() {
    return this.coordinator;
  }

  /**
   * Get scanner
   */
  getScanner() {
    return this.scanner;
  }
}

// Export singleton
let _ubos: UniversalBusinessOS | null = null;

export function getUBOS(): UniversalBusinessOS {
  if (!_ubos) {
    _ubos = new UniversalBusinessOS();
  }
  return _ubos;
}

// Export for direct use
export { TaskPriority, AgentRole, DecisionClass };
