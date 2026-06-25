"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Settings,
  Shield,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Mail,
  UserCog,
} from "lucide-react";
import type { Role } from "@prisma/client";

interface Props {
  adminName: string;
  adminEmail: string;
  adminRole: Role;
}

const STAFF_NAV = [
  { href: "/admin",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users",    label: "Users",     icon: Users },
  { href: "/admin/messages", label: "Messages",  icon: Mail },
] as const;

const ADMIN_ONLY_NAV = [
  { href: "/admin/team",     label: "Team",      icon: UserCog },
  { href: "/admin/audit",    label: "Audit Log", icon: ClipboardList },
  { href: "/admin/settings", label: "Settings",  icon: Settings },
] as const;

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/submissions");
  }
  return pathname.startsWith(href);
}

function NavItems({
  pathname,
  adminRole,
  onNavigate,
}: {
  pathname: string;
  adminRole: Role;
  onNavigate?: () => void;
}) {
  const isAdmin = adminRole === "ADMIN";
  const items = isAdmin ? [...STAFF_NAV, ...ADMIN_ONLY_NAV] : [...STAFF_NAV];

  return (
    <nav className="space-y-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[#e60000] text-white"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={16} className="shrink-0" />
            {label}
            {active && (
              <ChevronRight size={14} className="ml-auto opacity-60" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  adminName,
  adminEmail,
  adminRole,
  pathname,
  onNavigate,
}: {
  adminName: string;
  adminEmail: string;
  adminRole: Role;
  pathname: string;
  onNavigate?: () => void;
}) {
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors
    }
    window.location.href = "/admin/login";
  }

  const roleLabel = adminRole === "ADMIN" ? "Administrator" : "Moderator";

  return (
    <div className="flex h-full flex-col bg-[#25282b]">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e60000]">
          <Shield size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-white">
            STAFF PANEL
          </p>
          <p className="truncate text-[10px] text-white/30">
            Pandecora
          </p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
          MENU
        </p>
        <NavItems pathname={pathname} adminRole={adminRole} onNavigate={onNavigate} />
      </div>

      {/* Bottom */}
      <div className="shrink-0 border-t border-white/10 px-3 py-4 space-y-3">
        <div className="rounded-lg bg-white/5 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-white">{adminName}</p>
          <p className="truncate text-xs text-white/40">{adminEmail}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#e60000]/70">
            {roleLabel}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={15} className="shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar({ adminName, adminEmail, adminRole }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent
          adminName={adminName}
          adminEmail={adminEmail}
          adminRole={adminRole}
          pathname={pathname}
        />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between bg-[#25282b] px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#e60000]">
            <Shield size={14} className="text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-white">
            STAFF PANEL
          </p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-72 shadow-2xl">
            <div className="flex h-14 items-center justify-between bg-[#25282b] px-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#e60000]">
                  <Shield size={14} className="text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-white">
                  STAFF PANEL
                </p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
            <div className="h-[calc(100%-3.5rem)]">
              <SidebarContent
                adminName={adminName}
                adminEmail={adminEmail}
                adminRole={adminRole}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
