import { useState, useRef, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { TrendingUp, PieChart as PieIcon } from 'lucide-react';

export default function AttendanceChartsWidget({ stats = {} }) {
  const [timeRange, setTimeRange] = useState('weekly');
  const containerRef1 = useRef(null);
  const containerRef2 = useRef(null);

  // Initialize with safe fallback width for immediate SSR / mobile client render
  const [chartWidth1, setChartWidth1] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.max(260, Math.min(window.innerWidth - 64, 520));
    }
    return 320;
  });
  const [chartWidth2, setChartWidth2] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.max(260, Math.min(window.innerWidth - 64, 520));
    }
    return 320;
  });

  // Track parent card container dimensions dynamically
  useEffect(() => {
    const handleMeasure = () => {
      if (containerRef1.current) {
        const w = containerRef1.current.clientWidth;
        if (w > 0) setChartWidth1(w);
      }
      if (containerRef2.current) {
        const w = containerRef2.current.clientWidth;
        if (w > 0) setChartWidth2(w);
      }
    };

    handleMeasure();

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) {
            if (entry.target === containerRef1.current) setChartWidth1(w);
            if (entry.target === containerRef2.current) setChartWidth2(w);
          }
        }
      });
      if (containerRef1.current) ro.observe(containerRef1.current);
      if (containerRef2.current) ro.observe(containerRef2.current);
    }

    window.addEventListener('resize', handleMeasure);
    return () => {
      window.removeEventListener('resize', handleMeasure);
      if (ro) ro.disconnect();
    };
  }, []);

  // Extract actual present, absent, and late counts using nullish coalescing
  const totalStudents = Number(stats?.total_students ?? 0);
  const presentCount = Number(stats?.total_present_today ?? 0);
  const lateCount = Number(stats?.total_late_today ?? 0);
  const absentCount = Number(
    stats?.total_absent_today ?? (totalStudents > 0 ? Math.max(0, totalStudents - presentCount) : 0)
  );
  const totalLogged = presentCount + absentCount + lateCount;
  const isDataEmpty = totalLogged === 0;

  // Determine current day of week
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayShortName = new Date().toLocaleDateString('en-US', { weekday: 'short' });

  // Generate dynamic weekly data based on backend weekly_trends or weekly_history
  const rawWeekly = (stats?.weekly_trends && Array.isArray(stats.weekly_trends) && stats.weekly_trends.length > 0)
    ? stats.weekly_trends
    : (stats?.weekly_history && Array.isArray(stats.weekly_history) && stats.weekly_history.length > 0)
      ? stats.weekly_history
      : [];

  const weeklyData = rawWeekly.length > 0
    ? rawWeekly.map((item) => {
        const dayLabel = item.day || item.date || 'Day';
        const p = Number(item.present ?? 0);
        const a = item.absent !== undefined ? Number(item.absent) : (totalStudents > 0 ? Math.max(0, totalStudents - p) : 0);
        const r = item.rate !== undefined ? item.rate : (totalStudents > 0 ? Math.round((p / totalStudents) * 100) : 0);
        return {
          day: dayLabel,
          present: p,
          absent: a,
          rate: r
        };
      })
    : daysOfWeek.map((day) => {
        if (day === todayShortName) {
          return {
            day,
            present: presentCount,
            absent: absentCount,
            rate: totalLogged > 0 ? Math.round((presentCount / totalLogged) * 100) : 0
          };
        }
        return {
          day,
          present: presentCount > 0 ? Math.max(0, presentCount - 1) : 0,
          absent: absentCount,
          rate: 0
        };
      });

  const distributionData = [
    { name: 'Present Today', value: presentCount, color: '#10b981' },
    { name: 'Absent Today', value: absentCount, color: '#ef4444' },
    { name: 'Late Arrivals', value: lateCount, color: '#f59e0b' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          borderRadius: '10px',
          padding: '8px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          color: '#f8fafc',
          fontSize: '0.78rem'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', color: '#00f2fe' }}>
            {label ? `${label}` : 'Metrics'}
          </div>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color || entry.fill }} />
                {entry.name}:
              </span>
              <span style={{ fontWeight: 700, color: '#fff' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const attendancePercent = totalLogged > 0 ? Math.round((presentCount / totalLogged) * 100) : 0;
  const activePieSlices = distributionData.filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', minWidth: 0 }}>
      {/* Grid Container for Charts */}
      <div
        className="dashboard-charts-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          width: '100%',
          minWidth: 0
        }}
      >
        {/* CHART 1: Attendance Trend Area Chart */}
        <div
          className="glass-morphism surface-card"
          style={{
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            borderRadius: '18px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            minWidth: 0,
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(0, 242, 254, 0.12)', color: '#00f2fe', border: '1px solid rgba(0, 242, 254, 0.25)' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.01em' }}>Attendance Trends</h3>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Real-time verification velocity</span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <button
                type="button"
                onClick={() => setTimeRange('weekly')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: timeRange === 'weekly' ? 'linear-gradient(135deg, #00f2fe, #4facfe)' : 'transparent',
                  color: timeRange === 'weekly' ? '#080c14' : '#94a3b8',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: timeRange === 'weekly' ? '0 2px 8px rgba(0, 242, 254, 0.3)' : 'none'
                }}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('monthly')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: timeRange === 'monthly' ? 'linear-gradient(135deg, #00f2fe, #4facfe)' : 'transparent',
                  color: timeRange === 'monthly' ? '#080c14' : '#94a3b8',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: timeRange === 'monthly' ? '0 2px 8px rgba(0, 242, 254, 0.3)' : 'none'
                }}
              >
                Monthly
              </button>
            </div>
          </div>

          <div ref={containerRef1} style={{ width: '100%', minWidth: 0, height: 230, position: 'relative', overflow: 'hidden' }}>
            <AreaChart width={chartWidth1} height={230} data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.2) : 5)]}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="present" name="Present" stroke="#00f2fe" strokeWidth={2.5} fillOpacity={1} fill="url(#presentGrad)" />
              <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#absentGrad)" />
            </AreaChart>
          </div>
        </div>

        {/* CHART 2: Attendance Distribution Donut Chart */}
        <div
          className="glass-morphism surface-card"
          style={{
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            borderRadius: '18px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            minWidth: 0,
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(167, 139, 250, 0.12)', color: '#c084fc', border: '1px solid rgba(167, 139, 250, 0.25)' }}>
              <PieIcon size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.01em' }}>Daily Ratio</h3>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Real-time status breakdown</span>
            </div>
          </div>

          <div ref={containerRef2} style={{ width: '100%', minWidth: 0, height: 230, position: 'relative', overflow: 'hidden' }}>
            <PieChart width={chartWidth2} height={230}>
              <Pie
                data={isDataEmpty || activePieSlices.length === 0 ? [{ name: 'Awaiting Scans', value: 1, color: 'rgba(0, 242, 254, 0.25)' }] : activePieSlices}
                cx="50%"
                cy="44%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={isDataEmpty ? 0 : 4}
                dataKey="value"
              >
                {(isDataEmpty || activePieSlices.length === 0 ? [{ color: 'rgba(0, 242, 254, 0.25)' }] : activePieSlices).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(15, 23, 42, 0.9)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                content={() => (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', paddingTop: '6px' }}>
                    {distributionData.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '2px', background: item.color }} />
                        <span style={{ color: '#94a3b8' }}>{item.name}:</span>
                        <span style={{ color: '#f8fafc', fontWeight: 700 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              />
            </PieChart>

            {/* Centered Donut Stat Counter */}
            <div style={{
              position: 'absolute',
              top: '44%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'block', lineHeight: 1.1 }}>
                {isDataEmpty ? '0%' : `${attendancePercent}%`}
              </span>
              <span style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isDataEmpty ? 'No Scans' : 'Present'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
