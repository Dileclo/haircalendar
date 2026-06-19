import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryOne, queryAll } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    const todayStats = queryOne(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(price), 0) as revenue
       FROM appointments WHERE date(start_time) = ?`,
      [today]
    );

    const monthStats = queryOne(
      `SELECT COALESCE(SUM(price), 0) as revenue
       FROM appointments WHERE date(start_time) >= ?`,
      [monthStart]
    );

    const totalCustomers = queryOne('SELECT COUNT(*) as cnt FROM customers');

    // Active customers (visited in last 3 months)
    const activeCustomers = queryOne(
      `SELECT COUNT(DISTINCT c.id) as cnt FROM customers c
       JOIN appointments a ON a.customer_id = c.id
       WHERE a.start_time >= date('now', 'localtime', '-3 months')`
    );

    // Dormant customers (no visits in 3+ months, but have history)
    const dormantCustomers = queryOne(
      `SELECT COUNT(*) as cnt FROM customers c
       WHERE c.id IN (SELECT DISTINCT customer_id FROM appointments WHERE customer_id IS NOT NULL)
       AND c.id NOT IN (
         SELECT DISTINCT customer_id FROM appointments
         WHERE customer_id IS NOT NULL
         AND start_time >= date('now', 'localtime', '-3 months')
       )`
    );

    const totalRevenue = queryOne(
      'SELECT COALESCE(SUM(price), 0) as total FROM appointments'
    );

    // Average check
    const avgCheck = queryOne(
      `SELECT ROUND(COALESCE(AVG(price), 0)) as avg FROM appointments WHERE price > 0`
    );

    // Month appointments count
    const monthAppts = queryOne(
      `SELECT COUNT(*) as cnt FROM appointments WHERE date(start_time) >= ?`,
      [monthStart]
    );

    // Month expenses
    const monthExpenses = queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ?`,
      [monthStart]
    );

    // New clients this month (first appointment this month)
    const newClients = queryOne(
      `SELECT COUNT(DISTINCT customer_id) as cnt FROM appointments
       WHERE customer_id IS NOT NULL
       AND start_time >= ?
       AND customer_id NOT IN (
         SELECT DISTINCT customer_id FROM appointments
         WHERE customer_id IS NOT NULL AND start_time < ?
       )`,
      [monthStart, monthStart]
    );

    // Profit = revenue - expenses
    const monthProfit = (monthStats?.revenue || 0) - (monthExpenses?.total || 0);

    // Last month for comparison
    const thisMonth = today.substring(5, 7);
    const thisYear = today.substring(0, 4);
    let lastMonthStart: string;
    if (thisMonth === '01') {
      lastMonthStart = `${parseInt(thisYear) - 1}-12-01`;
    } else {
      lastMonthStart = `${thisYear}-${String(parseInt(thisMonth) - 1).padStart(2, '0')}-01`;
    }

    const lastMonthRevenue = queryOne(
      `SELECT COALESCE(SUM(price), 0) as revenue FROM appointments WHERE date(start_time) >= ? AND date(start_time) < ?`,
      [lastMonthStart, monthStart]
    );

    const lastMonthAppts = queryOne(
      `SELECT COUNT(*) as cnt FROM appointments WHERE date(start_time) >= ? AND date(start_time) < ?`,
      [lastMonthStart, monthStart]
    );

    const lastMonthNewClients = queryOne(
      `SELECT COUNT(DISTINCT customer_id) as cnt FROM appointments
       WHERE customer_id IS NOT NULL
       AND start_time >= ? AND start_time < ?
       AND customer_id NOT IN (
         SELECT DISTINCT customer_id FROM appointments
         WHERE customer_id IS NOT NULL AND start_time < ?
       )`,
      [lastMonthStart, monthStart, lastMonthStart]
    );

    const lastMonthExpenses = queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date < ?`,
      [lastMonthStart, monthStart]
    );

    const lastMonthProfit = (lastMonthRevenue?.revenue || 0) - (lastMonthExpenses?.total || 0);

    // Busiest day of week (this month)
    const busiestDay = queryOne(
      `SELECT CASE cast(strftime('%w', start_time) as integer)
         WHEN 0 THEN 'Вс' WHEN 1 THEN 'Пн' WHEN 2 THEN 'Вт'
         WHEN 3 THEN 'Ср' WHEN 4 THEN 'Чт' WHEN 5 THEN 'Пт' WHEN 6 THEN 'Сб'
       END as day, COUNT(*) as cnt
       FROM appointments WHERE date(start_time) >= ?
       GROUP BY strftime('%w', start_time) ORDER BY cnt DESC LIMIT 1`,
      [monthStart]
    );

    // Total appointments (all time)
    const totalAppts = queryOne('SELECT COUNT(*) as cnt FROM appointments');

    // Avg visits per client
    const avgVisits = queryOne(
      `SELECT ROUND(AVG(cnt), 1) as avg FROM (
         SELECT COUNT(*) as cnt FROM appointments WHERE customer_id IS NOT NULL GROUP BY customer_id
       )`
    );

    // Return rate: clients with 2+ visits
    const returning = queryOne(
      `SELECT COUNT(*) as cnt FROM (
         SELECT customer_id FROM appointments WHERE customer_id IS NOT NULL
         GROUP BY customer_id HAVING COUNT(*) >= 2
       )`
    );

    // Monthly unique clients
    const monthUniqueClients = queryOne(
      `SELECT COUNT(DISTINCT customer_id) as cnt FROM appointments
       WHERE customer_id IS NOT NULL AND date(start_time) >= ?`,
      [monthStart]
    );

    // Revenue by day of week (this month)
    const revenueByDay = queryAll(
      `SELECT CASE cast(strftime('%w', start_time) as integer)
         WHEN 0 THEN 'Вс' WHEN 1 THEN 'Пн' WHEN 2 THEN 'Вт'
         WHEN 3 THEN 'Ср' WHEN 4 THEN 'Чт' WHEN 5 THEN 'Пт' WHEN 6 THEN 'Сб'
       END as day,
       COUNT(*) as count, SUM(price) as revenue
       FROM appointments WHERE date(start_time) >= ?
       GROUP BY strftime('%w', start_time) ORDER BY strftime('%w', start_time)`,
      [monthStart]
    );

    return NextResponse.json({
      success: true,
      data: {
        today_count: todayStats?.cnt || 0,
        today_revenue: todayStats?.revenue || 0,
        month_revenue: monthStats?.revenue || 0,
        last_month_revenue: lastMonthRevenue?.revenue || 0,
        month_appointments: monthAppts?.cnt || 0,
        last_month_appointments: lastMonthAppts?.cnt || 0,
        month_expenses: monthExpenses?.total || 0,
        last_month_expenses: lastMonthExpenses?.total || 0,
        month_profit: monthProfit,
        last_month_profit: lastMonthProfit,
        avg_check: avgCheck?.avg || 0,
        new_clients: newClients?.cnt || 0,
        last_month_new_clients: lastMonthNewClients?.cnt || 0,
        busiest_day: busiestDay?.day || '—',
        total_customers: totalCustomers?.cnt || 0,
        active_customers: activeCustomers?.cnt || 0,
        dormant_customers: dormantCustomers?.cnt || 0,
        total_revenue: totalRevenue?.total || 0,
        total_appointments: totalAppts?.cnt || 0,
        avg_visits: avgVisits?.avg || 0,
        returning_clients: returning?.cnt || 0,
        month_unique_clients: monthUniqueClients?.cnt || 0,
        revenue_by_day: revenueByDay || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
