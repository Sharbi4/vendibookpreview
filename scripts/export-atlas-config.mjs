import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const file='src/lib/atlas/atlasConfig.ts';
const compiled=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const output={exports:{}};
new Function('exports','module',compiled)(output.exports,output);
const config=output.exports;
writeFileSync('docs/atlas/atlas-system-prompt.txt',config.ATLAS_SYSTEM_PROMPT+'\n');
writeFileSync('docs/atlas/atlas-first-message.txt',config.ATLAS_FIRST_MESSAGE+'\n');
writeFileSync('docs/atlas/atlas-client-tools.json',JSON.stringify(config.ATLAS_TOOL_DEFINITIONS,null,2)+'\n');
console.log(`Exported Atlas prompt and ${config.ATLAS_TOOL_DEFINITIONS.length} client tool definitions.`);
const knowledgeCode=ts.transpileModule(readFileSync('src/lib/atlas/atlasOperatorKnowledge.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const knowledge={exports:{}};
new Function('exports','module',knowledgeCode)(knowledge.exports,knowledge);
const chapters=knowledge.exports.OPERATOR_CHAPTERS;
const lines=['# Atlas operator research library','',`Reviewed: ${knowledge.exports.OPERATOR_REVIEWED_ON}`,'',
  'Runtime source: src/lib/atlas/atlasOperatorKnowledge.ts. Served to Atlas by get_operator_guidance after the frontend and provider tool configuration are deployed. This export is not evidence of a provider upload or completed live sync.', '',
  'Source summaries are separated from editorial questions and recommendations. Platform rules, local adoption and exact equipment requirements must be revalidated before acting. This is selected US guidance, not an exhaustive national code database.', ''];
for(const [key,c] of Object.entries(chapters)) {
  lines.push(`## ${c.title}`, '', `Topic: ${key}. Review interval: ${c.reviewAfterDays} days.`, '');
  for(const [label,field] of [['Reference summary','facts'],['Discovery questions','questions'],['Suggested next steps','nextSteps'],['Limits','limits']]) {
    lines.push(`### ${label}`, '', ...c[field].map(x=>`- ${x}`), '');
  }
  lines.push('### Sources','',...c.sources.map(s=>`- [${s.authority}](${s.url}) — ${s.scope}`),'');
}
lines.push('## Research maintenance','',
  '- Platform pages: review at least every 30 days and before onboarding. Technical references: review on the stated interval and whenever the actual equipment model changes.',
  '- Local rules: use the separate dated permit library. The Los Angeles County plan-check URL returned a redirect loop during this research pass; its older library review date was not advanced. Verify with the agency before relying on it.',
  '- Do not upload static listings, prices or availability as lasting knowledge. Those remain live tool lookups.',
  '- Conversation simulations must verify truthful eligibility, source scope, unsupported model/city handling and no unauthorized actions. Automated code tests do not establish sales performance.', '');
writeFileSync('docs/atlas/operator-research-library.md',lines.join('\n'));
console.log(`Exported ${Object.keys(chapters).length} operator research chapters.`);
