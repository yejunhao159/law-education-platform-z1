const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'law_education',
  user: 'postgres',
  password: 'postgres123',
});

async function query() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        case_title,
        session_state,
        jsonb_typeof(act1_facts->'timeline') as timeline_type,
        CASE
          WHEN jsonb_typeof(act1_facts->'timeline') = 'array'
          THEN jsonb_array_length(act1_facts->'timeline')
          ELSE NULL
        END as timeline_count,
        act1_facts->'timeline' as timeline_data,
        created_at
      FROM teaching_sessions_v2
      ORDER BY created_at DESC
      LIMIT 3;
    `);

    console.log('📊 查询结果：');
    console.log('总记录数：', result.rows.length);
    console.log('');

    result.rows.forEach((row, index) => {
      console.log(`\n=== 记录 ${index + 1} ===`);
      console.log('ID:', row.id);
      console.log('案例标题:', row.case_title);
      console.log('会话状态:', row.session_state);
      console.log('timeline类型:', row.timeline_type);
      console.log('timeline长度:', row.timeline_count);
      console.log('创建时间:', row.created_at);

      if (row.timeline_data) {
        console.log('\n时间轴数据:');
        const timeline = row.timeline_data;
        if (Array.isArray(timeline)) {
          timeline.slice(0, 3).forEach((event, i) => {
            console.log(`  ${i + 1}. ${event.date}: ${event.event?.substring(0, 50)}...`);
          });
          if (timeline.length > 3) {
            console.log(`  ... 还有 ${timeline.length - 3} 条事件`);
          }
        } else {
          console.log('  时间轴数据格式:', JSON.stringify(timeline).substring(0, 100));
        }
      } else {
        console.log('⚠️ 没有时间轴数据');
      }
    });

    await pool.end();
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    await pool.end();
    process.exit(1);
  }
}

query();
