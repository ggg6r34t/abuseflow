export interface TemplateVariables {
  client_name: string;
  trademark_name: string;
  registration_number: string;
  jurisdiction: string;
  urls: string;
}

const PLACEHOLDER_PATTERN = /{{\s*([a-z_]+)\s*}}/gi;

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(PLACEHOLDER_PATTERN, (_, rawKey: string) => {
    const key = rawKey.toLowerCase() as keyof TemplateVariables;
    return variables[key] ?? "";
  });
}
