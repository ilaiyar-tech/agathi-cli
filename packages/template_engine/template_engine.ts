export class template_engine {
  render(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
      const keys = key.split(".");
      let value = variables;
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          return match;
        }
      }
      return String(value);
    });
  }

  compile(template: string): (variables: Record<string, any>) => string {
    return (variables: Record<string, any>) => this.render(template, variables);
  }
}

export const templates = new template_engine();
