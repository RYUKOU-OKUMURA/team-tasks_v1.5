/**
 * Serves the main HTML page with authentication
 */
function doGet() {
  try {
    const userEmail = Session.getActiveUser().getEmail();

    // ドメイン制限（社内メールのみ）
    // 注意: 実際のドメインに変更してください（例: @yourcompany.com）
    if (!userEmail.endsWith('@example.com')) {
      return HtmlService.createHtmlOutput('アクセスが拒否されました。社内メールアドレスが必要です。');
    }

    const template = HtmlService.createTemplateFromFile('index-inline');
    template.userEmail = userEmail;

    return template.evaluate()
      .setTitle('Team Tasks')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.log('doGet error: ' + error.toString());
    return HtmlService.createHtmlOutput('エラーが発生しました: ' + error.toString());
  }
}

/**
 * 現在のユーザー情報を取得
 */
function getCurrentUser() {
  try {
    const email = Session.getActiveUser().getEmail();
    const userInfo = getUserInfo(email);

    if (!userInfo) {
      throw new Error('ユーザーが見つかりません');
    }

    return {
      email: email,
      displayName: userInfo.displayName,
      role: userInfo.role
    };
  } catch (error) {
    Logger.log('getCurrentUser error: ' + error.toString());
    throw error;
  }
}

/**
 * ユーザー情報を取得
 */
function getUserInfo(email) {
  const usersJson = PropertiesService.getScriptProperties().getProperty('USERS');
  const users = usersJson ? JSON.parse(usersJson) : [];
  return users.find(function(u) { return u.email === email; });
}

/**
 * ユーザー情報を保存
 */
function saveUsers(users) {
  PropertiesService.getScriptProperties().setProperty('USERS', JSON.stringify(users));
}

/**
 * タスクデータをストレージから読み込み
 */
function loadTasksFromStorage() {
  const tasksJson = PropertiesService.getScriptProperties().getProperty('TASKS');
  return tasksJson ? JSON.parse(tasksJson) : [];
}

/**
 * タスクデータをストレージに保存
 */
function saveTasksToStorage(tasks) {
  PropertiesService.getScriptProperties().setProperty('TASKS', JSON.stringify(tasks));
}

/**
 * タスクIDを生成
 */
function generateTaskId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

/**
 * タスク一覧を取得（ロール別フィルタリング）
 */
function getTasks() {
  try {
    const user = getCurrentUser();
    const allTasks = loadTasksFromStorage();

    if (user.role === 'ADMIN') {
      return allTasks;
    }

    // 一般ユーザーは自分に割り当てられたタスクのみ
    return allTasks.filter(function(task) {
      return task.assigneeEmail === user.email;
    });
  } catch (error) {
    Logger.log('getTasks error: ' + error.toString());
    throw error;
  }
}

/**
 * タスクを作成
 */
function createTask(taskData) {
  try {
    const user = getCurrentUser();
    const tasks = loadTasksFromStorage();

    const newTask = {
      id: generateTaskId(),
      title: taskData.title || '',
      assigneeEmail: taskData.assigneeEmail || user.email,
      assigneeName: taskData.assigneeName || user.displayName,
      dueDate: taskData.dueDate || new Date().toISOString(),
      priority: taskData.priority || 'Medium',
      status: taskData.status || 'TODO',
      createdBy: user.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentTaskId: taskData.parentTaskId || null
    };

    tasks.push(newTask);
    saveTasksToStorage(tasks);

    return newTask;
  } catch (error) {
    Logger.log('createTask error: ' + error.toString());
    throw error;
  }
}

/**
 * タスクを更新
 */
function updateTask(taskId, updates) {
  try {
    const user = getCurrentUser();
    const tasks = loadTasksFromStorage();

    const taskIndex = tasks.findIndex(function(t) { return t.id === taskId; });
    if (taskIndex === -1) {
      throw new Error('タスクが見つかりません');
    }

    // 権限チェック
    if (user.role !== 'ADMIN' && tasks[taskIndex].assigneeEmail !== user.email) {
      throw new Error('このタスクを更新する権限がありません');
    }

    // 更新データをマージ
    tasks[taskIndex] = Object.assign({}, tasks[taskIndex], updates, {
      updatedAt: new Date().toISOString()
    });
    
    saveTasksToStorage(tasks);

    return tasks[taskIndex];
  } catch (error) {
    Logger.log('updateTask error: ' + error.toString());
    throw error;
  }
}

/**
 * タスクを削除
 */
function deleteTask(taskId) {
  try {
    const user = getCurrentUser();

    if (user.role !== 'ADMIN') {
      throw new Error('タスクを削除する権限がありません');
    }

    const tasks = loadTasksFromStorage();
    const filteredTasks = tasks.filter(function(t) { return t.id !== taskId; });
    saveTasksToStorage(filteredTasks);

    return { success: true };
  } catch (error) {
    Logger.log('deleteTask error: ' + error.toString());
    throw error;
  }
}

/**
 * Gemini API呼び出し（サーバー側）
 */
function parseTaskWithAI(description) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    
    if (!apiKey) {
      throw new Error('Gemini APIキーが設定されていません');
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey;

    const payload = {
      contents: [{
        parts: [{
          text: '以下のタスク説明から、タイトル、詳細、期限、優先度を抽出してJSON形式で返してください:\n' + description
        }]
      }]
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    return result;
  } catch (error) {
    Logger.log('parseTaskWithAI error: ' + error.toString());
    throw error;
  }
}

/**
 * 初期データのセットアップ（一度だけ実行）
 */
function setupInitialData() {
  const initialUsers = [
    { email: 'boss@example.com', displayName: '社長', role: 'ADMIN' },
    { email: 'tanaka@example.com', displayName: '田中', role: 'USER' },
    { email: 'suzuki@example.com', displayName: '鈴木', role: 'USER' },
    { email: 'sato@example.com', displayName: '佐藤', role: 'USER' }
  ];
  saveUsers(initialUsers);

  // constants.tsからタスクデータを移行
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const initialTasks = [
    {
      id: '1',
      title: '月次レポート提出',
      assigneeEmail: 'tanaka@example.com',
      assigneeName: '田中',
      dueDate: yesterday.toISOString(),
      priority: 'High',
      status: 'TODO',
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
      priority: 'Med',
      status: 'TODO',
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
      priority: 'High',
      status: 'REPORTED',
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
      priority: 'Med',
      status: 'DONE',
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
      priority: 'High',
      status: 'REPORTED',
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
      priority: 'Low',
      status: 'TODO',
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
      priority: 'Med',
      status: 'DONE',
      createdBy: 'boss@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  
  saveTasksToStorage(initialTasks);
  
  Logger.log('初期データのセットアップが完了しました');
}

/**
 * Gemini APIキーを設定（一度だけ実行）
 */
function setApiKey() {
  // 注意: 実際のAPIキーに置き換えてください
  PropertiesService.getScriptProperties()
    .setProperty('GEMINI_API_KEY', 'YOUR_ACTUAL_API_KEY');
}
