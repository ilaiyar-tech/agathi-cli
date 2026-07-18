import { IntentAnalyzer } from "./prompt_intelligence.js";

export interface IntentResult {
  intent: string;
  confidence: number;
  requiredCapabilities: string[];
  requiredTools: string[];
}

export class IntentEngine {
  classify(prompt: string): IntentResult {
    const p = prompt.toLowerCase().trim();
    
    // Default capabilities/tools mappings
    let intent = "Workspace";
    let confidence = 0.8;
    let requiredCapabilities: string[] = ["workspace"];
    let requiredTools: string[] = ["read_file", "write_file", "search_files"];

    // 1. Conversation
    const greetings = [
      "hi", "hello", "hey", "hola", "yo", "sup", "what's up",
      "machan", "da", "bro", "enna da", "enna pandra", "nallarukan", "nalla iruken", "eppadi irukenga", "vanakkam", "saptiya"
    ];
    if (greetings.some(g => p === g || p.startsWith(g + " ") || p.endsWith(" " + g))) {
      return {
        intent: "Conversation",
        confidence: 0.95,
        requiredCapabilities: [],
        requiredTools: []
      };
    }
    if (p.length < 10 && !p.includes("run") && !p.includes("git") && !p.includes("code")) {
      return {
        intent: "Conversation",
        confidence: 0.9,
        requiredCapabilities: [],
        requiredTools: []
      };
    }

    // 2. Image Generation
    if (p.includes("image") || p.includes("draw") || p.includes("picture") || p.includes("photo") || p.includes("illustration")) {
      return {
        intent: "Image Generation",
        confidence: 0.95,
        requiredCapabilities: ["image_generation"],
        requiredTools: ["generate_image"]
      };
    }

    // 3. Browser
    if (p.includes("browse") || p.includes("website text") || p.includes("page screenshot") || p.includes("url") || p.includes("open website")) {
      return {
        intent: "Browser",
        confidence: 0.95,
        requiredCapabilities: ["browser_automation"],
        requiredTools: ["browser_action"]
      };
    }

    // 4. Search
    if (p.includes("google") || p.includes("web search") || p.includes("bing")) {
      return {
        intent: "Search",
        confidence: 0.95,
        requiredCapabilities: ["web_search"],
        requiredTools: ["browser_action"]
      };
    }

    // 5. Research
    if (p.includes("research") || p.includes("investigate") || p.includes("trace")) {
      return {
        intent: "Research",
        confidence: 0.9,
        requiredCapabilities: ["file_search", "web_search"],
        requiredTools: ["search_files", "browser_action"]
      };
    }

    // 6. Python
    if (p.includes("python") || p.includes(".py") || p.includes("run script")) {
      return {
        intent: "Python",
        confidence: 0.95,
        requiredCapabilities: ["command_execution"],
        requiredTools: ["run_command"]
      };
    }

    // 7. Bash
    if (p.includes("bash") || p.includes("run command") || p.includes("terminal") || p.includes("execute command")) {
      return {
        intent: "Bash",
        confidence: 0.95,
        requiredCapabilities: ["command_execution"],
        requiredTools: ["run_command"]
      };
    }

    // 8. Website Generation
    if (p.includes("website") || p.includes("web page") || p.includes("html page") || p.includes("whatsapp chat simulation")) {
      return {
        intent: "Website Generation",
        confidence: 0.95,
        requiredCapabilities: ["workspace_write", "command_execution"],
        requiredTools: ["write_file", "replace_file_content", "run_command"]
      };
    }

    // 9. File Generation
    if (p.includes("create file") || p.includes("write file") || p.includes("generate file") || p.includes("new file")) {
      return {
        intent: "File Generation",
        confidence: 0.95,
        requiredCapabilities: ["workspace_write"],
        requiredTools: ["write_file"]
      };
    }

    // 10. Coding
    if (p.includes("code") || p.includes("function") || p.includes("class") || p.includes("refactor") || p.includes("bug") || p.includes("fix") || p.includes("implementation") || p.includes("compile") || p.includes("lint") || p.includes("syntax")) {
      return {
        intent: "Coding",
        confidence: 0.9,
        requiredCapabilities: ["workspace_read", "workspace_write"],
        requiredTools: ["read_file", "write_file", "replace_file_content"]
      };
    }

    // 11. Git
    if (p.includes("git") || p.includes("commit") || p.includes("repo") || p.includes("repository")) {
      return {
        intent: "Git",
        confidence: 0.95,
        requiredCapabilities: ["git_management"],
        requiredTools: ["run_command"]
      };
    }

    // 12. Documentation
    if (p.includes("documentation") || p.includes("docs") || p.includes("readme") || p.includes("help")) {
      return {
        intent: "Documentation",
        confidence: 0.85,
        requiredCapabilities: ["workspace_read"],
        requiredTools: ["read_file", "search_files"]
      };
    }

    // 13. System
    if (p.includes("system status") || p.includes("memory") || p.includes("process") || p.includes("cpu")) {
      return {
        intent: "System",
        confidence: 0.9,
        requiredCapabilities: ["system_info"],
        requiredTools: []
      };
    }

    // Default Fallback
    const analyzer = new IntentAnalyzer();
    const classification = analyzer.classify(prompt);
    if (classification.category === "conversation") {
      return {
        intent: "Conversation",
        confidence: 0.7,
        requiredCapabilities: [],
        requiredTools: []
      };
    }

    return {
      intent: "Workspace",
      confidence: 0.65,
      requiredCapabilities: requiredCapabilities,
      requiredTools: requiredTools
    };
  }
}

export const intentEngine = new IntentEngine();
