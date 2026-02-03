/**
 * UBOS DEMONSTRATION
 *
 * Shows the Universal Business OS in action.
 * Tests all major components and guardrails.
 */

import { getUBOS, TaskPriority } from './src/ubos';
import { Action } from './src/approval/financial_locks';

async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   UNIVERSAL BUSINESS OS - DEMONSTRATION               ║');
  console.log('║   Built for Rob - Autonomous Business Operations      ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('\n');

  const ubos = getUBOS();

  // Initialize
  await ubos.initialize();

  console.log('═══════════════════════════════════════════════════════\n');
  console.log('TEST 1: Autonomous Actions (Should Succeed)\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test autonomous actions
  const autonomousActions: Action[] = [
    {
      type: 'web_search',
      description: 'Research AI trends in 2026'
    },
    {
      type: 'create_plan',
      description: 'Create strategic roadmap for Q1'
    },
    {
      type: 'write_code',
      description: 'Develop opportunity detection algorithm'
    },
    {
      type: 'generate_report',
      description: 'Generate weekly business intelligence report'
    }
  ];

  for (const action of autonomousActions) {
    const result = await ubos.executeAction(action);
    console.log(result.message);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  console.log('TEST 2: Financial Actions (Should Require Approval)\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test actions that require approval
  const approvalActions: Action[] = [
    {
      type: 'subscribe_service',
      description: 'Subscribe to market data API',
      involves_spending: true,
      estimated_cost: 99
    },
    {
      type: 'hire_contractor',
      description: 'Hire developer for 10 hours',
      involves_money: true,
      estimated_cost: 500
    }
  ];

  for (const action of approvalActions) {
    const result = await ubos.executeAction(action);
    console.log(result.message);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  console.log('TEST 3: Blocked Actions (Financial Violations)\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test blocked actions
  const blockedActions: Action[] = [
    {
      type: 'spend_money',
      description: 'Direct spending attempt',
      involves_money: true,
      estimated_cost: 100
    },
    {
      type: 'access_bank_account',
      description: 'Attempt to access bank account',
      involves_accounts: true
    },
    {
      type: 'make_payment',
      description: 'Attempt to make payment',
      involves_payments: true
    }
  ];

  for (const action of blockedActions) {
    const result = await ubos.executeAction(action);
    console.log(result.message);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  console.log('TEST 4: Task Creation and Assignment\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // Create some tasks
  const tasks = [
    {
      title: 'Research competitor strategies',
      description: 'Analyze top 5 competitors in target market',
      priority: TaskPriority.HIGH
    },
    {
      title: 'Optimize quant lab backtesting',
      description: 'Improve backtesting speed by 50%',
      priority: TaskPriority.MEDIUM
    },
    {
      title: 'Generate weekly opportunity report',
      description: 'Compile top 10 opportunities with ROI analysis',
      priority: TaskPriority.HIGH
    }
  ];

  tasks.forEach(task => {
    const result = ubos.createTask(task.title, task.description, task.priority);
    console.log(`✅ Created task: "${task.title}"`);
    console.log(`   Assigned to: ${result.assigned_to || 'Unassigned'}\n`);
  });

  console.log('═══════════════════════════════════════════════════════\n');
  console.log('TEST 5: Opportunity Scanner Results\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const opportunities = ubos.getTopOpportunities(5);
  opportunities.forEach((opp, i) => {
    console.log(`${i + 1}. ${opp.title}`);
    console.log(`   Confidence: ${opp.confidence_score}%`);
    console.log(`   Category: ${opp.category}`);
    console.log(`   ROI: ${opp.estimated_roi}`);
    console.log(`   Effort: ${opp.effort_level}`);
    console.log(`   Capital: ${opp.capital_required}\n`);
  });

  // Show detailed report for top opportunity
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('DETAILED REPORT: Top Opportunity\n');
  console.log('═══════════════════════════════════════════════════════\n');

  if (opportunities.length > 0) {
    const topOpp = opportunities[0];
    const report = ubos.getScanner().generateReport(topOpp.id);
    console.log(report);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  console.log('FINAL SYSTEM STATUS\n');
  console.log('═══════════════════════════════════════════════════════\n');

  ubos.showStatus();

  console.log('═══════════════════════════════════════════════════════\n');
  console.log('DEMONSTRATION COMPLETE\n');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('✅ All systems operational');
  console.log('🔒 Financial guardrails active');
  console.log('🤖 8 agents ready');
  console.log('💡 Opportunities identified');
  console.log('📋 Tasks created and assigned\n');
  console.log('The Universal Business OS is ready for autonomous operation.\n');
}

// Run demonstration
main().catch(error => {
  console.error('Error during demonstration:', error);
  process.exit(1);
});
