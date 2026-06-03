const CLICKUP_TOKEN = process.env.CLICKUP_TOKEN;
const FOLDER_ID = process.env.FOLDER_ID || '901317832639';
const SERVICE_FIELD_ID = '1f83c6c0-2f14-4e6c-bcbb-1f02f5d1169b';

// Service field options (from ClickUp custom field definition)
const SERVICE_OPTIONS = {
  '155e8baf-11bc-48a9-b0bf-9a79d9a213e6': 'Redes Sociales',
  '34316d89-1285-4dfd-a57d-c5308481677e': 'Email Marketing',
  '46520dde-6844-4ad1-85af-7cd3bcaddcf9': 'Paid Media',
  '08a47e4d-ad2b-444f-be2d-b27e7aaa67be': 'Campaña',
  '873d5935-07f2-490c-a81c-9f7c26e348e2': 'Reportería',
  '955e1ba4-0564-414c-b98a-832ce99ee854': 'Benchmarking',
  '8c9cce63-8663-48bd-9301-5f280d5c82ed': 'Edición Gráfica',
  '59d6627d-0e9a-4071-9fc6-316f9924bde6': 'Marketing Interno IceCare',
  '73e078cc-83ec-40ca-8246-f850e28568e1': 'Reunión',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Get all lists in folder
    const listsRes = await fetch(
      `https://api.clickup.com/api/v2/folder/${FOLDER_ID}/list`,
      { headers: { Authorization: CLICKUP_TOKEN } }
    );
    if (!listsRes.ok) {
      const err = await listsRes.text().catch(() => '');
      return res.status(listsRes.status).json({ error: `ClickUp lists error: ${err}` });
    }
    const listsData = await listsRes.json();
    const lists = listsData.lists || [];

    // 2. Fetch tasks from each list
    const allTasks = [];
    for (const list of lists) {
      let page = 0;
      while (true) {
        const params = new URLSearchParams({
          page,
          include_closed: 'true',
          subtasks: 'true',
          custom_fields: 'true',
        });
        const tasksRes = await fetch(
          `https://api.clickup.com/api/v2/list/${list.id}/task?${params}`,
          { headers: { Authorization: CLICKUP_TOKEN } }
        );
        if (!tasksRes.ok) break;
        const tasksData = await tasksRes.json();

        const tasks = (tasksData.tasks || []).map(t => {
          // Extract service field value
          const serviceField = (t.custom_fields || []).find(f => f.id === SERVICE_FIELD_ID);
          let service = null;
          if (serviceField && serviceField.value !== null && serviceField.value !== undefined) {
            // value is the option orderindex (number) — match against options array
            const opts = serviceField.type_config?.options || [];
            const match = opts.find(o => String(o.orderindex) === String(serviceField.value));
            if (match) {
              service = match.name;
            } else {
              // fallback: value might be the option id directly
              service = SERVICE_OPTIONS[serviceField.value] || null;
            }
          }

          return {
            id: t.id,
            name: t.name,
            status: t.status?.status || '',
            due_date: t.due_date || null,
            start_date: t.start_date || null,
            date_created: t.date_created || null,
            date_updated: t.date_updated || null,
            list_name: list.name,
            list_id: list.id,
            url: t.url,
            priority: t.priority?.priority || null,
            assignees: (t.assignees || []).map(a => ({
              username: a.username,
              email: a.email,
              color: a.color,
            })),
            service, // ← campo personalizado
          };
        });

        allTasks.push(...tasks);
        if (!tasksData.tasks || tasksData.tasks.length < 100) break;
        page++;
      }
    }

    // Deduplicate
    const seen = new Set();
    const unique = allTasks.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id); return true;
    });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({
      tasks: unique,
      folder_id: FOLDER_ID,
      service_options: Object.values(SERVICE_OPTIONS),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
