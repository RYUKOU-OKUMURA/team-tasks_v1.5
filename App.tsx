import React, { useState, useMemo, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Task, User, TaskStatus, UserRole, TaskPriority, Filter } from './types';
import { USERS, TASKS } from './constants';
import { parseMMDD, isOverdue } from './utils/dateUtils';
import Header from './components/Header';
import TaskInput from './components/TaskInput';
import FilterBar from './components/FilterBar';
import TaskList from './components/TaskList';
import TaskModal from './components/TaskModal';
import UserDashboard from './components/UserDashboard';

const App: React.FC = () => {
  const [users] = useState<User[]>(USERS);
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>(users[0].email);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [filters, setFilters] = useState<Filter>({
    assignee: '',
    priority: '',
    showOverdue: false,
  });

  const currentUser = useMemo(() => users.find(u => u.email === currentUserEmail)!, [users, currentUserEmail]);

  const handleAddTask = async (taskDetails: { text: string; assigneeEmail: string; priority: TaskPriority, parentTaskId?: string }): Promise<{ ok: boolean; message: string }> => {
    setIsCreatingTask(true);
    const { text, assigneeEmail, priority, parentTaskId } = taskDetails;

    if (!text.trim()) {
        setIsCreatingTask(false);
        return { ok: false, message: 'タスク内容を入力してください。' };
    }
    
    const assignee = users.find(u => u.email === assigneeEmail);
    if (!assignee) {
        setIsCreatingTask(false);
        return { ok: false, message: '担当者が見つかりません。' };
    }

    // サブタスクの場合は親タスクの期日を使用し、AIによる日付抽出をスキップ
    if (parentTaskId) {
      const parentTask = tasks.find(t => t.id === parentTaskId);
      if (!parentTask) {
        setIsCreatingTask(false);
        return { ok: false, message: '親タスクが見つかりません。' };
      }

      const newTask: Task = {
        id: crypto.randomUUID(),
        title: text.trim(),
        assigneeEmail: assignee.email,
        assigneeName: assignee.displayName,
        dueDate: parentTask.dueDate, // 親タスクの期日を使用
        priority: priority,
        status: TaskStatus.TODO,
        createdBy: currentUser.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parentTaskId: parentTaskId,
      };

      setTasks(prevTasks => [newTask, ...prevTasks]);
      setIsCreatingTask(false);
      return { ok: true, message: 'サブタスクを作成しました。' };
    }

    // 通常のタスクの場合、AIで日付抽出を行う
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `以下のテキストからタスクのタイトルと日付を抽出してください。日付はMM/DD形式で返してください。日付が明記されていない場合は、dueDateをnullにしてください。\n\nテキスト: "${text}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: '抽出されたタスクのタイトル',
              },
              dueDate: {
                type: Type.STRING,
                description: '抽出された日付 (MM/DD形式)。見つからない場合はnull。',
              },
            },
            required: ['title', 'dueDate'],
          },
        },
      });

      const resultJson = JSON.parse(response.text);
      const { title, dueDate: extractedDueDate } = resultJson;

      if (!title) {
          setIsCreatingTask(false);
          return { ok: false, message: 'テキストからタスクのタイトルを抽出できませんでした。' };
      }
      
      if (!extractedDueDate) {
          setIsCreatingTask(false);
          return { ok: false, message: 'テキストから日付を抽出できませんでした。日付を明確に記載してください (例: 11/20までに)' };
      }

      const dueDate = parseMMDD(extractedDueDate);
      if (new Date(dueDate) < new Date(new Date().toDateString())) {
         setIsCreatingTask(false);
         return { ok: false, message: '過去の日付は指定できません' };
      }

      const newTask: Task = {
        id: crypto.randomUUID(),
        title: title,
        assigneeEmail: assignee.email,
        assigneeName: assignee.displayName,
        dueDate: dueDate,
        priority: priority,
        status: TaskStatus.TODO,
        createdBy: currentUser.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parentTaskId: parentTaskId,
      };

      setTasks(prevTasks => [newTask, ...prevTasks]);
      return { ok: true, message: 'タスクを作成しました。' };
    } catch (error) {
        console.error("Error creating task:", error);
        if (error instanceof Error) {
            return { ok: false, message: `タスク作成中にエラーが発生しました: ${error.message}` };
        }
        return { ok: false, message: 'タスク作成中に不明なエラーが発生しました。' };
    } finally {
        setIsCreatingTask(false);
    }
  };
  
  const handleUpdateTask = useCallback((updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id
          ? { ...updatedTask, updatedAt: new Date().toISOString() }
          : task
      )
    );
    setEditingTask(null);
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId || prevTasks.some(t => t.parentTaskId === taskId)));
    // Also delete subtasks
    setTasks(prevTasks => prevTasks.filter(task => task.parentTaskId !== taskId));
  }, []);

  const handleStatusChange = useCallback((taskId: string, newStatus: TaskStatus) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
          : task
      )
    );
  }, []);


  const adminFilteredTasks = useMemo(() => {
    if (currentUser.role !== UserRole.ADMIN) return [];
    
    let tasksToShow = tasks.filter(task => !task.parentTaskId);

    if (filters.assignee) {
      tasksToShow = tasksToShow.filter(task => task.assigneeEmail === filters.assignee);
    }
    if (filters.priority) {
      tasksToShow = tasksToShow.filter(task => task.priority === filters.priority);
    }
    if (filters.showOverdue) {
      tasksToShow = tasksToShow.filter(task => task.status !== TaskStatus.DONE && isOverdue(task.dueDate));
    }
    
    return tasksToShow.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, currentUser.role, filters]);
  
  const userTasks = useMemo(() => {
    if (currentUser.role !== UserRole.USER) return [];
    
    return tasks
      .filter(task => !task.parentTaskId && task.assigneeEmail === currentUser.email)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, currentUser.role, currentUser.email]);


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Header
        users={users}
        currentUser={currentUser}
        onUserChange={setCurrentUserEmail}
      />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {currentUser.role === UserRole.ADMIN ? (
          <>
            <TaskInput onAddTask={handleAddTask} users={users} isCreating={isCreatingTask} />
            <FilterBar
              users={users}
              filters={filters}
              onFilterChange={setFilters}
            />
            <TaskList
              tasks={adminFilteredTasks}
              allTasks={tasks}
              currentUser={currentUser}
              onStatusChange={handleStatusChange}
              onAddTask={handleAddTask}
              onEdit={setEditingTask}
              onDelete={handleDeleteTask}
            />
          </>
        ) : (
          <UserDashboard
            tasks={userTasks}
            allTasks={tasks}
            currentUser={currentUser}
            onStatusChange={handleStatusChange}
            onAddTask={handleAddTask}
          />
        )}
      </main>
      
      {editingTask && (
        <TaskModal
          task={editingTask}
          users={users}
          onClose={() => setEditingTask(null)}
          onSave={handleUpdateTask}
        />
      )}
    </div>
  );
};

export default App;