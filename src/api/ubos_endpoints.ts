/**
 * UBOS API ENDPOINTS
 *
 * REST API endpoints for Universal Business OS
 * Integrates with existing dashboard and external access
 */

import { Router, Request, Response } from 'express';
import { getUBOS, TaskPriority } from '../ubos';
import { Action } from '../approval/financial_locks';

const router = Router();
const ubos = getUBOS();

/**
 * GET /api/ubos/status
 * Get overall system status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const coordinator = ubos.getCoordinator();
    const status = coordinator.getSystemStatus();
    const context = coordinator.getContext();

    res.json({
      success: true,
      status,
      context,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/ubos/opportunities
 * Get business opportunities
 */
router.get('/opportunities', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;

    let opportunities = ubos.getTopOpportunities(limit);

    if (category) {
      opportunities = opportunities.filter(o => o.category === category);
    }

    res.json({
      success: true,
      opportunities,
      count: opportunities.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/ubos/opportunities/:id
 * Get detailed opportunity report
 */
router.get('/opportunities/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scanner = ubos.getScanner();
    const report = scanner.generateReport(id);

    if (!report || report === 'Opportunity not found') {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found'
      });
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/ubos/opportunities/scan
 * Trigger new opportunity scan
 */
router.post('/opportunities/scan', async (req: Request, res: Response) => {
  try {
    const scanner = ubos.getScanner();
    const opportunities = await scanner.runDailyScan();

    res.json({
      success: true,
      message: 'Opportunity scan completed',
      count: opportunities.length,
      opportunities: opportunities.slice(0, 5) // Return top 5
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/ubos/tasks
 * Create a new task
 */
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { title, description, priority } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    const result = ubos.createTask(
      title,
      description,
      priority || TaskPriority.MEDIUM
    );

    res.json({
      success: true,
      task: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/ubos/tasks
 * Get tasks
 */
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const coordinator = ubos.getCoordinator();
    const status = req.query.status as string;

    let tasks;
    if (status === 'pending') {
      tasks = coordinator.getPendingTasks();
    } else if (status === 'active') {
      tasks = coordinator.getActiveTasks();
    } else {
      // Get all tasks
      tasks = [
        ...coordinator.getPendingTasks(),
        ...coordinator.getActiveTasks()
      ];
    }

    res.json({
      success: true,
      tasks,
      count: tasks.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/ubos/actions/execute
 * Execute an action (with approval checking)
 */
router.post('/actions/execute', async (req: Request, res: Response) => {
  try {
    const action: Action = req.body;

    if (!action.type || !action.description) {
      return res.status(400).json({
        success: false,
        error: 'Action type and description are required'
      });
    }

    const result = await ubos.executeAction(action);

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/ubos/approvals
 * Get pending approvals
 */
router.get('/approvals', async (req: Request, res: Response) => {
  try {
    const approvals = ubos.getApprovals();
    const pending = approvals.getPending();
    const stats = approvals.getStats();

    res.json({
      success: true,
      pending,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/ubos/approvals/:id/approve
 * Approve a pending request
 */
router.post('/approvals/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const approvals = ubos.getApprovals();
    const success = approvals.approve(id, notes);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Approval request not found'
      });
    }

    res.json({
      success: true,
      message: 'Approval granted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/ubos/approvals/:id/deny
 * Deny a pending request
 */
router.post('/approvals/:id/deny', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const approvals = ubos.getApprovals();
    const success = approvals.deny(id, notes);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Approval request not found'
      });
    }

    res.json({
      success: true,
      message: 'Approval denied'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/ubos/daily-cycle
 * Run daily cycle
 */
router.post('/daily-cycle', async (req: Request, res: Response) => {
  try {
    await ubos.runDailyCycle();

    res.json({
      success: true,
      message: 'Daily cycle completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/ubos/agents
 * Get agent status
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const coordinator = ubos.getCoordinator();
    // Would need to add getAgents() method to coordinator
    // For now, return basic info

    res.json({
      success: true,
      agents: [
        { role: 'CEO', name: 'Chief Executive', active: true },
        { role: 'CTO', name: 'Chief Technology Officer', active: true },
        { role: 'CFO', name: 'Chief Financial Officer (READ-ONLY)', active: true },
        { role: 'CMO', name: 'Chief Marketing Officer', active: true },
        { role: 'ANALYSIS_LEAD', name: 'Analysis Lead', active: true },
        { role: 'RED_TEAM_LEAD', name: 'Red Team Lead', active: true },
        { role: 'MARKETING_MANAGER', name: 'Marketing Manager', active: true },
        { role: 'DEV_LEAD', name: 'Development Lead', active: true }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;
