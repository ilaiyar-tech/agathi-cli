import chalk from "chalk";

export class CLIRenderer {
  private inToolContext = false;
  private currentLoaderText = "";
  private loaderTimer: NodeJS.Timeout | null = null;
  private loaderFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private frameIdx = 0;
  private assistantContent = "";
  private isInteractive = false;
  private isSummaryState = false;

  constructor(isInteractive: boolean = false) {
    this.isInteractive = isInteractive;
  }

  public getPromptPrefix() {
    return this.isInteractive ? chalk.magenta("அ › ") : chalk.cyan("Assistant: ");
  }

  public updateLoader() {
    if (this.loaderTimer && process.stdout.isTTY) {
       process.stdout.write("\r\x1b[K" + this.getPromptPrefix() + chalk.gray(this.loaderFrames[this.frameIdx] + " " + this.currentLoaderText));
    }
  }

  public clearLoader() {
    if (this.loaderTimer) {
      clearInterval(this.loaderTimer);
      this.loaderTimer = null;
      if (process.stdout.isTTY) {
        process.stdout.write("\r\x1b[K" + this.getPromptPrefix());
      }
    }
  }

  public startReasoning() {
    this.currentLoaderText = "Thinking...";
    this.startLoader();
  }

  public startLoader() {
    this.clearLoader();
    if (!process.stdout.isTTY) {
      process.stdout.write("\n" + this.getPromptPrefix() + chalk.gray("⏳ " + this.currentLoaderText) + "\n");
      // Set dummy timer to keep track of state, but don't spin
      this.loaderTimer = setTimeout(() => {}, 0) as any;
      return;
    }
    process.stdout.write("\n" + this.getPromptPrefix() + chalk.gray(this.loaderFrames[this.frameIdx] + " " + this.currentLoaderText));
    this.loaderTimer = setInterval(() => {
      this.frameIdx = (this.frameIdx + 1) % this.loaderFrames.length;
      this.updateLoader();
    }, 80);
  }

  public processStreamText(txt: string) {
    this.assistantContent += txt;
    
    if (txt.includes("__TOOL_EVENT__:")) {
      const lines = txt.split("\n");
      for (const line of lines) {
        if (line.includes("__TOOL_EVENT__:_END_")) continue; // Fallback
        if (line.includes("__TOOL_EVENT__:_START_")) continue; // Fallback
        if (line.includes("__TOOL_EVENT__: {")) continue;
        
        const evtIdx = line.indexOf("__TOOL_EVENT__:");
        if (evtIdx !== -1) {
           const jsonStr = line.substring(evtIdx + 15).trim();
           try {
             const evt = JSON.parse(jsonStr);
             if (evt.event === "start") {
               this.clearLoader();
               let toolTitle = evt.tool;
               if (toolTitle === "browser_action") toolTitle = "🌐 Browser";
               else if (toolTitle === "run_command") toolTitle = "⚡ Terminal";
               else if (toolTitle === "read_file" || toolTitle === "write_file" || toolTitle === "search_files") toolTitle = "📁 Filesystem";
               else if (toolTitle === "verify_build") toolTitle = "🛡️  Verification";
               else toolTitle = `⚙ ${evt.tool}`;
               
               console.log(chalk.bold.cyan(`\n${toolTitle}`));
               
               if (evt.tool === "browser_action") {
                 console.log(chalk.gray(`    Opening ${evt.args?.url || "URL"}`));
                 console.log(chalk.gray(`    Extracting page data`));
                 this.currentLoaderText = "Processing page...";
               } else if (evt.tool === "run_command") {
                 console.log(chalk.gray(`    Executing: ${evt.args?.command}`));
                 this.currentLoaderText = "Running command...";
               } else if (evt.tool === "write_file") {
                 console.log(chalk.gray(`    Writing: ${evt.args?.path}`));
                 this.currentLoaderText = "Writing file...";
               } else if (evt.tool === "verify_build") {
                 console.log(chalk.gray(`    Running automatic build & tests`));
                 this.currentLoaderText = "Verifying...";
               } else {
                 console.log(chalk.gray(`    Executing tool...`));
                 this.currentLoaderText = "Executing...";
               }
               
               this.startLoader();
             } else if (evt.event === "end") {
               this.clearLoader();
               if (evt.success) {
                 console.log(chalk.green(`    ✓ Completed`));
               } else {
                 console.log(chalk.red(`    ✗ Failed`));
               }
               this.currentLoaderText = "🤖 Reasoning...";
               this.startLoader();
             } else if (evt.event === "retry") {
               this.clearLoader();
               console.log(chalk.yellow(`    ↻ Refining query...`));
               this.currentLoaderText = "🤖 Reasoning...";
               this.startLoader();
             } else if (evt.event === "validation") {
               this.clearLoader();
               console.log(chalk.magenta(`    ⚠ Relevance check`));
               if (evt.message) console.log(chalk.gray(`      ${evt.message}`));
               this.currentLoaderText = "🤖 Reasoning...";
               this.startLoader();
             } else if (evt.event === "summary") {
               this.clearLoader();
               console.log(chalk.bold.cyan(`\n✨ Final Response\n`));
               this.isSummaryState = true;
             }
           } catch (e) {
             // Fallback print if parsing fails
           }
        }
      }
      
      const cleanTxt = txt.replace(/\n?__TOOL_EVENT__:\{.*\}/g, "");
      if (cleanTxt.trim() && this.isSummaryState) {
         this.clearLoader();
         process.stdout.write(cleanTxt);
         if (cleanTxt.endsWith("\n")) {
           this.startLoader();
         }
      }
    } else {
       if (this.isSummaryState) {
         this.clearLoader();
         process.stdout.write(txt);
       }
    }
  }

  public endStream() {
    this.clearLoader();
    console.log("\n");
  }

  public getContent() {
    return this.assistantContent;
  }
}
