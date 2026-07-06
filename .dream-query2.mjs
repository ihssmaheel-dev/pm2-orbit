import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/ihssm/.local/share/mimocode/mimocode.db', { open: true, readOnly: true });

// Check which checkpoint sessions belong to this project
const ids = [
  'ses_0f10f517dffeWsERreUtwAqAaE',
  'ses_11991e7d8ffeXYrUzlN6a4Bnti',
  'ses_1149a76a5ffeATBOEN5qzVvExq',
  'ses_114d57fe0ffeCElh0WFaEru7LA',
  'ses_138a76f06ffeFvuu6DU6xSaD4K',
  'ses_1260cd4baffeSuRyGw8719y7C4',
  'ses_12067f3f9ffexln4c4LhwEd83m',
  'ses_12955d8c2ffeXFq5eITiN1yLY6',
];

const stmt = db.prepare('SELECT id, project_id, title, time_created FROM session WHERE id = ?');
for (const id of ids) {
  const row = stmt.get(id);
  if (row) {
    console.log(`${row.id}  project=${row.project_id}  ${new Date(row.time_created).toISOString()}  "${row.title.slice(0, 80)}"`);
  }
}

// Get message summary for the two user sessions
console.log('\n=== Session 1: ses_0f04df130ffei3DA6Q92e2pMDt (Thorough codebase review) ===');
const msgCount1 = db.prepare("SELECT count(*) as c FROM message WHERE session_id = 'ses_0f04df130ffei3DA6Q92e2pMDt'").get();
console.log(`Total messages: ${msgCount1.c}`);

const userMsgs1 = db.prepare("SELECT id, substr(json_extract(data, '$.content'), 1, 200) as preview FROM message WHERE session_id = 'ses_0f04df130ffei3DA6Q92e2pMDt' AND json_extract(data, '$.role') = 'user' ORDER BY time_created").all();
console.log(`User messages: ${userMsgs1.length}`);
for (const m of userMsgs1) {
  console.log(`  [${m.id}] ${m.preview}`);
}

console.log('\n=== Session 2: ses_0f6226216ffePfNCcmKo2o6QAC (Codebase and doc.md review) ===');
const msgCount2 = db.prepare("SELECT count(*) as c FROM message WHERE session_id = 'ses_0f6226216ffePfNCcmKo2o6QAC'").get();
console.log(`Total messages: ${msgCount2.c}`);

const userMsgs2 = db.prepare("SELECT id, substr(json_extract(data, '$.content'), 1, 200) as preview FROM message WHERE session_id = 'ses_0f6226216ffePfNCcmKo2o6QAC' AND json_extract(data, '$.role') = 'user' ORDER BY time_created").all();
console.log(`User messages: ${userMsgs2.length}`);
for (const m of userMsgs2) {
  console.log(`  [${m.id}] ${m.preview}`);
}
