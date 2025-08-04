import path from "node:path";
import fs from "node:fs";

function loadTemplate(): string {
  const templatePath = path.resolve(__dirname, '..', 'src', 'template', 'risk-comment.md');
  return fs.readFileSync(templatePath, 'utf8');
}

function renderTemplate(template: string, data: any): string {
  let result = template;

  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, data[key]);
  });

  result = result.replace(/{{#if activeFactors}}[\s\S]*?{{else}}([\s\S]*?){{\/if}}/g,
    data.activeFactors.length > 0 ? '' : '$1');

  result = result.replace(/{{#if activeFactors}}([\s\S]*?){{else}}[\s\S]*?{{\/if}}/g,
    data.activeFactors.length > 0 ? '$1' : '');

  if (data.activeFactors.length > 0) {
    const factorsList = data.activeFactors.map((f: any) => `- ${f.question} ⚠️`).join('\n');
    result = result.replace(/{{#each activeFactors}}[\s\S]*?{{\/each}}/g, factorsList);
  }

  // Handle results loop
  const resultsList = data.results.map((r: any) =>
    `| ${r.question} | ${r.answer} ${r.risk ? '⚠️' : '✅'} | ${r.weight} | ${r.evidence || '-'} |`
  ).join('\n');
  result = result.replace(/{{#each results}}[\s\S]*?{{\/each}}/g, resultsList);

  return result;
}

export {loadTemplate, renderTemplate}
