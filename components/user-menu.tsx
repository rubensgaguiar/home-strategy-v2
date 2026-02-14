"use client";

import { signOut, useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session?.user) return null;

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-border hover:ring-muted transition-all tap-highlight"
      >
        <div className="w-full h-full bg-surface flex items-center justify-center text-[11px] font-bold text-muted">
          {initials}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl shadow-lg border border-border py-1 z-50 animate-scale-in">
          <div className="px-3.5 py-2.5 border-b border-border">
            <p className="text-[13px] font-medium text-foreground truncate">
              {session.user.name}
            </p>
            <p className="text-[11px] text-muted truncate">{session.user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full px-3.5 py-2 text-left text-[13px] text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
