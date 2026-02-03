/**
 * FINANCIAL LOCKS - CRITICAL SECURITY
 *
 * This module prevents ANY unauthorized financial actions.
 * Violation = immediate system shutdown.
 *
 * RULE: System can ANALYZE finances but NEVER TOUCH money.
 */

export interface Action {
  type: string;
  description: string;
  involves_money?: boolean;
  involves_spending?: boolean;
  involves_accounts?: boolean;
  involves_payments?: boolean;
  is_major_pivot?: boolean;
  estimated_cost?: number;
}

export interface ApprovalRequest {
  action: Action;
  reason: string;
  alternatives_considered: string[];
  expected_roi?: string;
  urgency: 'low' | 'medium' | 'high';
  requested_at: Date;
}

// Actions that are PERMANENTLY BLOCKED without approval
const FINANCIAL_ACTIONS = [
  'spend_money',
  'make_payment',
  'transfer_funds',
  'access_bank_account',
  'access_credit_card',
  'access_trading_account',
  'place_order',
  'make_purchase',
  'subscribe_to_service',
  'pay_invoice',
  'authorize_payment',
  'setup_subscription',
  'enter_payment_info',
  'access_paypal',
  'access_stripe',
  'access_wallet',
  'withdraw_funds',
  'deposit_funds',
  'apply_for_credit',
  'take_loan',
  'make_investment'
];

/**
 * Check if action violates financial locks
 * @throws Error if financial action detected without approval
 */
export function checkFinancialLock(action: Action): void {
  // Check explicit financial action types
  if (FINANCIAL_ACTIONS.includes(action.type)) {
    throw new Error(
      `FINANCIAL_LOCK_VIOLATION: Action "${action.type}" is blocked. ` +
      `All financial actions require explicit approval from Rob.`
    );
  }

  // Check financial flags
  if (action.involves_money ||
      action.involves_spending ||
      action.involves_accounts ||
      action.involves_payments) {
    throw new Error(
      `FINANCIAL_LOCK_VIOLATION: Action "${action.description}" involves finances. ` +
      `BLOCKED: Requires approval from Rob.`
    );
  }

  // Check cost
  if (action.estimated_cost && action.estimated_cost > 0) {
    throw new Error(
      `FINANCIAL_LOCK_VIOLATION: Action "${action.description}" has cost $${action.estimated_cost}. ` +
      `BLOCKED: Any spending requires approval.`
    );
  }
}

/**
 * Determine if action requires approval (but not blocked)
 */
export function requiresApproval(action: Action): boolean {
  // ANY financial action = approval required
  if (action.involves_money ||
      action.involves_spending ||
      action.involves_accounts ||
      action.involves_payments ||
      (action.estimated_cost && action.estimated_cost > 0)) {
    return true;
  }

  // Major strategic changes
  if (action.is_major_pivot) {
    return true;
  }

  // Everything else is autonomous
  return false;
}

/**
 * Create approval request for Rob
 */
export function createApprovalRequest(
  action: Action,
  reason: string,
  alternatives: string[],
  expectedROI?: string,
  urgency: 'low' | 'medium' | 'high' = 'medium'
): ApprovalRequest {
  return {
    action,
    reason,
    alternatives_considered: alternatives,
    expected_roi: expectedROI,
    urgency,
    requested_at: new Date()
  };
}

/**
 * Format approval request as Telegram message
 */
export function formatApprovalRequest(request: ApprovalRequest): string {
  const urgencyIcon = {
    low: 'ℹ️',
    medium: '⚠️',
    high: '🚨'
  };

  let message = `${urgencyIcon[request.urgency]} APPROVAL REQUIRED\n\n`;
  message += `Action: ${request.action.description}\n`;
  message += `Type: ${request.action.type}\n\n`;
  message += `Why: ${request.reason}\n\n`;

  if (request.action.estimated_cost) {
    message += `Cost: $${request.action.estimated_cost}\n`;
  }

  if (request.expected_roi) {
    message += `Expected ROI: ${request.expected_roi}\n`;
  }

  message += `\nAlternatives Considered:\n`;
  request.alternatives_considered.forEach((alt, i) => {
    message += `${i + 1}. ${alt}\n`;
  });

  message += `\nReply with:\n`;
  message += `✅ "APPROVE" to proceed\n`;
  message += `❌ "DENY" to block\n`;
  message += `💬 Or ask questions\n`;

  return message;
}

/**
 * CFO Agent Analysis Mode
 * CFO can READ financial data but NEVER write/spend
 */
export class CFOReadOnlyMode {
  /**
   * Check if CFO action is read-only (allowed)
   */
  static isReadOnlyAction(action: string): boolean {
    const READ_ONLY_ACTIONS = [
      'analyze_financials',
      'calculate_roi',
      'generate_report',
      'forecast_cash_flow',
      'analyze_budget',
      'calculate_metrics',
      'read_balance',
      'read_transactions',
      'read_statements',
      'compare_costs',
      'evaluate_investment'
    ];

    return READ_ONLY_ACTIONS.includes(action);
  }

  /**
   * Enforce CFO read-only constraint
   */
  static enforceReadOnly(action: string): void {
    if (!this.isReadOnlyAction(action)) {
      throw new Error(
        `CFO_READ_ONLY_VIOLATION: CFO Agent attempted write action "${action}". ` +
        `CFO is READ-ONLY and cannot perform financial transactions.`
      );
    }
  }
}

/**
 * Audit log for tracking all financial access attempts
 */
export interface FinancialAuditEntry {
  timestamp: Date;
  action: string;
  agent: string;
  approved: boolean;
  approved_by?: string;
  reason?: string;
}

export class FinancialAuditLog {
  private static log: FinancialAuditEntry[] = [];

  static record(entry: FinancialAuditEntry): void {
    this.log.push(entry);
    console.log('[FINANCIAL_AUDIT]', entry);
  }

  static getLog(): FinancialAuditEntry[] {
    return [...this.log];
  }

  static getViolations(): FinancialAuditEntry[] {
    return this.log.filter(e => !e.approved);
  }
}

// Export for testing
export const __testing__ = {
  FINANCIAL_ACTIONS
};
