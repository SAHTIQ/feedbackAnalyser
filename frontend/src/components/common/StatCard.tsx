import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  badge?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  iconBgColor = 'bg-brand-50',
  iconColor = 'text-brand-600',
  badge,
  trend,
  onClick,
}) => {
  return (
    <Card
      onClick={onClick}
      className={`p-5 transition-all hover:shadow-md ${
        onClick ? 'hover:border-brand-200' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
            {badge}
          </div>
          {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
          {trend && (
            <div className="mt-2 flex items-center text-xs">
              <span
                className={`font-semibold ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              {trend.label && <span className="text-slate-400 ml-1.5">{trend.label}</span>}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgColor} ${iconColor} shrink-0`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};
