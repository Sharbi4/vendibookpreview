import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
const cache = {};
function load(name) {
 if (cache[name]) return cache[name];
 const out = { exports: {} }; cache[name] = out.exports;
 const code = ts.transpileModule(readFileSync(`src/lib/atlas/${name}.ts`, 'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('exports','module','require',code)(out.exports,out, ref => load(ref.replace('./','')));
 return out.exports;
}
const config=load('allisonConfig'); const knowledge=load('allisonKnowledge'); const guide=load('atlasGuideFaq');
writeFileSync('docs/atlas/allison-system-prompt.txt',config.ALLISON_SYSTEM_PROMPT+'\n');
writeFileSync('docs/atlas/allison-first-message.txt',config.ALLISON_FIRST_MESSAGE+'\n');
writeFileSync('docs/atlas/allison-client-tools.json',JSON.stringify(config.ALLISON_TOOL_DEFINITIONS,null,2)+'\n');
writeFileSync('docs/atlas/allison-knowledge-base.json',JSON.stringify({version:knowledge.ALLISON_KNOWLEDGE_VERSION,pricing_rule:'Always call get_pricing for current active catalog quotes. Static amounts are historical context.',playbooks:knowledge.ALLISON_PLAYBOOK,faq_source:guide.GUIDE_VERSION,faq:guide.GUIDE_FAQ},null,2)+'\n');
console.log(`Exported Allison prompt, ${config.ALLISON_TOOL_DEFINITIONS.length} tools, ${knowledge.ALLISON_PLAYBOOK.length} playbooks and ${guide.GUIDE_FAQ.length} FAQ entries.`);
