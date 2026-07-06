import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/ihssm/.local/share/mimocode/mimocode.db', { open: true, readOnly: true });

// Search for key user statements in both sessions
const keywords = ['always', 'never', 'remember', 'rule', 'decision', 'decided', 'reason', 'repeat', 'every time', 'workflow', 'preference', 'must', 'important'];

console.log('=== KEY USER STATEMENTS (Session 1) ===');
for (const kw of keywords) {
  const rows = db.prepare(`
    SELECT substr(json_extract(p.data, '$.text'), 1, 400) as txt
    FROM part p
    JOIN message m ON p.message_id = m.id
    WHERE m.session_id = 'ses_0f04df130ffei3DA6Q92e2pMDt'
      AND json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
      AND json_extract(p.data, '$.text') LIKE '%${kw}%'
    ORDER BY m.time_created
    LIMIT 5
  `).all();
  if (rows.length > 0) {
    console.log(`\n[${kw}]:`);
    for (const r of rows) {
      console.log(`  > ${r.txt}`);
    }
  }
}

console.log('\n\n=== KEY USER STATEMENTS (Session 2) ===');
for (const kw of keywords) {
  const rows = db.prepare(`
    SELECT substr(json_extract(p.data, '$.text'), 1, 400) as txt
    FROM part p
    JOIN message m ON p.message_id = m.id
    WHERE m.session_id = 'ses_0f6226216ffePfNCcmKo2o6QAC'
      AND json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
      AND json_extract(p.data, '$.text') LIKE '%${kw}%'
    ORDER BY m.time_created
    LIMIT 5
  `).all();
  if (rows.length > 0) {
    console.log(`\n[${kw}]:`);
    for (const r of rows) {
      console.log(`  > ${r.txt}`);
    }
  }
}
