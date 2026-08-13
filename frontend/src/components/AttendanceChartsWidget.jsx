import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { TrendingUp, PieChart as PieIcon } from 'lucide-react';

export default function AttendanceChartsWidget({ stats = {} }) {
  const [timeRange, setTimeRange] = useState('weekly');

  const weeklyData = [
    { day: 'Mon', present: stats?.total_present_today || 42, absent: stats?.total_absent_today || 8, rate: 84 },
    { day: 'Tue', present: 45, absent: 5, rate: 90 },
    { day: 'Wed', present: 48, absent: 2, rate: 96 },
    { day: 'Thu', present: 40, absent: 10, rate: 80 },
    { day: 'Fri', present: 46, absent: 4, rate: 92 },
    { day: 'Sat', present: 38, absent: 12, rate: 76 },
  ];

  const presentCount = stats?.total_present_today ?? 42;
  const absentCount = stats?.total_absent_today ?? 8;
  const lateCount = stats?.total_late_today ?? 3;

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
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          padding: '10px 14px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          color: '#f8fafc',
          fontSize: '0.82rem'
        }}>
          <p style={{ fontWeight: 700, margin: '0 0 6px', color: '#00f2fe' }}>{label}</p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '3px 0' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
              <span style={{ color: '#94a3b8' }}>{entry.name}:</span>
              <span style={{ fontWeight: 700, color: '#fff' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Grid Container for Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        width: '100%'
      }}>
        {/* CHART 1: Attendance Trend Area Chart */}
        <div className="glass-morphism" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe' }}>
                <TrendingUp size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Attendance Trends</h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Weekly present & absent trajectory</span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <button
                type="button"
                onClick={() => setTimeRange('weekly')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: timeRange === 'weekly' ? '#00f2fe' : 'transparent',
                  color: timeRange === 'weekly' ? '#0f172a' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('monthly')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: timeRange === 'monthly' ? '#00f2fe' : 'transparent',
                  color: timeRange === 'monthly' ? '#0f172a' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Monthly
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: 240, marginTop: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="present" name="Present" stroke="#00f2fe" strokeWidth={3} fillOpacity={1} fill="url(#presentGrad)" />
                <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#absentGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Attendance Distribution Donut Chart */}
        <div className="glass-morphism" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#c084fc' }}>
              <PieIcon size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Attendance Ratio</h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Live student status breakdown</span>
            </div>
          </div>

          <div style={{ width: '100%', height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(15, 23, 42, 0.8)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
