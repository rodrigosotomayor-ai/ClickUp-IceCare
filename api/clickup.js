const CLICKUP_TOKEN = process.env.CLICKUP_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID || '901317832639';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Obtener todas las listas de la carpeta
    const listsRes = await fetch(
      `https://api.clickup.com/api/v2/folder/${FOLDER_ID}/list`,
      { headers: { Authorization: CLICKUP_TOKEN } }
    );
    if (!listsRes.ok) {
      const err = await listsRes.text();
      return res.status(listsRes.status).json({ error: `ClickUp lists error: ${err}` });
    }
    const listsData = await listsRes.json();
    const lists = listsData.lists || [];

    // 2. Obtener tareas de cada lista
    const allTasks = [];
    for (const list of lists) {
      let page = 0;
      while (true) {
        const params = new URLSearchParams({
          page,
          include_closed: 'true',
          subtasks: 'true',
        });
        const tasksRes = await fetch(
          `https://api.clickup.com/api/v2/list/${list.id}/task?${params}`,
          { headers: { Authorization: CLICKUP_TOKEN } }
        );
        if (!tasksRes.ok) break;
        const tasksData = await tasksRes.json();
        const tasks = (tasksData.tasks || []).map(t => ({
          id: t.id,
          name: t.name,
          status: t.status?.status || '',
          due_date: t.due_date || null,
          start_date: t.start_date || null,
          date_created: t.date_created || null,
          date_updated: t.date_updated || null,
          list_name: list.name,
          url: t.url,
          priority: t.priority?.priority || null,
          assignees: (t.assignees || []).map(a => ({ username: a.username, email: a.email })),
          tags: (t.tags || []).map(tag => tag.name),
        }));
        allTasks.push(...tasks);
        if (!tasksData.tasks || tasksData.tasks.length < 100) break;
        page++;
      }
    }

    // Deduplicar
    const seen = new Set();
    const unique = allTasks.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ tasks: unique, folder_id: FOLDER_ID });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
