import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Trend Chart
export const FeedbackTrendsChart: React.FC<{
  data: Array<{ date: string; total: number; negative: number; severe: number; resolved: number }>;
}> = ({ data }) => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="severeColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="resolvedColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Area
            type="monotone"
            dataKey="total"
            name="Total Reviews"
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#totalColor)"
          />
          <Area
            type="monotone"
            dataKey="severe"
            name="Severe Issues"
            stroke="#ef4444"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#severeColor)"
          />
          <Area
            type="monotone"
            dataKey="resolved"
            name="Verified Closed"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#resolvedColor)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Category Distribution Pie Chart
const CATEGORY_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

export const CategoryDistributionChart: React.FC<{
  data: Array<{ name: string; value: number }>;
}> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No category data available
      </div>
    );
  }

  return (
    <div className="w-full h-64 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-600 mt-2">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
            />
            <span>
              {entry.name} ({entry.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Branch Comparison Chart
export const BranchComparisonChart: React.FC<{
  data: Array<{ branch: string; avgRating: number; severeRate: number }>;
}> = ({ data }) => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="branch" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis yAxisId="left" domain={[0, 5]} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            unit="%"
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar
            yAxisId="left"
            dataKey="avgRating"
            name="Avg Rating (1-5★)"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="severeRate"
            name="Severe Issue Rate (%)"
            fill="#f43f5e"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Rating Distribution Bar
export const RatingDistributionChart: React.FC<{
  data: Array<{ stars: string; count: number; percentage: number }>;
}> = ({ data }) => {
  return (
    <div className="space-y-2.5">
      {data.map((item) => (
        <div key={item.stars} className="flex items-center gap-3 text-xs">
          <span className="w-14 text-slate-600 font-medium">{item.stars}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                item.stars.startsWith('5') || item.stars.startsWith('4')
                  ? 'bg-emerald-500'
                  : item.stars.startsWith('3')
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
          <span className="w-8 text-right font-semibold text-slate-700">{item.count}</span>
          <span className="w-10 text-right text-slate-400">{item.percentage}%</span>
        </div>
      ))}
    </div>
  );
};
