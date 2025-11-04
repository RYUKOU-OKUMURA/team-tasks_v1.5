declare namespace google {
  namespace script {
    interface Run {
      withSuccessHandler(handler: (result: any) => void): Run;
      withFailureHandler(handler: (error: Error) => void): Run;
      getCurrentUser(): void;
      getUsers(): void;
      getTasks(): void;
      createTask(taskData: any): void;
      updateTask(taskId: string, updates: any): void;
      deleteTask(taskId: string): void;
      parseTaskWithAI(description: string): void;
    }
    const run: Run;
  }
}

