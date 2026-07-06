import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/ihssm/.local/share/mimocode/mimocode.db', { open: true, readOnly: true });

// Find non-checkpoint-writer sessions for this project
const sessions = db.prepare(`
  SELECT s.id, s.title, s.time_created,
    (SELECT count(*) FROM message m WHERE m.session_id = s.id) as msg_count
  FROM session s
  WHERE s.project_id = '85212513-b398-4d5b-af68-ab0e777112c1'
    AND s.title NOT LIKE 'checkpoint-writer:%'
    AND s.id != 'ses_0c773ab1fffemoRqwFRUH26sXM'
  ORDER BY s.time_created DESC
`).all();

console.log('=== NON-CHECKPOINT-WRITER SESSIONS ===');
for (const s of sessions) {
  const date = new Date(s.time_created).toISOString();
  console.log(`  ${s.id}  msgs=${s.msg_count}  ${date}  "${s.title}"`);
}

// Also check: sessions within last 7 days
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const recentSessions = sessions.filter(s => s.time_created > sevenDaysAgo);
console.log(`\n=== SESSIONS IN LAST 7 DAYS: ${recentSessions.length} ===`);
for (const s of recentSessions) {
  const date = new Date(s.time_created).toISOString();
  console.log(`  ${s.id}  msgs=${s.msg_count}  ${date}  "${s.title}"`);
}
