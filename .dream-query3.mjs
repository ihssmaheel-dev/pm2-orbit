import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/ihssm/.local/share/mimocode/mimocode.db', { open: true, readOnly: true });

// Check message data structure
const sample = db.prepare("SELECT data FROM message WHERE session_id = 'ses_0f04df130ffei3DA6Q92e2pMDt' AND json_extract(data, '$.role') = 'user' LIMIT 3").all();
for (const row of sample) {
  console.log('---');
  console.log(row.data.slice(0, 500));
}

// Check part structure too
console.log('\n=== Part types ===');
const partTypes = db.prepare("SELECT DISTINCT json_extract(data, '$.type') as ptype FROM part WHERE session_id = 'ses_0f04df130ffei3DA6Q92e2pMDt'").all();
console.log(partTypes);

// Sample user part text
console.log('\n=== Sample user text parts ===');
const userParts = db.prepare(`
  SELECT substr(json_extract(p.data, '$.text'), 1, 300) as txt
  FROM part p
  JOIN message m ON p.message_id = m.id
  WHERE m.session_id = 'ses_0f04df130ffei3DA6Q92e2pMDt'
    AND json_extract(m.data, '$.role') = 'user'
    AND json_extract(p.data, '$.type') = 'text'
  ORDER BY m.time_created
  LIMIT 30
`).all();
for (const r of userParts) {
  console.log(`  > ${r.txt}`);
}
