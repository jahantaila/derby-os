"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AgentRecord } from "@/lib/agents";

type EmployeeDetailPageProps = {
  params: {
    id: string;
  };
};

function buildCalendar(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  const leading = first.getDay();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const today = now.getDate();

  return {
    monthLabel: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
    cells: Array.from({ length: totalCells }, (_, index) => {
      const day = index - leading + 1;
      if (day < 1 || day > daysInMonth) return null;
      return { day, isToday: day === today };
    }),
  };
}

export default function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const [employee, setEmployee] = useState<AgentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch("/api/agents?type=employee", { cache: "no-store" });

        if (!active) return;

        if (res.ok) {
          const allEmployees = (await res.json()) as AgentRecord[];
          setEmployee(allEmployees.find((entry) => entry.id === params.id) ?? null);
        } else {
          setEmployee(null);
        }
      } catch {
        if (!active) return;
        setEmployee(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [params.id]);

  const calendar = useMemo(() => buildCalendar(new Date()), []);
  const isLive = employee?.status === "active" || employee?.status === "working";

  if (loading) {
    return (
      <div className="space-y-4">
        <Link href="/employees" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
          <ArrowLeft size={16} />
          Back to employees
        </Link>
        <div className="glass-panel p-8 text-sm text-slate-300">Loading employee details...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <Link href="/employees" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
          <ArrowLeft size={16} />
          Back to employees
        </Link>
        <div className="glass-panel p-8">
          <h1 className="text-2xl font-semibold text-white">Employee not found</h1>
          <p className="mt-2 text-sm text-slate-400">No employee found for ID: {params.id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link href="/employees" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
        <ArrowLeft size={16} />
        Back to employees
      </Link>

      <section className="glass-panel card-accent-employee p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{employee.name}</h1>
            <p className="mt-2 text-base text-slate-300">{employee.role}</p>
            <p className="mt-1 text-sm uppercase tracking-[0.16em] text-slate-400">{employee.department}</p>
          </div>
          <span className="agent-type employee">Employee</span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <span className={`status-dot ${isLive ? "live" : "idle"}`} />
          <span className="capitalize">{employee.status}</span>
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-sm text-slate-300">
            Current Task: {employee.currentTask || "-"}
          </span>
        </div>
      </section>

      <section className="glass-panel p-5 sm:p-8">
        <h2 className="section-title">Calendar</h2>
        <p className="mt-2 text-sm text-slate-400">{calendar.monthLabel}</p>
        <div className="mt-4 overflow-x-auto">
          <div className="grid min-w-[22rem] grid-cols-7 gap-2">
            {calendar.cells.map((cell, idx) => (
              <div
                key={`${idx}-${cell?.day ?? "blank"}`}
                className={`agent-calendar-cell ${cell?.isToday ? "today" : ""} ${cell ? "" : "empty"}`}
              >
                {cell?.day ?? ""}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
