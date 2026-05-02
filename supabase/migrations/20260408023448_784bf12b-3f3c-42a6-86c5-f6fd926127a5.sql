
CREATE OR REPLACE FUNCTION public.get_member_movement_stats(
  p_campaign_id UUID,
  p_days INT DEFAULT 7
)
RETURNS TABLE (
  total_joined BIGINT,
  total_left BIGINT,
  net_change BIGINT,
  daily_stats JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT generate_series(
      (CURRENT_DATE - (p_days - 1)),
      CURRENT_DATE,
      '1 day'::interval
    )::date AS day
  ),
  daily_counts AS (
    SELECT
      DATE(created_at) AS day,
      COUNT(*) FILTER (WHERE action = 'join') AS joined,
      COUNT(*) FILTER (WHERE action IN ('leave', 'remove', 'removed')) AS left_count
    FROM group_member_history
    WHERE group_campaign_id = p_campaign_id
      AND created_at >= (CURRENT_DATE - p_days)
    GROUP BY DATE(created_at)
  ),
  full_daily AS (
    SELECT
      dr.day,
      COALESCE(dc.joined, 0) AS joined,
      COALESCE(dc.left_count, 0) AS left_count
    FROM date_range dr
    LEFT JOIN daily_counts dc ON dr.day = dc.day
    ORDER BY dr.day
  )
  SELECT
    SUM(fd.joined)::BIGINT AS total_joined,
    SUM(fd.left_count)::BIGINT AS total_left,
    (SUM(fd.joined) - SUM(fd.left_count))::BIGINT AS net_change,
    jsonb_agg(
      jsonb_build_object(
        'date', fd.day,
        'joined', fd.joined,
        'left', fd.left_count
      ) ORDER BY fd.day
    ) AS daily_stats
  FROM full_daily fd;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_poll_analytics(
  p_poll_message_id UUID,
  p_total_members INT DEFAULT 0
)
RETURNS TABLE (
  total_votes BIGINT,
  unique_respondents BIGINT,
  response_rate NUMERIC,
  options_stats JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH vote_counts AS (
    SELECT
      option_index,
      option_text,
      COUNT(*) AS vote_count
    FROM poll_responses
    WHERE poll_message_id = p_poll_message_id
    GROUP BY option_index, option_text
  ),
  totals AS (
    SELECT
      COUNT(*)::BIGINT AS total,
      COUNT(DISTINCT respondent_phone)::BIGINT AS uniq
    FROM poll_responses
    WHERE poll_message_id = p_poll_message_id
  )
  SELECT
    t.total AS total_votes,
    t.uniq AS unique_respondents,
    CASE WHEN p_total_members > 0
      THEN ROUND((t.uniq::NUMERIC / p_total_members) * 100, 1)
      ELSE 0
    END AS response_rate,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'index', vc.option_index,
          'text', vc.option_text,
          'votes', vc.vote_count,
          'percentage', CASE WHEN t.total > 0
            THEN ROUND((vc.vote_count::NUMERIC / t.total) * 100, 1)
            ELSE 0
          END
        ) ORDER BY vc.option_index
      ) FROM vote_counts vc),
      '[]'::jsonb
    ) AS options_stats
  FROM totals t;
END;
$$;
