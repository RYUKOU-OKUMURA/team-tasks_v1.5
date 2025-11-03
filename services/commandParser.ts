import { TaskPriority } from '../types';

interface ParsedCommand {
  ok: true;
  assigneeName: string;
  title: string;
  dueDate: string;
  priority: TaskPriority;
}

interface ParseError {
  ok: false;
  error: string;
}

const normalizePriority = (priorityStr?: string): TaskPriority => {
  if (!priorityStr) return TaskPriority.MEDIUM;
  const lowerPriority = priorityStr.toLowerCase();
  const map: { [key: string]: TaskPriority } = {
    'high': TaskPriority.HIGH, '高': TaskPriority.HIGH,
    'med': TaskPriority.MEDIUM, '中': TaskPriority.MEDIUM,
    'low': TaskPriority.LOW, '低': TaskPriority.LOW,
  };
  return map[lowerPriority] || TaskPriority.MEDIUM;
};

export const parseCommand = (text: string): ParsedCommand | ParseError => {
  const pattern = /^(?:@bot\s+)?(\S+)\s+(.+?)\s+(\d{1,2}\/\d{1,2})(?:\s+(High|Med|Low|高|中|低))?$/i;
  const match = text.trim().match(pattern);

  if (!match) {
    return { 
      ok: false, 
      error: 'コマンド形式が正しくありません。例: @bot 田中 レポート提出 11/10 High' 
    };
  }

  const [, assigneeName, title, dueDate, priorityStr] = match;

  return {
    ok: true,
    assigneeName,
    title,
    dueDate,
    priority: normalizePriority(priorityStr)
  };
};
