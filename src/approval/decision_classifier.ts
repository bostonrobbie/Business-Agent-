/**
 * DECISION CLASSIFIER
 *
 * Determines whether an action can be executed autonomously
 * or requires human approval.
 */

import { Action, requiresApproval, checkFinancialLock } from './financial_locks';

export enum DecisionClass {
  AUTONOMOUS = 'AUTONOMOUS',        // Can execute immediately
  REQUIRES_APPROVAL = 'REQUIRES_APPROVAL',  // Need Rob's OK
  BLOCKED = 'BLOCKED'              // Permanently blocked
}

export interface DecisionResult {
  classification: DecisionClass;
  reason: string;
  can_proceed: boolean;
}

/**
 * Classify a decision/action
 */
export function classifyDecision(action: Action): DecisionResult {
  // First, check if it violates financial locks
  try {
    checkFinancialLock(action);
  } catch (error) {
    // Financial lock violation = BLOCKED
    return {
      classification: DecisionClass.BLOCKED,
      reason: (error as Error).message,
      can_proceed: false
    };
  }

  // Check if it requires approval (non-blocking)
  if (requiresApproval(action)) {
    return {
      classification: DecisionClass.REQUIRES_APPROVAL,
      reason: action.is_major_pivot
        ? 'Major strategic pivot requires approval'
        : 'Financial decision requires approval',
      can_proceed: false
    };
  }

  // Everything else is autonomous
  return {
    classification: DecisionClass.AUTONOMOUS,
    reason: 'Action is within autonomous boundaries',
    can_proceed: true
  };
}

/**
 * Examples of autonomous actions (no approval needed)
 */
export const AUTONOMOUS_ACTIONS = {
  // Research
  research: [
    'web_search',
    'read_article',
    'analyze_data',
    'gather_information',
    'create_report'
  ],

  // Planning
  planning: [
    'create_plan',
    'design_architecture',
    'outline_strategy',
    'define_roadmap',
    'prioritize_tasks'
  ],

  // Development
  development: [
    'write_code',
    'run_tests',
    'debug',
    'refactor',
    'optimize'
  ],

  // Analysis
  analysis: [
    'analyze_performance',
    'calculate_metrics',
    'identify_patterns',
    'generate_insights',
    'create_visualization'
  ],

  // Communication
  communication: [
    'send_update',
    'write_report',
    'notify_status',
    'answer_question',
    'provide_recommendation'
  ],

  // Operations
  operations: [
    'schedule_task',
    'assign_agent',
    'track_progress',
    'update_dashboard',
    'log_activity'
  ]
};

/**
 * Check if action type is known to be autonomous
 */
export function isKnownAutonomousAction(actionType: string): boolean {
  for (const category of Object.values(AUTONOMOUS_ACTIONS)) {
    if (category.includes(actionType)) {
      return true;
    }
  }
  return false;
}

/**
 * Get decision guidance for common scenarios
 */
export function getDecisionGuidance(scenario: string): string {
  const guidance: Record<string, string> = {
    'research_market': 'AUTONOMOUS - Research any market or technology',
    'analyze_opportunity': 'AUTONOMOUS - Analyze business opportunities',
    'create_plan': 'AUTONOMOUS - Create strategic plans',
    'write_code': 'AUTONOMOUS - Develop software solutions',
    'test_system': 'AUTONOMOUS - Test and validate systems',
    'optimize_process': 'AUTONOMOUS - Improve operational efficiency',
    'generate_report': 'AUTONOMOUS - Create reports and analyses',

    'buy_software': 'REQUIRES_APPROVAL - Any purchase needs approval',
    'subscribe_service': 'REQUIRES_APPROVAL - Subscriptions need approval',
    'hire_contractor': 'REQUIRES_APPROVAL - Hiring needs approval',
    'pivot_strategy': 'REQUIRES_APPROVAL - Major pivots need approval',
    'external_partnership': 'REQUIRES_APPROVAL - Partnerships need approval',

    'access_bank': 'BLOCKED - Financial system access blocked',
    'make_payment': 'BLOCKED - Direct payments blocked',
    'spend_money': 'BLOCKED - Spending blocked without approval'
  };

  return guidance[scenario] || 'UNKNOWN - Analyze specific action';
}
