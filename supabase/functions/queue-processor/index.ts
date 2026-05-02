import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await authClient.auth.getUser(token);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = user.id;

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'tick';
  const campaignId = url.searchParams.get('campaign_id');
  const companyId = url.searchParams.get('company_id');

  try {
    // ── global_tick: company-level processing with 3:1 priority ──
    if (action === 'global_tick') {
      if (!companyId) {
        return new Response(JSON.stringify({ error: 'company_id required for global_tick' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify company access
      const { data: membership } = await supabase
        .from('company_members')
        .select('id')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (!membership) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await processGlobalTick(supabase, companyId, userId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Legacy tick: per-campaign processing ──
    if (!campaignId) {
      return new Response(JSON.stringify({ error: 'campaign_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify campaign access
    const { data: campaign, error: campErr } = await supabase
      .from('call_campaigns')
      .select('id, name, user_id, queue_interval_seconds, queue_unavailable_behavior, company_id, retry_count, retry_interval_minutes')
      .eq('id', campaignId)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let hasAccess = campaign.user_id === userId;
    if (!hasAccess && campaign.company_id) {
      const { data: membership } = await supabase
        .from('company_members')
        .select('id')
        .eq('company_id', campaign.company_id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      hasAccess = !!membership;
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'tick') {
      const result = await processTick(supabase, campaignId, userId, campaign);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[queue-processor] Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// healStaleInCallItems: Clean up ghost "in_call" items in call_queue
// ═══════════════════════════════════════════════════════════════

async function healStaleInCallItems(supabase: any, companyId: string) {
  const terminalStatuses = ['completed', 'no_answer', 'failed', 'cancelled', 'busy', 'voicemail', 'timeout', 'voicemail_rescheduled', 'cancelled_rescheduled', 'no_answer_rescheduled', 'answered', 'completed_rescheduled'];
  const activeStatuses = ['dialing', 'ringing', 'answered', 'in_progress'];
  const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

  // Fetch all in_call items for this company
  const { data: inCallItems } = await supabase
    .from('call_queue')
    .select('id, call_log_id, lead_id, campaign_id, created_at')
    .eq('company_id', companyId)
    .eq('status', 'in_call');

  if (!inCallItems || inCallItems.length === 0) return;

  const idsToDelete: string[] = [];
  let needsReschedule = false;

  for (const item of inCallItems) {
    if (item.call_log_id) {
      const { data: log } = await supabase
        .from('call_logs')
        .select('id, call_status, ended_at, started_at, lead_id, campaign_id')
        .eq('id', item.call_log_id)
        .maybeSingle();

      if (!log || terminalStatuses.includes(log.call_status) || log.ended_at) {
        // Case 1: call_log already terminal or ended — just clean up queue item
        idsToDelete.push(item.id);
      } else if (activeStatuses.includes(log.call_status)) {
        // Case 2: call_log still active — check if timed out (>10 min)
        const startedAt = log.started_at ? new Date(log.started_at).getTime() : new Date(item.created_at).getTime();
        if (Date.now() - startedAt > TIMEOUT_MS) {
          console.log(`[healStale] Timeout: call_log ${log.id} stuck in "${log.call_status}" for >10min. Forcing failed.`);

          // Force call_log to failed
          await supabase.from('call_logs').update({
            call_status: 'failed',
            ended_at: new Date().toISOString(),
            notes: 'Timeout: provedor não respondeu em 10 minutos',
          }).eq('id', log.id);

          // Release operator
          await supabase.rpc('release_operator', { p_call_id: log.id, p_force: true });

          // Revert lead to waiting
          if (log.lead_id) {
            await supabase.from('call_leads').update({ status: 'waiting' }).eq('id', log.lead_id);
          }

          idsToDelete.push(item.id);
          needsReschedule = true;
        }
      }
    } else {
      // No call_log_id — delete if older than 5 minutes
      const createdAt = new Date(item.created_at).getTime();
      if (Date.now() - createdAt > 5 * 60 * 1000) {
        idsToDelete.push(item.id);
      }
    }
  }

  if (idsToDelete.length > 0) {
    await supabase.from('call_queue').delete().in('id', idsToDelete);
    console.log(`[queue-processor/global] Healed ${idsToDelete.length} stale in_call queue items`);
  }

  // Trigger reschedule if any calls were force-failed
  if (needsReschedule) {
    try {
      await supabase.functions.invoke('reschedule-failed-calls', { body: {} });
      console.log('[healStale] Triggered reschedule-failed-calls after timeout cleanup');
    } catch (e) {
      console.error('[healStale] Failed to invoke reschedule-failed-calls:', e);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// global_tick: Company-level processing with 3:1 priority ratio
// ═══════════════════════════════════════════════════════════════

async function processGlobalTick(supabase: any, companyId: string, userId: string) {
  // 1. Check if any campaign is running for this company
  const { data: activeStates } = await supabase
    .from('queue_execution_state')
    .select('campaign_id, status')
    .eq('status', 'running')
    .not('campaign_id', 'is', null);

  // Filter to campaigns belonging to this company
  const activeCampaignIds = (activeStates || [])
    .map((s: any) => s.campaign_id)
    .filter(Boolean);

  // Always heal stale in_call items, even if no campaigns are running
  await healStaleInCallItems(supabase, companyId);

  if (activeCampaignIds.length === 0) {
    // Also check waiting states
    const { data: waitingStates } = await supabase
      .from('queue_execution_state')
      .select('campaign_id, status')
      .in('status', ['waiting_operator', 'waiting_cooldown'])
      .not('campaign_id', 'is', null);

    if (!waitingStates?.length) {
      return { success: true, action: 'none', reason: 'No active queues' };
    }
  }

  // 2. Heal stuck operators + resolve cooldowns (once for entire company)
  const { data: healedOps } = await supabase.rpc('heal_stuck_operators', { p_stuck_threshold_minutes: 10 });
  if (healedOps?.length) {
    console.log(`[queue-processor/global] Healed ${healedOps.length} stuck operators`);
  }

  const { data: resolvedOps } = await supabase.rpc('resolve_cooldowns');
  if (resolvedOps?.length) {
    console.log(`[queue-processor/global] Resolved ${resolvedOps.length} cooldowns`);
  }

  // 3. Find available operator
  const { data: allOps } = await supabase
    .from('call_operators')
    .select('id, operator_name, extension, status')
    .eq('is_active', true)
    .eq('company_id', companyId)
    .order('last_call_ended_at', { ascending: true, nullsFirst: true });

  if (!allOps || allOps.length === 0) {
    return { success: true, action: 'waiting', reason: 'No active operators' };
  }

  const hasAvailable = allOps.some((op: any) => op.status === 'available');
  if (!hasAvailable) {
    return { success: true, action: 'waiting', reason: 'No operator available' };
  }

  // 4. PRIORITY: Check for scheduled/ready call_logs FIRST (operator appointments)
  const scheduledResult = await processScheduledCallLogs(supabase, companyId, userId);
  if (scheduledResult) {
    return scheduledResult;
  }

  // 5. Call queue_get_next_v2 — the SQL function decides which campaign/item
  const { data: nextItems, error: rpcError } = await supabase.rpc('queue_get_next_v2', {
    p_company_id: companyId,
  });

  if (rpcError) {
    console.error('[queue-processor/global] RPC error:', rpcError);
    return { success: false, error: rpcError.message };
  }

  if (!nextItems || nextItems.length === 0) {
    return { success: true, action: 'none', reason: 'Queue empty, no scheduled logs' };
  }

  const entry = nextItems[0];
  const selectedCampaignId = entry.out_campaign_id;

  // 5. Get campaign config for webhook
  const { data: campaign } = await supabase
    .from('call_campaigns')
    .select('id, name, user_id, queue_interval_seconds, queue_unavailable_behavior, company_id, retry_count, retry_interval_minutes')
    .eq('id', selectedCampaignId)
    .single();

  if (!campaign) {
    // Revert queue item
    await supabase.from('call_queue').update({ status: 'waiting' }).eq('id', entry.queue_id);
    return { success: false, error: 'Campaign not found for selected item' };
  }

  // 6. Create call_log
  const { data: callLog, error: logErr } = await supabase
    .from('call_logs')
    .insert({
      user_id: userId,
      company_id: companyId,
      campaign_id: selectedCampaignId,
      lead_id: entry.out_lead_id || null,
      call_status: 'ready',
      scheduled_for: new Date().toISOString(),
      attempt_number: entry.out_attempt_number || 1,
      max_attempts: entry.out_max_attempts || campaign.retry_count || 3,
    })
    .select('id')
    .single();

  if (logErr) {
    console.error('[queue-processor/global] Failed to create call log:', logErr);
    await supabase.from('call_queue').update({ status: 'waiting' }).eq('id', entry.queue_id);
    return { success: false, error: logErr.message };
  }

  // 7. Reserve operator atomically
  const { data: reservation } = await supabase.rpc('reserve_operator_for_call', {
    p_call_id: callLog.id,
    p_campaign_id: selectedCampaignId,
  });

  if (!reservation?.[0]?.success) {
    await supabase.from('call_logs').update({ call_status: 'cancelled', ended_at: new Date().toISOString() }).eq('id', callLog.id);
    await supabase.from('call_queue').update({ status: 'waiting' }).eq('id', entry.queue_id);
    return { success: true, action: 'waiting', reason: reservation?.[0]?.error_code || 'no_operator_available' };
  }

  const operator = reservation[0];

  // Update call_log to dialing
  await supabase.from('call_logs').update({
    operator_id: operator.operator_id,
    call_status: 'dialing',
    started_at: new Date().toISOString(),
  }).eq('id', callLog.id);

  // Update lead status
  if (entry.out_lead_id) {
    await supabase.from('call_leads').update({
      status: 'calling',
      assigned_operator_id: operator.operator_id,
      last_attempt_at: new Date().toISOString(),
    }).eq('id', entry.out_lead_id);
  }

  // 8. Mark call_queue item as in_call BEFORE firing webhook (stays visible in queue)
  await supabase.from('call_queue').update({ status: 'in_call', call_log_id: callLog.id }).eq('id', entry.queue_id);

  // 9. Fire webhook (will rollback call_queue on failure)
  const operatorObj = { id: operator.operator_id, operator_name: operator.operator_name, extension: operator.operator_extension };
  const leadObj = { id: entry.out_lead_id, phone: entry.out_phone, name: entry.out_lead_name };
  await fireDialWebhook(supabase, userId, callLog.id, selectedCampaignId, campaign, leadObj, operatorObj, entry.queue_id);

  // 10. Update per-campaign execution state
  const { data: campState } = await supabase
    .from('queue_execution_state')
    .select('calls_made, current_position')
    .eq('campaign_id', selectedCampaignId)
    .maybeSingle();

  if (campState) {
    await supabase.from('queue_execution_state').update({
      last_dial_at: new Date().toISOString(),
      calls_made: (campState.calls_made || 0) + 1,
      current_position: (campState.current_position || 0) + 1,
      status: 'running',
    }).eq('campaign_id', selectedCampaignId);
  }

  console.log(`[queue-processor/global] Dialed ${entry.out_phone} via ${operator.operator_name} (campaign: ${entry.out_campaign_name}, priority: ${entry.out_is_priority})`);

  return {
    success: true,
    action: 'dialed',
    call_id: callLog.id,
    operator: operator.operator_name,
    lead: { name: entry.out_lead_name, phone: entry.out_phone },
    campaign: { id: selectedCampaignId, name: entry.out_campaign_name, is_priority: entry.out_is_priority },
    source: entry.out_source_type,
  };
}

// Check for scheduled/ready call_logs that should be processed BEFORE the regular queue
async function processScheduledCallLogs(supabase: any, companyId: string, userId: string): Promise<any | null> {
  // Find call_logs with scheduled_for <= NOW() and status scheduled/ready
  // Prioritize by campaign priority, then by scheduled_for ascending
  const { data: readyLog } = await supabase
    .from('call_logs')
    .select('id, campaign_id, lead_id, user_id, attempt_number, max_attempts, call_campaigns!inner(is_priority)')
    .eq('company_id', companyId)
    .in('call_status', ['ready', 'scheduled'])
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(10);

  if (!readyLog || readyLog.length === 0) {
    return null; // No scheduled logs, proceed to regular queue
  }

  // Sort: priority campaigns first, then by scheduled_for
  const sorted = readyLog.sort((a: any, b: any) => {
    const aPriority = a.call_campaigns?.is_priority ? 1 : 0;
    const bPriority = b.call_campaigns?.is_priority ? 1 : 0;
    return bPriority - aPriority; // Priority first
  });

  const log = sorted[0];

  // Get campaign
  const { data: campaign } = await supabase
    .from('call_campaigns')
    .select('id, name, user_id, queue_interval_seconds, queue_unavailable_behavior, company_id, retry_count, retry_interval_minutes')
    .eq('id', log.campaign_id)
    .single();

  if (!campaign) {
    return null; // Skip, let regular queue handle
  }

  // Fetch lead data
  let leadPhone = '';
  let leadName = '';
  if (log.lead_id) {
    const { data: leadData } = await supabase
      .from('call_leads')
      .select('phone, name')
      .eq('id', log.lead_id)
      .maybeSingle();
    if (leadData) {
      leadPhone = leadData.phone;
      leadName = leadData.name || '';
    }
  }

  // Reserve operator
  const { data: reservation } = await supabase.rpc('reserve_operator_for_call', {
    p_call_id: log.id,
    p_campaign_id: log.campaign_id,
  });

  if (!reservation?.[0]?.success) {
    return { success: true, action: 'waiting', reason: reservation?.[0]?.error_code || 'no_operator_available' };
  }

  const operator = reservation[0];

  await supabase.from('call_logs').update({
    operator_id: operator.operator_id,
    call_status: 'dialing',
    started_at: new Date().toISOString(),
  }).eq('id', log.id);

  if (log.lead_id) {
    await supabase.from('call_leads').update({
      status: 'calling',
      assigned_operator_id: operator.operator_id,
      last_attempt_at: new Date().toISOString(),
    }).eq('id', log.lead_id);
  }

  const operatorObj = { id: operator.operator_id, operator_name: operator.operator_name, extension: operator.operator_extension };
  const leadObj = { id: log.lead_id, phone: leadPhone, name: leadName };
  await fireDialWebhook(supabase, userId, log.id, log.campaign_id, campaign, leadObj, operatorObj);

  console.log(`[queue-processor/global] Scheduled call: Dialed ${leadPhone} via ${operator.operator_name} (campaign: ${campaign.name})`);

  return {
    success: true,
    action: 'dialed',
    call_id: log.id,
    operator: operator.operator_name,
    lead: { name: leadName, phone: leadPhone },
    source: 'scheduled_call_logs',
  };
}

// ═══════════════════════════════════════════════════════════════
// Legacy per-campaign tick (backward compatible)
// ═══════════════════════════════════════════════════════════════

async function processTick(supabase: any, campaignId: string, userId: string, campaign: any) {
  const { data: state } = await supabase
    .from('queue_execution_state')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle();

  const activeStatuses = ['running', 'waiting_operator', 'waiting_cooldown'];
  if (!state || !activeStatuses.includes(state.status)) {
    return { success: true, action: 'none', reason: 'Queue not running' };
  }

  const { data: healedOps } = await supabase.rpc('heal_stuck_operators', { p_stuck_threshold_minutes: 10 });
  if (healedOps?.length) console.log(`[queue-processor] Healed ${healedOps.length} stuck operators`);

  const { data: resolvedOps } = await supabase.rpc('resolve_cooldowns');
  if (resolvedOps?.length) console.log(`[queue-processor] Resolved ${resolvedOps.length} cooldowns`);

  let opsQuery = supabase
    .from('call_operators')
    .select('id, operator_name, extension, status')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (campaign.company_id) {
    opsQuery = opsQuery.eq('company_id', campaign.company_id);
  } else {
    opsQuery = opsQuery.eq('user_id', userId);
  }

  const { data: allOps } = await opsQuery;

  if (!allOps || allOps.length === 0) {
    const behavior = campaign.queue_unavailable_behavior || 'wait';
    const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
    if (state.status !== newStatus) {
      await supabase.from('queue_execution_state').update({ status: newStatus }).eq('campaign_id', campaignId);
    }
    return { success: true, action: 'waiting', reason: 'No active operators' };
  }

  const currentIndex = state.current_operator_index || 0;
  let hasAvailable = false;
  let nextIndex = currentIndex;

  for (let i = 0; i < allOps.length; i++) {
    const idx = (currentIndex + i) % allOps.length;
    if (allOps[idx].status === 'available') {
      hasAvailable = true;
      nextIndex = (idx + 1) % allOps.length;
      break;
    }
  }

  if (!hasAvailable) {
    const behavior = campaign.queue_unavailable_behavior || 'wait';
    const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
    if (state.status !== newStatus) {
      await supabase.from('queue_execution_state').update({ status: newStatus }).eq('campaign_id', campaignId);
    }
    return { success: true, action: 'waiting', reason: 'No operator available' };
  }

  const { data: entry } = await supabase
    .from('call_queue')
    .select('id, lead_id, phone, lead_name, campaign_id, attempt_number, max_attempts')
    .eq('campaign_id', campaignId)
    .eq('status', 'waiting')
    .order('is_priority', { ascending: false })
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!entry) {
    const { data: readyLog } = await supabase
      .from('call_logs')
      .select('id, campaign_id, lead_id, user_id, attempt_number, max_attempts')
      .eq('campaign_id', campaignId)
      .in('call_status', ['ready', 'scheduled'])
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!readyLog) {
      await supabase.from('queue_execution_state').update({ status: 'stopped' }).eq('campaign_id', campaignId);
      return { success: true, action: 'completed', reason: 'Queue empty' };
    }

    let leadPhone = '';
    let leadName = '';
    if (readyLog.lead_id) {
      const { data: leadData } = await supabase.from('call_leads').select('phone, name').eq('id', readyLog.lead_id).maybeSingle();
      if (leadData) { leadPhone = leadData.phone; leadName = leadData.name || ''; }
    }

    const { data: reservation } = await supabase.rpc('reserve_operator_for_call', { p_call_id: readyLog.id, p_campaign_id: campaignId });

    if (!reservation?.[0]?.success) {
      const behavior = campaign.queue_unavailable_behavior || 'wait';
      const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
      if (state.status !== newStatus) await supabase.from('queue_execution_state').update({ status: newStatus }).eq('campaign_id', campaignId);
      return { success: true, action: 'waiting', reason: reservation?.[0]?.error_code || 'no_operator_available' };
    }

    const operator = reservation[0];
    await supabase.from('call_logs').update({ operator_id: operator.operator_id, call_status: 'dialing', started_at: new Date().toISOString() }).eq('id', readyLog.id);
    if (readyLog.lead_id) {
      await supabase.from('call_leads').update({ status: 'calling', assigned_operator_id: operator.operator_id, last_attempt_at: new Date().toISOString() }).eq('id', readyLog.lead_id);
    }

    const operatorObj = { id: operator.operator_id, operator_name: operator.operator_name, extension: operator.operator_extension };
    const leadObj = { id: readyLog.lead_id, phone: leadPhone, name: leadName };
    await fireDialWebhook(supabase, userId, readyLog.id, campaignId, campaign, leadObj, operatorObj);

    await supabase.from('queue_execution_state').update({
      last_dial_at: new Date().toISOString(),
      calls_made: (state.calls_made || 0) + 1,
      current_position: (state.current_position || 0) + 1,
      current_operator_index: nextIndex,
      status: 'running',
    }).eq('campaign_id', campaignId);

    return { success: true, action: 'dialed', call_id: readyLog.id, operator: operator.operator_name, lead: { name: leadName, phone: leadPhone }, source: 'fallback_call_logs' };
  }

  const { data: callLog, error: logErr } = await supabase
    .from('call_logs')
    .insert({
      user_id: userId,
      company_id: campaign.company_id || null,
      campaign_id: entry.campaign_id || campaignId,
      lead_id: entry.lead_id || null,
      call_status: 'ready',
      scheduled_for: new Date().toISOString(),
      attempt_number: entry.attempt_number || 1,
      max_attempts: entry.max_attempts || campaign.retry_count || 3,
    })
    .select('id')
    .single();

  if (logErr) {
    console.error('[queue-processor] Failed to create call log:', logErr);
    return { success: false, error: logErr.message };
  }

  const { data: reservation } = await supabase.rpc('reserve_operator_for_call', { p_call_id: callLog.id, p_campaign_id: campaignId });

  if (!reservation?.[0]?.success) {
    await supabase.from('call_logs').update({ call_status: 'cancelled', ended_at: new Date().toISOString() }).eq('id', callLog.id);
    const behavior = campaign.queue_unavailable_behavior || 'wait';
    const newStatus = behavior === 'pause' ? 'paused' : 'waiting_operator';
    if (state.status !== newStatus) await supabase.from('queue_execution_state').update({ status: newStatus }).eq('campaign_id', campaignId);
    return { success: true, action: 'waiting', reason: reservation?.[0]?.error_code || 'no_operator_available' };
  }

  const operator = reservation[0];
  await supabase.from('call_logs').update({ operator_id: operator.operator_id, call_status: 'dialing', started_at: new Date().toISOString() }).eq('id', callLog.id);

  if (entry.lead_id) {
    await supabase.from('call_leads').update({ status: 'calling', assigned_operator_id: operator.operator_id, last_attempt_at: new Date().toISOString() }).eq('id', entry.lead_id);
  }

  // Mark call_queue as in_call BEFORE firing webhook
  await supabase.from('call_queue').update({ status: 'in_call', call_log_id: callLog.id }).eq('id', entry.id);

  const operatorObj = { id: operator.operator_id, operator_name: operator.operator_name, extension: operator.operator_extension };
  const leadObj = { id: entry.lead_id, phone: entry.phone, name: entry.lead_name };
  await fireDialWebhook(supabase, userId, callLog.id, campaignId, campaign, leadObj, operatorObj, entry.id);

  await supabase.from('queue_execution_state').update({
    last_dial_at: new Date().toISOString(),
    calls_made: (state.calls_made || 0) + 1,
    current_position: (state.current_position || 0) + 1,
    current_operator_index: nextIndex,
    status: 'running',
  }).eq('campaign_id', campaignId);

  console.log(`[queue-processor] Dialed ${entry.phone} via operator ${operator.operator_name}`);

  return { success: true, action: 'dialed', call_id: callLog.id, operator: operator.operator_name, lead: { name: entry.lead_name, phone: entry.phone } };
}

// ═══════════════════════════════════════════════════════════════
// Helper: fire webhook for call.dial
// ═══════════════════════════════════════════════════════════════

async function fireDialWebhook(supabase: any, userId: string, callLogId: string, campaignId: string, campaign: any, lead: any, operator: any, queueItemId?: string) {
  try {
    const { data: webhookConfig } = await supabase
      .from('webhook_configs')
      .select('url, is_active')
      .eq('category', 'calls')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!webhookConfig?.is_active || !webhookConfig?.url) return;

    const payload = {
      action: 'call.dial',
      call: { id: callLogId, status: 'dialing', scheduled_for: new Date().toISOString() },
      campaign: { id: campaignId, name: campaign.name },
      lead: lead ? { id: lead.id, phone: lead.phone, name: lead.name || null } : null,
      operator: { id: operator.id, name: operator.operator_name, extension: operator.extension || null },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(webhookConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log('[queue-processor] Webhook response:', response.status, responseText);

    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed) && parsed[0]?.id) {
        if (parsed[0]?.message === 'operator_unavailable') {
          await supabase.from('call_logs').update({ call_status: 'ready', started_at: null, operator_id: null }).eq('id', callLogId);
          await supabase.rpc('release_operator', { p_call_id: callLogId, p_force: true });
          if (lead?.id) await supabase.from('call_leads').update({ status: 'pending', assigned_operator_id: null }).eq('id', lead.id);
          // Rollback call_queue to waiting
          if (queueItemId) await supabase.from('call_queue').update({ status: 'waiting', call_log_id: null }).eq('id', queueItemId);
          return;
        }
        await supabase.from('call_logs').update({ external_call_id: parsed[0].id }).eq('id', callLogId);
      }
    } catch {
      // Not JSON
    }
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'AbortError';
    const failReason = isTimeout ? 'Timeout (60s)' : 'Webhook error';
    console.error('[queue-processor] Webhook error:', failReason, error);

    await supabase.from('call_logs').update({ call_status: 'failed', notes: failReason, ended_at: new Date().toISOString(), operator_id: null }).eq('id', callLogId);
    await supabase.rpc('release_operator', { p_call_id: callLogId, p_force: true });
    if (lead?.id) await supabase.from('call_leads').update({ status: 'pending', assigned_operator_id: null }).eq('id', lead.id);
    // Rollback call_queue to waiting
    if (queueItemId) await supabase.from('call_queue').update({ status: 'waiting', call_log_id: null }).eq('id', queueItemId);
  }
}
