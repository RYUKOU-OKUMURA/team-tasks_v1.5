import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Task, User, TaskStatus, UserRole, TaskPriority, Filter } from './types';
import { parseMMDD, isOverdue } from './utils/dateUtils';
import Header from './components/Header';
import TaskInput from './components/TaskInput';
import FilterBar from './components/FilterBar';
import TaskList from './components/TaskList';
import TaskModal from './components/TaskModal';
import UserDashboard from './components/UserDashboard';

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [filters, setFilters] = useState<Filter>({
    assignee: '',
    priority: '',
    showOverdue: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // 初期データの読み込み
  useEffect(() => {
    setIsLoading(true);
    
    // ユーザー情報の取得
    google.script.run
      .withSuccessHandler((user: User) => {
        setCurrentUser(user);
      })
      .withFailureHandler((error: Error) => {
        console.error('ユーザー情報の取得に失敗しました', error);
        setIsLoading(false);
      })
      .getCurrentUser();

    // ユーザー一覧の取得
    google.script.run
      .withSuccessHandler((usersList: User[]) => {
        setUsers(usersList);
      })
      .withFailureHandler((error: Error) => {
        console.error('ユーザー一覧の取得に失敗しました', error);
      })
      .getUsers();

    // タスク一覧の取得
    google.script.run
      .withSuccessHandler((tasksList: Task[]) => {
        setTasks(tasksList);
        setIsLoading(false);
      })
      .withFailureHandler((error: Error) => {
        console.error('タスクの取得に失敗しました', error);
        setIsLoading(false);
      })
      .getTasks();
  }, []);

  const handleAddTask = async (taskDetails: { text: string; assigneeEmail: string; priority: TaskPriority, parentTaskId?: string }): Promise<{ ok: boolean; message: string }> => {
    setIsCreatingTask(true);
    const { text, assigneeEmail, priority, parentTaskId } = taskDetails;

    if (!text.trim()) {
        setIsCreatingTask(false);
        return { ok: false, message: 'タスク内容を入力してください。' };
    }
    
    if (!currentUser) {
        setIsCreatingTask(false);
        return { ok: false, message: 'ユーザー情報が取得できませんでした。' };
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

      return new Promise((resolve) => {
        google.script.run
          .withSuccessHandler((newTask: Task) => {
            setTasks(prevTasks => [newTask, ...prevTasks]);
            setIsCreatingTask(false);
            resolve({ ok: true, message: 'サブタスクを作成しました。' });
          })
          .withFailureHandler((error: Error) => {
            console.error('タスクの追加に失敗しました', error);
            setIsCreatingTask(false);
            resolve({ ok: false, message: `タスク作成中にエラーが発生しました: ${error.message}` });
          })
          .createTask({
            title: text.trim(),
            assigneeEmail: assignee.email,
            assigneeName: assignee.displayName,
            dueDate: parentTask.dueDate,
            priority: priority,
            status: TaskStatus.TODO,
            parentTaskId: parentTaskId,
          });
      });
    }

    // 通常のタスクの場合、AIで日付抽出を行う
    return new Promise((resolve) => {
      google.script.run
        .withSuccessHandler((aiResult: { title: string; dueDate: string | null }) => {
          try {
            const { title, dueDate: extractedDueDate } = aiResult;

            if (!title) {
                setIsCreatingTask(false);
                resolve({ ok: false, message: 'テキストからタスクのタイトルを抽出できませんでした。' });
                return;
            }
            
            if (!extractedDueDate) {
                setIsCreatingTask(false);
                resolve({ ok: false, message: 'テキストから日付を抽出できませんでした。日付を明確に記載してください (例: 11/20までに)' });
                return;
            }

            const dueDate = parseMMDD(extractedDueDate);
            if (new Date(dueDate) < new Date(new Date().toDateString())) {
               setIsCreatingTask(false);
               resolve({ ok: false, message: '過去の日付は指定できません' });
               return;
            }

            // タスクを作成
            google.script.run
              .withSuccessHandler((newTask: Task) => {
                setTasks(prevTasks => [newTask, ...prevTasks]);
                setIsCreatingTask(false);
                resolve({ ok: true, message: 'タスクを作成しました。' });
              })
              .withFailureHandler((error: Error) => {
                console.error('タスクの追加に失敗しました', error);
                setIsCreatingTask(false);
                resolve({ ok: false, message: `タスク作成中にエラーが発生しました: ${error.message}` });
              })
              .createTask({
                title: title,
                assigneeEmail: assignee.email,
                assigneeName: assignee.displayName,
                dueDate: dueDate,
                priority: priority,
                status: TaskStatus.TODO,
              });
          } catch (error) {
            console.error("Error processing AI result:", error);
            setIsCreatingTask(false);
            resolve({ ok: false, message: `タスク作成中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}` });
          }
        })
        .withFailureHandler((error: Error) => {
          console.error("Error calling AI:", error);
          setIsCreatingTask(false);
          resolve({ ok: false, message: `タスク作成中にエラーが発生しました: ${error.message}` });
        })
        .parseTaskWithAI(text);
    });
  };
  
  const handleUpdateTask = useCallback((updatedTask: Task) => {
    google.script.run
      .withSuccessHandler((updated: Task) => {
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === updated.id ? updated : task
          )
        );
        setEditingTask(null);
      })
      .withFailureHandler((error: Error) => {
        console.error('タスクの更新に失敗しました', error);
        alert(`タスクの更新に失敗しました: ${error.message}`);
      })
      .updateTask(updatedTask.id, {
        title: updatedTask.title,
        assigneeEmail: updatedTask.assigneeEmail,
        assigneeName: updatedTask.assigneeName,
        dueDate: updatedTask.dueDate,
        priority: updatedTask.priority,
        status: updatedTask.status,
      });
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    google.script.run
      .withSuccessHandler(() => {
        // タスクとサブタスクを削除
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId && task.parentTaskId !== taskId));
      })
      .withFailureHandler((error: Error) => {
        console.error('タスクの削除に失敗しました', error);
        alert(`タスクの削除に失敗しました: ${error.message}`);
      })
      .deleteTask(taskId);
  }, []);

  const handleStatusChange = useCallback((taskId: string, newStatus: TaskStatus) => {
    google.script.run
      .withSuccessHandler((updated: Task) => {
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? updated : task
          )
        );
      })
      .withFailureHandler((error: Error) => {
        console.error('タスクのステータス更新に失敗しました', error);
        alert(`タスクのステータス更新に失敗しました: ${error.message}`);
      })
      .updateTask(taskId, { status: newStatus });
  }, []);


  const adminFilteredTasks = useMemo(() => {
    if (!currentUser || currentUser.role !== UserRole.ADMIN) return [];
    
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
  }, [tasks, currentUser, filters]);
  
  const userTasks = useMemo(() => {
    if (!currentUser || currentUser.role !== UserRole.USER) return [];
    
    return tasks
      .filter(task => !task.parentTaskId && task.assigneeEmail === currentUser.email)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks, currentUser]);


  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Header currentUser={currentUser} />
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