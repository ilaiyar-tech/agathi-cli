function extractParenthesisContent(str, startIdx) {
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

function extractJson(str) {
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

function parseCustomToolCalls(msg) {
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
      console.log("JSON parse error, trying fallback...", e.message);
      // Fallback: parse using string/regex extraction if JSON.parse fails due to unescaped quotes!
      const nameMatch = jsonStr.match(/"name"\s*:\s*"([a-zA-Z0-9_]+)"/);
      if (nameMatch) {
        const name = nameMatch[1];
        const argsMatch = jsonStr.match(/"arguments"\s*:\s*(\{[\s\S]*\})/);
        if (argsMatch) {
          const argsContent = argsMatch[1];
          // Match keys and values using regex that tolerates unescaped quotes
          const cmdMatch = argsContent.match(/"command"\s*:\s*"([\s\S]*?)"\s*}/) || argsContent.match(/"command"\s*:\s*"([\s\S]*)"/);
          const pathMatch = argsContent.match(/"path"\s*:\s*"([\s\S]*?)"/);
          const contentMatch = argsContent.match(/"content"\s*:\s*"([\s\S]*?)"/);
          
          let parsedArgs = {};
          if (cmdMatch) parsedArgs.command = cmdMatch[1];
          if (pathMatch) parsedArgs.path = pathMatch[1];
          if (contentMatch) parsedArgs.content = contentMatch[1];
          
          if (Object.keys(parsedArgs).length > 0) {
            msg.tool_calls = [{
              id: `call_${Date.now()}`,
              type: "function",
              function: {
                name,
                arguments: JSON.stringify(parsedArgs)
              }
            }];
            msg.content = content.replace(jsonStr, "").trim();
            return;
          }
        }
      }
    }
  }
}

// Test case with unescaped double quotes inside HTML command!
const content = `{"name": "run_command", "arguments": {"command": "cd test-web-app && echo "<html><body><h1>Hello World</h1></body></html>" > index.html"}}`;
const msg = { content };
parseCustomToolCalls(msg);
console.log("Parsed result:", JSON.stringify(msg, null, 2));
