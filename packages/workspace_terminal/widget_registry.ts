export type WidgetLifecycleState =
  | "CREATED"
  | "LOADING"
  | "ACTIVE"
  | "UPDATING"
  | "COLLAPSED"
  | "HIDDEN"
  | "DESTROYED";

export type DockPosition = "LEFT" | "RIGHT" | "BOTTOM" | "CENTER" | "FLOATING";

export interface WorkspaceWidget {
  id: string;
  title: string;
  priority: number; // Higher priority = remains visible under tight space
  preferredWidth: number;
  preferredHeight: number;
  visible: boolean;
  state: WidgetLifecycleState;
  dock: DockPosition;
  render(width: number, height: number): string[];
  update?(): void;
  resize?(width: number, height: number): void;
  dispose?(): void;
}

export class WidgetRegistry {
  private static widgets = new Map<string, WorkspaceWidget>();

  static register(widget: WorkspaceWidget) {
    widget.state = "CREATED";
    this.widgets.set(widget.id, widget);
    widget.state = "ACTIVE";
  }

  static unregister(id: string) {
    const w = this.widgets.get(id);
    if (w) {
      w.state = "DESTROYED";
      if (w.dispose) w.dispose();
      this.widgets.delete(id);
    }
  }

  static getWidget(id: string): WorkspaceWidget | undefined {
    return this.widgets.get(id);
  }

  static getWidgets(): WorkspaceWidget[] {
    return Array.from(this.widgets.values());
  }

  static show(id: string) {
    const w = this.widgets.get(id);
    if (w) {
      w.visible = true;
      w.state = "ACTIVE";
    }
  }

  static hide(id: string) {
    const w = this.widgets.get(id);
    if (w) {
      w.visible = false;
      w.state = "HIDDEN";
    }
  }

  static updateWidgetState(id: string, state: WidgetLifecycleState) {
    const w = this.widgets.get(id);
    if (w) {
      w.state = state;
    }
  }

  static updateWidgetPriority(id: string, priority: number) {
    const w = this.widgets.get(id);
    if (w) {
      w.priority = priority;
    }
  }
}
