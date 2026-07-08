"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const boxRef = useRef(null);

  async function load() {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setItems(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleItemClick(item) {
    if (!item.read) {
      await fetch(`/api/notifications/${item.id}`, { method: "PATCH" });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((v) => !v)} className="relative p-2 text-gray-600" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-brand-red text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 max-w-[90vw] bg-white border rounded-md shadow-lg z-30 max-h-96 overflow-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-brand-navy hover:underline">Mark all read</button>
            )}
          </div>
          {items.length === 0 && (
            <p className="text-sm text-gray-400 text-center p-4">No notifications yet.</p>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`w-full text-left px-3 py-2 border-b last:border-0 hover:bg-gray-50 ${!item.read ? "bg-blue-50" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`text-sm ${!item.read ? "font-medium" : ""}`}>{item.title}</span>
                {!item.read && <span className="w-2 h-2 rounded-full bg-brand-navy mt-1.5 flex-shrink-0" />}
              </div>
              {item.message && <p className="text-xs text-gray-500 mt-0.5">{item.message}</p>}
              <p className="text-[11px] text-gray-400 mt-1">{timeAgo(item.created_at)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
