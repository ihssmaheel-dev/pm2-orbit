import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/ihssm/.local/share/mimocode/mimocode.db', { open: true, readOnly: true });

// Get the full assistant text messages from session 1 for key learnings
// Focus on the "fix" / "root cause" / "discovered" pattern
console.log('=== ASSISTANT TEXTS — Key learnings (Session 1) ===');
const texts1 = db.prepare(`
  SELECT substr(json_extract(p.data, '$.text'), 1, 600) as txt
  FROM part p
  JOIN message m ON p.message_id = m.id
  WHERE m.session_id = 'ses_0f04df130ffei3DA6Q92e2pMDt'
    AND json_extract(m.data, '$.role') = 'assistant'
    AND json_extract(p.data, '$.type') = 'text'
    AND (json_extract(p.data, '$.text') LIKE '%Root Cause%' 
         OR json_extract(p.data, '$.text') LIKE '%root cause%'
         OR json_extract(p.data, '$.text') LIKE '%Discovered%'
         OR json_extract(p.data, '$.text') LIKE '%discovered%')
  ORDER BY m.time_created
`).all();
console.log(`Found ${texts1.length} texts with root cause / discovered`);
for (const t of texts1) {
  console.log(`\n---\n${t.txt}`);
}

// Check the current version in package.json
console.log('\n=== CURRENT STATE CHECK ===');
const versionText = db.prepare(`
  SELECT substr(json_extract(p.data, '$.text'), 1, 300) as txt
  FROM part p
  JOIN message m ON p.message_id = m.id
  WHERE m.session_id = 'ses_0f04df130ffei3DA6Q92e2pMDt'
    AND json_extract(m.data, '$.role') = 'assistant'
    AND json_extract(p.data, '$.type') = 'text'
    AND json_extract(p.data, '$.text') LIKE '%v1.5%'
  ORDER BY m.time_created DESC
  LIMIT 5
`).all();
for (const t of versionText) {
  console.log(`  ${t.txt}`);
}

// Check session 2 for key learnings
console.log('\n=== ASSISTANT TEXTS — Key learnings (Session 2) ===');
const texts2 = db.prepare(`
  SELECT substr(json_extract(p.data, '$.text'), 1, 600) as txt
  FROM part p
  JOIN message m ON p.message_id = m.id
  WHERE m.session_id = 'ses_0f6226216ffePfNCcmKo2o6QAC'
    AND json_extract(m.data, '$.role') = 'assistant'
    AND json_extract(p.data, '$.type') = 'text'
    AND (json_extract(p.data, '$.text') LIKE '%Root Cause%' 
         OR json_extract(p.data, '$.text') LIKE '%root cause%'
         OR json_extract(p.data, '$.text') LIKE '%Discovered%'
         OR json_extract(p.data, '$.text') LIKE '%discovered%'
         OR json_extract(p.data, '$.text') LIKE '%Fixed%'
         OR json_extract(p.data, '$.text') LIKE '%fix%:')
  ORDER BY m.time_created
  LIMIT 20
`).all();
console.log(`Found ${texts2.length} texts`);
for (const t of texts2) {
  console.log(`\n---\n${t.txt}`);
}
