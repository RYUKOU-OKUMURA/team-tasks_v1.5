// セキュリティ設定: 本番環境では必ず実際の値に置き換えてください
const INTERNAL_DOMAIN_SUFFIX = PropertiesService.getScriptProperties().getProperty('INTERNAL_DOMAIN') || '@example.com';

/**
 * 外部テスター用のメールアドレスリストを取得
 * スクリプトプロパティから取得し、カンマ区切りで分割
 */
function getAllowedTesterEmails() {
  const emails = PropertiesService.getScriptProperties().getProperty('ALLOWED_TESTER_EMAILS');
  return emails ? emails.split(',').map(function(e) { return e.trim(); }) : [];
}

/**
 * 認証対象かを判定
 */
function isAllowedEmail(email) {
  if (!email) {
    return false;
  }

  if (email.endsWith(INTERNAL_DOMAIN_SUFFIX)) {
    return true;
  }

  const allowedTesters = getAllowedTesterEmails();
  return allowedTesters.indexOf(email) !== -1;
}

/**
 * ユーザー情報を追加・更新
 */
function upsertUser(user) {
  if (!user || !user.email) {
    throw new Error('user.email is required');
  }

  const users = getUsers();
  const userIndex = users.findIndex(function(u) { return u.email === user.email; });

  if (userIndex === -1) {
    users.push(user);
  } else {
    users[userIndex] = user;
  }

  saveUsers(users);
  return user;
}

/**
 * Serves the main HTML page with authentication
 */
function doGet() {
  try {
    const userEmail = Session.getActiveUser().getEmail();

    if (!isAllowedEmail(userEmail)) {
      return HtmlService.createHtmlOutput('アクセスが拒否されました。社内メールアドレスもしくは許可済みのテスター用メールアドレスが必要です。');
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
    let userInfo = getUserInfo(email);

    if (!userInfo) {
      if (!isAllowedEmail(email)) {
        throw new Error('ユーザーが見つかりません');
      }

      userInfo = {
        email: email,
        displayName: email,
        role: 'USER'
      };

      upsertUser(userInfo);
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
 * ユーザー一覧を取得
 */
function getUsers() {
  try {
    const usersJson = PropertiesService.getScriptProperties().getProperty('USERS');
    return usersJson ? JSON.parse(usersJson) : [];
  } catch (error) {
    Logger.log('getUsers error: ' + error.toString());
    throw error;
  }
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
 * セキュアなUUIDベースのID生成
 */
function generateTaskId() {
  return Utilities.getUuid();
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
 * タスクの説明からタイトルと日付を抽出してJSON形式で返す
 */
function parseTaskWithAI(description) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('Gemini APIキーが設定されていません');
    }

    // APIキーをURLパラメータではなく、リクエストヘッダーで送信することも可能ですが、
    // Google AI APIの仕様上、URLパラメータでの送信が標準的な方法です
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const url = baseUrl + '?key=' + apiKey;

    const prompt = '以下のテキストからタスクのタイトルと日付を抽出してください。日付はMM/DD形式で返してください。日付が明記されていない場合は、dueDateをnullにしてください。\n\nテキスト: "' + description + '"\n\nJSON形式で返してください。形式: {"title": "タスクのタイトル", "dueDate": "MM/DDまたはnull"}';

    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseText = response.getContentText();
    const result = JSON.parse(responseText);

    // Gemini APIのレスポンスからテキストを抽出
    if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
      const text = result.candidates[0].content.parts[0].text;
      // JSONをパース
      const parsed = JSON.parse(text);
      return parsed;
    }

    throw new Error('APIレスポンスの形式が不正です');
  } catch (error) {
    Logger.log('parseTaskWithAI error: ' + error.toString());
    throw error;
  }
}

/**
 * 初期データのセットアップ（一度だけ実行）
 *
 * 警告: この関数はテスト/デモ用データを作成します。
 * 本番環境では実行しないでください。既存のデータが上書きされる可能性があります。
 *
 * 使用方法:
 * 1. Apps Scriptエディタからこの関数を一度だけ手動で実行する
 * 2. テスト後、本番環境に移行する前に既存データを削除すること
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
 *
 * 使用方法:
 * 1. この関数を編集し、'YOUR_API_KEY_HERE'を実際のAPIキーに置き換える
 * 2. Apps Scriptエディタから一度だけこの関数を実行する
 * 3. 実行後、コード内のAPIキーは削除してください（スクリプトプロパティに保存されています）
 *
 * 注意: APIキーをコード内に残さないでください
 */
function setApiKey() {
  const apiKey = 'YOUR_API_KEY_HERE'; // ここに実際のAPIキーを入力

  if (apiKey === 'YOUR_API_KEY_HERE') {
    throw new Error('APIキーを設定してください。YOUR_API_KEY_HEREを実際のAPIキーに置き換えてください。');
  }

  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', apiKey);
  Logger.log('APIキーが正常に設定されました。セキュリティのため、コード内のAPIキーは削除してください。');
}

/**
 * 内部ドメインと許可されたテスターメールアドレスを設定（一度だけ実行）
 *
 * 使用方法:
 * 1. この関数を編集し、実際の値に置き換える
 * 2. Apps Scriptエディタから一度だけこの関数を実行する
 */
function setupSecuritySettings() {
  // 内部ドメイン（例: '@yourcompany.com'）
  PropertiesService.getScriptProperties().setProperty('INTERNAL_DOMAIN', '@yourcompany.com');

  // 外部テスター用メールアドレス（カンマ区切り）
  PropertiesService.getScriptProperties().setProperty('ALLOWED_TESTER_EMAILS', 'tester1@example.com,tester2@example.com');

  Logger.log('セキュリティ設定が完了しました。');
}
