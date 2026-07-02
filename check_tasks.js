const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qualify.6ksfuf.easypanel.host',
  'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogInNlcnZpY2Vfcm9sZSIsICJpc3MiOiAic3VwYWJhc2UiLCAiaWF0IjogMTc0OTI5NjAwMCwgImV4cCI6IDQ5MDQ5Njk2MDB9.oOJGfhukDhCdORGCQX01RLNCR1mb4FJUkOgtF3sp5o0'
);

async function checkTasks() {
  const { data, error } = await supabase
    .from('campaign_group_updates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching tasks:', error);
  } else {
    console.log('Recent tasks:', data);
  }
}

checkTasks();
