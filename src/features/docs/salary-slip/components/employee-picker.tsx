"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { SalarySlipFormValues } from "../types";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  designation: string | null;
  department: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankIFSC: string | null;
  panNumber: string | null;
}

interface EmployeePickerProps {
  employees: Employee[];
  onSelect?: (dbId: string | undefined) => void;
}

export function EmployeePicker({ employees, onSelect }: EmployeePickerProps) {
  const { setValue } = useFormContext<SalarySlipFormValues>();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.employeeId && e.employeeId.toLowerCase().includes(search.toLowerCase())),
  );

  const selectEmployee = (emp: Employee) => {
    setSelectedName(emp.name);
    onSelect?.(emp.id);
    setValue("employeeName", emp.name);
    if (emp.employeeId) setValue("employeeId", emp.employeeId);
    if (emp.designation) setValue("designation", emp.designation);
    if (emp.department) setValue("department", emp.department);
    if (emp.bankName) setValue("bankName", emp.bankName);
    if (emp.bankAccount) setValue("bankAccountNumber", emp.bankAccount);
    if (emp.bankIFSC) setValue("bankIfsc", emp.bankIFSC);
    if (emp.panNumber) setValue("pan", emp.panNumber);
    setIsOpen(false);
    setSearch("");
  };

  const unlinkEmployee = () => {
    setSelectedName("");
    onSelect?.(undefined);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (employees.length === 0) return null;

  return (
    <div ref={ref} className="relative mb-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--foreground-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          {selectedName ? `Employee: ${selectedName}` : "Select employee"}
        </button>
        {selectedName && (
          <button
            type="button"
            onClick={unlinkEmployee}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Unlink
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-xl border border-[var(--border-soft)] bg-white shadow-lg">
          <div className="p-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">No employees found</p>
            ) : (
              filtered.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => selectEmployee(emp)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="font-medium text-slate-900">{emp.name}</div>
                  {(emp.employeeId || emp.designation) && (
                    <div className="text-xs text-slate-400">
                      {emp.employeeId && `#${emp.employeeId}`}
                      {emp.employeeId && emp.designation && " · "}
                      {emp.designation}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 p-2">
            <a
              href="/app/data/employees/new"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--accent)] hover:bg-slate-50 rounded-lg"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add new employee
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
