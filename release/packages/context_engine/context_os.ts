import { sessionMemory } from "../memory/session_memory.js";
import { workspaceMemory } from "../memory/workspace_memory.js";
import { toolMemory } from "../memory/tool_memory.js";
import { stateMachine } from "./state_machine.js";
import { promptBuilder } from "./prompt_builder.js";
import { eventBus } from "./event_bus.js";

export class ContextOSOrchestrator {
  public sessions = sessionMemory;
  public workspace = workspaceMemory;
  public tools = toolMemory;
  public state = stateMachine;
  public prompts = promptBuilder;
  public events = eventBus;
}

export const ContextOS = new ContextOSOrchestrator();
