/**
 * MASTER COORDINATOR
 *
 * The brain of the Universal Business OS.
 * Coordinates all agents, routes tasks, tracks progress.
 */

import {
  Task,
  Agent,
  Goal,
  BusinessContext,
  TaskStatus,
  TaskPriority,
  AgentRole
} from './types';
import { classifyDecision } from '../approval/decision_classifier';
import { getApprovalQueue } from '../approval/approval_queue';
import * as fs from 'fs';
import * as path from 'path';

export class MasterCoordinator {
  private tasks: Map<string, Task> = new Map();
  private agents: Map<AgentRole, Agent> = new Map();
  private goals: Map<string, Goal> = new Map();
  private context: BusinessContext;
  private dataDir: string;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
    this.context = this.initializeDefaultContext();
    this.initializeAgents();
    this.load();
  }

  /**
   * Initialize default business context
   */
  private initializeDefaultContext(): BusinessContext {
    return {
      current_focus: ['Building Universal Business OS'],
      available_resources: {
        time_per_day_hours: 16,  // AI can work 16+ hours
        tools: ['OpenClaw', 'Ollama', 'Antigravity', 'Quant Lab'],
        skills: [
          'Software Development',
          'Data Analysis',
          'Market Research',
          'Strategy',
          'Trading',
          'Automation'
        ]
      },
      constraints: {
        cannot_spend_without_approval: true,
        must_notify_on: ['blocked', 'needs_approval', 'milestone_complete'],
        working_hours: '24/7'
      },
      strategic_goals: [
        'Build autonomous business capability',
        'Identify profitable opportunities',
        'Execute with minimal oversight',
        'Never violate financial guardrails'
      ]
    };
  }

  /**
   * Initialize all 8 agents
   */
  private initializeAgents(): void {
    const agentDefinitions = [
      {
        role: AgentRole.CEO,
        name: 'Chief Executive',
        capabilities: [
          'strategic_planning',
          'priority_setting',
          'resource_allocation',
          'decision_making',
          'vision_setting'
        ]
      },
      {
        role: AgentRole.CTO,
        name: 'Chief Technology Officer',
        capabilities: [
          'technical_architecture',
          'system_design',
          'tech_stack_selection',
          'infrastructure',
          'security'
        ]
      },
      {
        role: AgentRole.CFO,
        name: 'Chief Financial Officer (READ-ONLY)',
        capabilities: [
          'financial_analysis',
          'roi_calculation',
          'budget_planning',
          'cost_analysis',
          'metrics_tracking'
          // NOTE: NO spending capabilities
        ]
      },
      {
        role: AgentRole.CMO,
        name: 'Chief Marketing Officer',
        capabilities: [
          'market_positioning',
          'brand_strategy',
          'customer_acquisition',
          'growth_strategies',
          'competitive_analysis'
        ]
      },
      {
        role: AgentRole.ANALYSIS_LEAD,
        name: 'Analysis Lead',
        capabilities: [
          'data_analysis',
          'pattern_recognition',
          'reporting',
          'insights_generation',
          'metrics_tracking'
        ]
      },
      {
        role: AgentRole.RED_TEAM_LEAD,
        name: 'Red Team Lead',
        capabilities: [
          'risk_assessment',
          'adversarial_thinking',
          'devils_advocate',
          'failure_mode_analysis',
          'security_audit'
        ]
      },
      {
        role: AgentRole.MARKETING_MANAGER,
        name: 'Marketing Manager',
        capabilities: [
          'campaign_execution',
          'content_creation',
          'channel_optimization',
          'analytics',
          'ab_testing'
        ]
      },
      {
        role: AgentRole.DEV_LEAD,
        name: 'Development Lead',
        capabilities: [
          'code_development',
          'testing',
          'deployment',
          'maintenance',
          'ci_cd'
        ]
      }
    ];

    agentDefinitions.forEach(def => {
      this.agents.set(def.role, {
        ...def,
        current_tasks: [],
        max_concurrent_tasks: 3,
        is_active: true,
        performance_metrics: {
          tasks_completed: 0,
          average_time: 0,
          success_rate: 100
        }
      });
    });
  }

  /**
   * Create a new goal
   */
  createGoal(
    title: string,
    description: string,
    targetDate?: Date,
    successMetrics: string[] = []
  ): Goal {
    const goal: Goal = {
      id: this.generateId('goal'),
      title,
      description,
      target_date: targetDate,
      status: 'not_started',
      tasks: [],
      success_metrics: successMetrics,
      created_at: new Date()
    };

    this.goals.set(goal.id, goal);
    this.save();

    return goal;
  }

  /**
   * Create a new task
   */
  createTask(
    title: string,
    description: string,
    priority: TaskPriority = TaskPriority.MEDIUM,
    assignedTo?: AgentRole,
    parentTaskId?: string
  ): Task {
    const task: Task = {
      id: this.generateId('task'),
      title,
      description,
      priority,
      status: TaskStatus.PENDING,
      assigned_to: assignedTo,
      parent_task_id: parentTaskId,
      subtasks: [],
      dependencies: [],
      created_at: new Date(),
      progress_percent: 0,
      metadata: {}
    };

    this.tasks.set(task.id, task);

    // If parent exists, add this as subtask
    if (parentTaskId) {
      const parent = this.tasks.get(parentTaskId);
      if (parent) {
        parent.subtasks.push(task.id);
      }
    }

    this.save();
    return task;
  }

  /**
   * Decompose a high-level goal into tasks
   * This is where the magic happens - AI breaks down big goals
   */
  async decomposeGoal(goalId: string): Promise<Task[]> {
    const goal = this.goals.get(goalId);
    if (!goal) throw new Error(`Goal ${goalId} not found`);

    // This would call an LLM to break down the goal
    // For now, return empty array - will implement with LLM integration
    return [];
  }

  /**
   * Assign task to best agent
   */
  assignTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // If already assigned, keep it
    if (task.assigned_to) return true;

    // Find best agent based on capabilities and workload
    const bestAgent = this.findBestAgent(task);
    if (!bestAgent) return false;

    task.assigned_to = bestAgent.role;
    bestAgent.current_tasks.push(taskId);

    this.save();
    return true;
  }

  /**
   * Find best agent for a task
   */
  private findBestAgent(task: Task): Agent | undefined {
    // Simple heuristic: find agent with fewest current tasks
    // In production, would use more sophisticated matching

    let bestAgent: Agent | undefined;
    let minTasks = Infinity;

    for (const agent of this.agents.values()) {
      if (!agent.is_active) continue;
      if (agent.current_tasks.length >= agent.max_concurrent_tasks) continue;

      if (agent.current_tasks.length < minTasks) {
        minTasks = agent.current_tasks.length;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: TaskStatus, notes?: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.status = status;

    if (status === TaskStatus.IN_PROGRESS && !task.started_at) {
      task.started_at = new Date();
    }

    if (status === TaskStatus.COMPLETED && !task.completed_at) {
      task.completed_at = new Date();
      task.progress_percent = 100;

      // Update agent metrics
      if (task.assigned_to) {
        const agent = this.agents.get(task.assigned_to);
        if (agent) {
          agent.current_tasks = agent.current_tasks.filter(id => id !== taskId);
          agent.performance_metrics.tasks_completed++;
        }
      }
    }

    if (notes) {
      task.metadata.last_note = notes;
      task.metadata.last_updated = new Date();
    }

    this.save();
    return true;
  }

  /**
   * Get all pending tasks sorted by priority
   */
  getPendingTasks(): Task[] {
    const tasks = Array.from(this.tasks.values())
      .filter(t => t.status === TaskStatus.PENDING);

    // Sort by priority
    const priorityOrder = {
      [TaskPriority.CRITICAL]: 0,
      [TaskPriority.HIGH]: 1,
      [TaskPriority.MEDIUM]: 2,
      [TaskPriority.LOW]: 3
    };

    return tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Get active tasks (in progress)
   */
  getActiveTasks(): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === TaskStatus.IN_PROGRESS);
  }

  /**
   * Get tasks by agent
   */
  getTasksByAgent(role: AgentRole): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.assigned_to === role);
  }

  /**
   * Get overall system status
   */
  getSystemStatus(): {
    active_goals: number;
    pending_tasks: number;
    active_tasks: number;
    completed_tasks: number;
    blocked_tasks: number;
    active_agents: number;
    pending_approvals: number;
  } {
    const tasks = Array.from(this.tasks.values());

    return {
      active_goals: Array.from(this.goals.values()).filter(g => g.status === 'in_progress').length,
      pending_tasks: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      active_tasks: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed_tasks: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      blocked_tasks: tasks.filter(t => t.status === TaskStatus.BLOCKED).length,
      active_agents: Array.from(this.agents.values()).filter(a => a.is_active).length,
      pending_approvals: getApprovalQueue().getPending().length
    };
  }

  /**
   * Get business context
   */
  getContext(): BusinessContext {
    return { ...this.context };
  }

  /**
   * Update business context
   */
  updateContext(updates: Partial<BusinessContext>): void {
    this.context = { ...this.context, ...updates };
    this.save();
  }

  /**
   * Save state to disk
   */
  private save(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      const state = {
        tasks: Array.from(this.tasks.entries()),
        agents: Array.from(this.agents.entries()),
        goals: Array.from(this.goals.entries()),
        context: this.context
      };

      fs.writeFileSync(
        path.join(this.dataDir, 'coordinator_state.json'),
        JSON.stringify(state, null, 2)
      );
    } catch (error) {
      console.error('Failed to save coordinator state:', error);
    }
  }

  /**
   * Load state from disk
   */
  private load(): void {
    try {
      const stateFile = path.join(this.dataDir, 'coordinator_state.json');
      if (fs.existsSync(stateFile)) {
        const data = fs.readFileSync(stateFile, 'utf-8');
        const state = JSON.parse(data);

        this.tasks = new Map(state.tasks);
        this.agents = new Map(state.agents);
        this.goals = new Map(state.goals);
        if (state.context) {
          this.context = state.context;
        }
      }
    } catch (error) {
      console.error('Failed to load coordinator state:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }
}

// Singleton instance
let _coordinator: MasterCoordinator | null = null;

export function getCoordinator(): MasterCoordinator {
  if (!_coordinator) {
    _coordinator = new MasterCoordinator();
  }
  return _coordinator;
}
