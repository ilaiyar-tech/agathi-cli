function extractParenthesisContent(str: string, startIdx: number): string | null {
  let parenCount = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === "(") parenCount++;
    else if (str[i] === ")") {
      parenCount--;
      if (parenCount === 0) {
        return str.slice(startIdx + 1, i);
      }
    }
  }
  return null;
}

function extractJson(str: string): string | null {
  const startIdx = str.indexOf("{");
  if (startIdx === -1) return null;

  let braceCount = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === "{") braceCount++;
    else if (str[i] === "}") {
      braceCount--;
      if (braceCount === 0) {
        return str.slice(startIdx, i + 1);
      }
    }
  }
  return null;
}

function parseCustomToolCalls(msg: any) {
  const content = msg.content;
  if (!content) return;

  // 1. Check for <function-call>
  const funcMatch = content.match(/<function-call>([\s\S]*?)<\/function-call>/);
  if (funcMatch) {
    try {
      const parsed = JSON.parse(funcMatch[1]);
      msg.tool_calls = [{
        id: `call_${Date.now()}`,
        type: "function",
        function: {
          name: parsed.name,
          arguments: typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments)
        }
      }];
      msg.content = content.replace(funcMatch[0], "").trim();
      return;
    } catch (e) {
      console.log("funcMatch parse error:", e);
    }
  }

  // 2. Check for [TOOL CALL]: name(args)
  const toolCallPrefix = "[TOOL CALL]:";
  const startIdx = content.indexOf(toolCallPrefix);
  if (startIdx !== -1) {
    const openParenIdx = content.indexOf("(", startIdx);
    if (openParenIdx !== -1) {
      const name = content.slice(startIdx + toolCallPrefix.length, openParenIdx).trim();
      const argsStr = extractParenthesisContent(content, openParenIdx);
      if (argsStr !== null && name) {
        msg.tool_calls = [{
          id: `call_${Date.now()}`,
          type: "function",
          function: {
            name,
            arguments: argsStr
          }
        }];
        const fullCallString = content.slice(startIdx, content.indexOf(")", openParenIdx + argsStr.length) + 1);
        msg.content = content.replace(fullCallString, "").trim();
        return;
      }
    }
  }

  // 3. Check for JSON block
  const jsonStr = extractJson(content);
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.name && parsed.arguments) {
        msg.tool_calls = [{
          id: `call_${Date.now()}`,
          type: "function",
          function: {
            name: parsed.name,
            arguments: typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments)
          }
        }];
        msg.content = content.replace(jsonStr, "").trim();
        return;
      }
    } catch (e) {
      console.log("JSON parse error:", e);
    }
  }
}

// Test case from user logs
const content = `{"name": "run_command", "arguments": {"command": "cd test-web-app && echo '<html><body><h1>Hello World</h1></body></html>' > index.html"}}`;
const msg = { content };
parseCustomToolCalls(msg);
console.log("Parsed result:", JSON.stringify(msg, null, 2));
