/**
 * ORCHESTRATION TYPES
 *
 * Core types for the Universal Business OS orchestration system.
 */

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
  CRITICAL = 'CRITICAL',  // Must do now
  HIGH = 'HIGH',         // Do today
  MEDIUM = 'MEDIUM',     // Do this week
  LOW = 'LOW'            // Do when possible
}

export enum AgentRole {
  CEO = 'CEO',
  CTO = 'CTO',
  CFO = 'CFO',
  CMO = 'CMO',
  ANALYSIS_LEAD = 'ANALYSIS_LEAD',
  RED_TEAM_LEAD = 'RED_TEAM_LEAD',
  MARKETING_MANAGER = 'MARKETING_MANAGER',
  DEV_LEAD = 'DEV_LEAD'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: AgentRole;
  parent_task_id?: string;
  subtasks: string[];  // IDs of subtasks
  dependencies: string[];  // IDs of tasks that must complete first
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  estimated_hours?: number;
  actual_hours?: number;
  progress_percent: number;
  metadata: Record<string, any>;
}

export interface Agent {
  role: AgentRole;
  name: string;
  capabilities: string[];
  current_tasks: string[];  // Task IDs
  max_concurrent_tasks: number;
  is_active: boolean;
  performance_metrics: {
    tasks_completed: number;
    average_time: number;
    success_rate: number;
  };
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  target_date?: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  tasks: string[];  // Task IDs contributing to this goal
  success_metrics: string[];
  created_at: Date;
  completed_at?: Date;
}

export interface BusinessContext {
  // What type of business are we running?
  business_type?: 'trading' | 'services' | 'products' | 'holding_company' | 'mixed';

  // What are we currently focused on?
  current_focus: string[];

  // What resources do we have?
  available_resources: {
    time_per_day_hours: number;
    budget?: number;
    tools: string[];
    skills: string[];
  };

  // What are our constraints?
  constraints: {
    cannot_spend_without_approval: boolean;
    must_notify_on: string[];
    working_hours?: string;
  };

  // Long-term goals
  strategic_goals: string[];
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  options: string[];
  recommended_option?: string;
  reasoning?: string;
  requires_approval: boolean;
  decision_maker: 'autonomous' | 'rob';
  decided_at?: Date;
  chosen_option?: string;
}
