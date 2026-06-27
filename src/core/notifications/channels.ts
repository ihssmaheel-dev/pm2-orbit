export async function sendWebhook(url: string, event: { message: string; processName: string; metric: string; value: number; threshold: number }): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: event.message,
        process: event.processName,
        metric: event.metric,
        value: event.value,
        threshold: event.threshold,
        ts: Date.now(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendSlack(webhookUrl: string, event: { message: string }): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: event.message,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `:warning: *PM2 Orbit Alert*\n${event.message}` },
          },
        ],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendDiscord(webhookUrl: string, event: { message: string }): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `:warning: **PM2 Orbit Alert**\n${event.message}`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
