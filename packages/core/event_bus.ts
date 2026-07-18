import { EventEmitter } from "node:events";

export type EventType =
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "FILE_READ"
  | "FILE_WRITTEN"
  | "BUILD_STARTED"
  | "BUILD_FAILED"
  | "BUILD_SUCCEEDED"
  | "MODEL_SWITCHED"
  | "ZIP_CREATED"
  | "DOWNLOAD_READY"
  | "PLUGIN_TRIGGERED"
  | "TOOL_PROGRESS"
  | "STATUS_UPDATE";

export interface RuntimeEvent {
  type: EventType;
  timestamp: string;
  payload: Record<string, any>;
}

export class event_bus extends EventEmitter {
  emitEvent(type: EventType, payload: Record<string, any> = {}) {
    const event: RuntimeEvent = {
      type,
      timestamp: new Date().toISOString(),
      payload
    };
    this.emit(type, event);
    this.emit("*", event); // wildcard subscription
  }
}

export const eventBus = new event_bus();
