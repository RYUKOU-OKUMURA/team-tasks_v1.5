import { User, Task, UserRole, TaskStatus, TaskPriority } from './types';

export const USERS: User[] = [
  { email: 'boss@example.com', displayName: '社長', role: UserRole.ADMIN },
  { email: 'tanaka@example.com', displayName: '田中', role: UserRole.USER },
  { email: 'suzuki@example.com', displayName: '鈴木', role: UserRole.USER },
  { email: 'sato@example.com', displayName: '佐藤', role: UserRole.USER },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);


export const TASKS: Task[] = [
  {
    id: '1',
    title: '月次レポート提出',
    assigneeEmail: 'tanaka@example.com',
    assigneeName: '田中',
    dueDate: yesterday.toISOString(),
    priority: TaskPriority.HIGH,
    status: TaskStatus.TODO,
    createdBy: 'boss@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: '競合分析資料作成',
    assigneeEmail: 'suzuki@example.com',
    assigneeName: '鈴木',
    dueDate: today.toISOString(),
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.TODO,
    createdBy: 'boss@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
    {
    id: '3',
    title: 'クライアントへの提案書準備',
    assigneeEmail: 'tanaka@example.com',
    assigneeName: '田中',
    dueDate: tomorrow.toISOString(),
    priority: TaskPriority.HIGH,
    status: TaskStatus.REPORTED,
    createdBy: 'boss@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    parentTaskId: '3',
    title: 'アジェンダ作成',
    assigneeEmail: 'tanaka@example.com',
    assigneeName: '田中',
    dueDate: tomorrow.toISOString(),
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.DONE,
    createdBy: 'boss@example.com',
    createdAt: new Date(Date.now() - 10000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '7',
    parentTaskId: '3',
    title: '競合資料のレビュー',
    assigneeEmail: 'tanaka@example.com',
    assigneeName: '田中',
    dueDate: tomorrow.toISOString(),
    priority: TaskPriority.HIGH,
    status: TaskStatus.REPORTED,
    createdBy: 'boss@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: '経費精算',
    assigneeEmail: 'sato@example.com',
    assigneeName: '佐藤',
    dueDate: nextWeek.toISOString(),
    priority: TaskPriority.LOW,
    status: TaskStatus.TODO,
    createdBy: 'boss@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'プロジェクト完了報告',
    assigneeEmail: 'suzuki@example.com',
    assigneeName: '鈴木',
    dueDate: yesterday.toISOString(),
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.DONE,
    createdBy: 'boss@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];