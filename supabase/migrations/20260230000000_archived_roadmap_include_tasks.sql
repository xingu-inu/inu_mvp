-- ============================================
-- Replace get_archived_roadmap to include task details per goal
-- ============================================
CREATE OR REPLACE FUNCTION get_archived_roadmap(
  p_user_id UUID,
  p_direction_id UUID
)
RETURNS JSON AS $$
SELECT json_build_object(
  'direction', (
    SELECT json_build_object(
      'id', d.id, 'statement', d.statement, 'why', d.why,
      'name', d.name, 'version', d.version, 'status', d.status::text,
      'createdAt', d.created_at, 'archivedAt', d.archived_at
    )
    FROM directions d
    WHERE d.id = p_direction_id AND d.user_id = p_user_id
  ),
  'areas', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', a.id, 'name', a.name, 'emoji', a.emoji, 'color', a.color,
        'type', a.type, 'why', a.why, 'sortOrder', a.sort_order, 'isActive', a.is_active
      ) ORDER BY a.sort_order
    ), '[]')
    FROM areas a
    WHERE a.direction_id = p_direction_id AND a.user_id = p_user_id
  ),
  'goals', (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', g.id, 'name', g.name, 'areaId', g.area_id,
        'status', g.status::text, 'why', g.why, 'vision', g.vision,
        'targetDate', g.target_date, 'sortOrder', g.sort_order,
        'groups', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', gr.id, 'name', gr.name, 'why', gr.why,
              'isCompleted', gr.is_completed
            ) ORDER BY gr.sort_order
          ), '[]')
          FROM groups gr WHERE gr.goal_id = g.id
        ),
        'tasks', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', tk.id, 'name', tk.name, 'why', tk.why,
              'groupId', tk.group_id,
              'repeatType', tk.repeat_type::text,
              'timeSlot', tk.time_slot::text,
              'durationMinutes', tk.duration_minutes,
              'status', tk.status::text
            ) ORDER BY tk.sort_order
          ), '[]')
          FROM tasks tk WHERE tk.goal_id = g.id
        ),
        'taskCount', (SELECT COUNT(*) FROM tasks tk WHERE tk.goal_id = g.id)
      ) ORDER BY g.sort_order
    ), '[]')
    FROM goals g
    JOIN areas a ON a.id = g.area_id
    WHERE a.direction_id = p_direction_id AND g.user_id = p_user_id
  )
);
$$ LANGUAGE sql STABLE SECURITY DEFINER;
