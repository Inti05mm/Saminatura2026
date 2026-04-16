import React from "react";

type NavItem = {
  id: string;
  label: string;
};

export default function AdminSidebar({
  items,
  activeId,
  onGo,
}: {
  items: NavItem[];
  activeId: string;
  onGo: (id: string) => void;
}) {
  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center gap-2 py-3 overflow-x-auto">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-2">
            Administración
          </span>

          {items.map((it) => {
            const active = it.id === activeId;
            return (
              <button
                key={it.id}
                onClick={() => onGo(it.id)}
                className={[
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-[#00bf63]/15 text-[#0b6b3a]"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-800",
                ].join(" ")}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
