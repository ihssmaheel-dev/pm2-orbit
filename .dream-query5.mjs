import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/ihssm/.local/share/mimocode/mimocode.db', { open: true, readOnly: true });

// Look at file writes in session 1 (Thorough codebase review)
console.log('=== FILE WRITES (Session 1) ===');
const writes1 = db.prepare(`
  SELECT substr(json_extract(p.data, '$.tool'), 1, 50) as tool,
         substr(json_extract(p.data, '$.state.input'), 1, 400) as input_preview
  FROM part p
  JOIN message m ON p.message_id = m.id
  WHERE m.session_id = 'ses_0f04df130ffei3DA6Q92e2pMDt'
    AND json_extract(m.data, '$.role') = 'assistant'
    AND json_extract(p.data, '$.type') = 'tool'
    AND json_extract(p.data, '$.tool') IN ('write', 'edit')
  ORDER BY m.time_created
`).all();
console.log(`Total write/edit calls: ${writes1.length}`);
// Show last 30 writes
for (const w of writes1.slice(-30)) {
  console.log(`  [${w.tool}] ${w.input_preview?.slice(0, 200)}`);
}

console.log('\n=== FILE WRITES (Session 2) ===');
const writes2 = db.prepare(`
  SELECT substr(json_extract(p.data, '$.tool'), 1, 50) as tool,
         substr(json_extract(p.data, '$.state.input'), 1, 400) as input_preview
  FROM part p
  JOIN message m ON p.message_id = m.id
  WHERE m.session_id = 'ses_0f6226216ffePfNCcmKo2o6QAC'
    AND json_extract(m.data, '$.role') = 'assistant'
    AND json_extract(p.data, '$.type') = 'tool'
    AND json_extract(p.data, '$.tool') IN ('write', 'edit')
  ORDER BY m.time_created
`).all();
console.log(`Total write/edit calls: ${writes2.length}`);
for (const w of writes2.slice(-30)) {
  console.log(`  [${w.tool}] ${w.input_preview?.slice(0, 200)}`);
}

// Search for error/fix patterns in assistant text
console.log('\n=== ASSISTANT TEXT WITH "fix" (Session 1, last 20) ===');
const fixTexts1 = db.prepare(`
  SELECT substr(json_extract(p.data, '$.text'), 1, 400) as txt
  FROM part p
  JOIN message m ON p.message_id = m.id
  WHERE m.session_id = 'ses_0f04df130ffei3DA6Q92e2pMDt'
    AND json_extract(m.data, '$.role') = 'assistant'
    AND json_extract(p.data, '$.type') = 'text'
    AND json_extract(p.data, '$.text') LIKE '%fix%'
  ORDER BY m.time_created DESC
  LIMIT 10
`).all();
for (const t of fixTexts1) {
  console.log(`  > ${t.txt?.slice(0, 300)}`);
  console.log();
}

// Git log for both sessions
console.log('\n=== GIT LOG CHECK ===');
// Look for git-related tool calls
const gitCalls = db.prepare(`
  SELECT substr(json_extract(p.data, '$.state.input'), 1, 300) as input_preview
  FROM part p
  JOIN message m ON p.message_id = m.id
  WHERE m.session_id = 'ses_0f04df130ffei3DA6Q92e2pMDt'
    AND json_extract(m.data, '$.role') = 'assistant'
    AND json_extract(p.data, '$.type') = 'tool'
    AND json_extract(p.data, '$.tool') = 'bash'
    AND json_extract(p.data, '$.state.input') LIKE '%git%'
  ORDER BY m.time_created DESC
  LIMIT 10
`).all();
console.log('Git commands (Session 1):');
for (const g of gitCalls) {
  console.log(`  ${g.input_preview?.slice(0, 200)}`);
}
