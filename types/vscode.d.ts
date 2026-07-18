declare module 'vscode' {
  export interface ExtensionContext {
    subscriptions: any[];
    extensionUri: Uri;
  }
  export interface Uri {
    path: string;
  }
  export const StatusBarAlignment: {
    Right: number;
    Left: number;
  };
  export interface StatusBarItem {
    text: string;
    tooltip: string;
    show(): void;
  }
  export interface Webview {
    options: any;
    html: string;
    onDidReceiveMessage(callback: (message: any) => void): any;
    postMessage(message: any): Thenable<boolean>;
  }
  export interface WebviewView {
    webview: Webview;
  }
  export interface WebviewViewResolveContext {}
  export interface CancellationToken {}
  export interface WebviewViewProvider {
    resolveWebviewView(
      webviewView: WebviewView,
      context: WebviewViewResolveContext,
      token: CancellationToken
    ): void | Thenable<void>;
  }
  export const window: {
    createOutputChannel(name: string): any;
    createStatusBarItem(alignment?: number, priority?: number): StatusBarItem;
    registerWebviewViewProvider(viewId: string, provider: WebviewViewProvider, options?: any): any;
    activeTextEditor: any;
    showWarningMessage(msg: string): void;
    showErrorMessage(msg: string): void;
    showInformationMessage(msg: string): void;
    showTextDocument(document: any, column?: number): Thenable<any>;
    withProgress(options: any, task: (progress: any, token: any) => Promise<any>): Thenable<any>;
  };
  export const commands: {
    executeCommand(command: string, ...args: any[]): Thenable<any>;
    registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): any;
  };
  export const workspace: {
    getConfiguration(section?: string): WorkspaceConfiguration;
    openTextDocument(options?: any): Thenable<any>;
  };
  export interface WorkspaceConfiguration {
    get<T>(section: string): T | undefined;
  }
  export const ProgressLocation: {
    Notification: number;
  };
  export const ViewColumn: {
    Beside: number;
  };
}
