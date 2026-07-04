const ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORa-z]/g;

function stripAnsi(str) {
  return str.replace(ANSI_RE, '');
}

self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === 'process') {
    const { entries, searchQuery, streamFilter, selectedProcessId, processNames } = payload;
    let result = entries;

    // Filter by process
    if (selectedProcessId !== null) {
      result = result.filter((e) => e.processId === selectedProcessId);
    }

    // Filter by stream
    if (streamFilter !== 'all') {
      result = result.filter((e) => e.stream === streamFilter);
    }

    // Strip ANSI and filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => {
        const clean = stripAnsi(e.message);
        return clean.toLowerCase().includes(q);
      });
    }

    // Strip ANSI from messages
    result = result.map((e) => ({
      ...e,
      message: stripAnsi(e.message),
      processName: processNames[e.processId] || e.processName,
    }));

    self.postMessage({ type: 'result', payload: result });
  }
};
