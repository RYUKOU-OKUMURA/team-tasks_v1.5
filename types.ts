export enum TaskStatus {
  TODO = 'TODO',
  REPORTED = 'REPORTED',
  DONE = 'DONE',
}

export enum TaskPriority {
  HIGH = 'High',
  MEDIUM = 'Med',
  LOW = 'Low',
}

export interface Task {
  id: string;
  title: string;
  assigneeEmail: string;
  assigneeName: string;
  dueDate: string; // ISO8601 string
  priority: TaskPriority;
  status: TaskStatus;
  createdBy: string;
  createdAt: string; // ISO8601 string
  updatedAt: string; // ISO8601 string
  parentTaskId?: string; // For subtasks
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  email: string;
  displayName: string;
  role: UserRole;
}

export interface Filter {
  assignee: string;
  priority: string;
  showOverdue: boolean;
}