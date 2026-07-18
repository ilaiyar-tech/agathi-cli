import * as vscode from "vscode";
import http from "node:http";

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Ilaiyar Platform");
  outputChannel.appendLine("Ilaiyar VS Code Extension activated");

  // Create Status Bar indicator
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(hubot) Ilaiyar: Connected";
  statusBarItem.tooltip = "Target: http://127.0.0.1:9988";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register WebView Chat View
  const chatProvider = new IlaiyarChatProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("ilaiyar-chat-view", chatProvider)
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("ilaiyar.chat", () => {
      vscode.commands.executeCommand("workbench.view.extension.ilaiyar-sidebar");
    })
  );

  const registerCodeActionCommand = (commandId: string, instruction: string) => {
    return vscode.commands.registerCommand(commandId, async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active text editor found.");
        return;
      }

      const selection = editor.document.getText(editor.selection) || editor.document.getText();
      outputChannel.appendLine(`Executing: ${commandId}`);

      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Ilaiyar: ${instruction}...`,
        cancellable: true
      }, async (progress: any, token: vscode.CancellationToken) => {
        try {
          const result = await callDxpCompletion(instruction, selection);
          // Insert or present result
          const responseDoc = await vscode.workspace.openTextDocument({
            content: result,
            language: editor.document.languageId
          });
          await vscode.window.showTextDocument(responseDoc, vscode.ViewColumn.Beside);
        } catch (e: any) {
          vscode.window.showErrorMessage(`Ilaiyar failed: ${e.message}`);
        }
      });
    });
  };

  context.subscriptions.push(registerCodeActionCommand("ilaiyar.explain", "Explain the following code"));
  context.subscriptions.push(registerCodeActionCommand("ilaiyar.refactor", "Refactor the following code to make it clean"));
  context.subscriptions.push(registerCodeActionCommand("ilaiyar.fix", "Fix any bugs or lint errors in this code"));
  context.subscriptions.push(registerCodeActionCommand("ilaiyar.generateTests", "Generate complete unit tests for this code"));
  
  context.subscriptions.push(
    vscode.commands.registerCommand("ilaiyar.summarizeWorkspace", async () => {
      vscode.window.showInformationMessage("Summarizing workspace context using Knowledge Intelligence Layer...");
    })
  );
}

class IlaiyarChatProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 10px; color: var(--vscode-editor-foreground); background-color: var(--vscode-sideBar-background); }
          textarea { width: 100%; height: 80px; margin-bottom: 10px; }
          button { width: 100%; padding: 8px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; cursor: pointer; }
          #response { margin-top: 15px; font-size: 13px; line-height: 1.4; }
        </style>
      </head>
      <body>
        <h3>Ilaiyar Chat</h3>
        <textarea id="prompt" placeholder="Ask Ilaiyar..."></textarea>
        <button onclick="send()">Send Prompt</button>
        <div id="response"></div>
        <script>
          const vscode = acquireVsCodeApi();
          function send() {
            const prompt = document.getElementById("prompt").value;
            vscode.postMessage({ command: "ask", text: prompt });
          }
          window.addEventListener("message", event => {
            const message = event.data;
            if (message.command === "response") {
              document.getElementById("response").innerText = message.text;
            }
          });
        </script>
      </body>
      </html>
    `;

    webviewView.webview.onDidReceiveMessage(async (data: any) => {
      if (data.command === "ask") {
        try {
          const res = await callDxpCompletion(data.text, "");
          webviewView.webview.postMessage({ command: "response", text: res });
        } catch (e: any) {
          webviewView.webview.postMessage({ command: "response", text: `Error: ${e.message}` });
        }
      }
    });
  }
}

async function callDxpCompletion(instruction: string, context: string): Promise<string> {
  const config = vscode.workspace.getConfiguration("ilaiyar");
  const urlString = config.get<string>("runtimeUrl") || "http://127.0.0.1:9988";
  const pat = config.get<string>("pat") || "";

  const url = new URL(urlString);
  const payload = JSON.stringify({
    model: config.get<string>("model") || "ilaiyar-runtime",
    messages: [
      { role: "system", content: instruction },
      { role: "user", content: context || "Execute" }
    ]
  });

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port ? Number(url.port) : 80,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pat}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Server returned HTTP ${res.statusCode}: ${body}`));
          return;
        }
        try {
          const parsed = JSON.parse(body);
          resolve(parsed.choices[0].message.content);
        } catch {
          reject(new Error("Failed to parse server response JSON"));
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

export function deactivate() {}
