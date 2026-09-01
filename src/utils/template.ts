export type TemplateParams = Record<string, string | number>;

export function render(template: string, params: TemplateParams = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}
