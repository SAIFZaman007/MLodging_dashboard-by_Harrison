import { NavLink, useNavigate } from "react-router-dom";
import {
  Calendar,
  Home,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  RefreshCw,
  Search,
  Share2,
  Users,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS, type UserRole } from "@/api/types";
import { formatPhoneDisplay, telHref } from "@/lib/format";

/* `minRole` is the lowest rank that should see the link. It mirrors the API's
   own rank ladder, so a moderator is not shown pages where every control 403s. */
interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end: boolean;
  minRole: UserRole;
}

const NAV_SECTIONS: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: "Manage",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, minRole: "moderator" },
      { to: "/orders", label: "Orders", icon: ListOrdered, end: false, minRole: "staff" },
      { to: "/calendar", label: "Calendar", icon: Calendar, end: false, minRole: "moderator" },
      { to: "/channel-sync", label: "Channel Sync", icon: RefreshCw, end: false, minRole: "staff" },
      { to: "/properties", label: "Properties", icon: Home, end: false, minRole: "staff" },
    ],
  },
  {
    heading: "Growth",
    items: [
      { to: "/social-organics", label: "Social Organics", icon: Share2, end: false, minRole: "moderator" },
      { to: "/seo", label: "SEO", icon: Search, end: false, minRole: "moderator" },
    ],
  },
  {
    heading: "Settings",
    items: [{ to: "/users", label: "Team", icon: Users, end: false, minRole: "admin" }],
  },
];

const PHONE = "+16024788888";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, hasRank, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="flex h-dvh w-64 shrink-0 flex-col bg-brand-forest-dark text-brand-cream">
      <div className="flex shrink-0 items-center gap-3 px-6 py-6">
        <img
          src="/assets/logo/logo.png"
          alt=""
          className="h-9 w-9 shrink-0 rounded-full"
        />
        <div className="min-w-0">
          <p className="truncate font-display text-sm text-brand-cream">8888 Augusta</p>
          <p className="text-[11px] text-brand-cream/50">Operator console</p>
        </div>
      </div>

      {/* Only the nav list scrolls, and only if it ever outgrows the rail. */}
      <nav className="scroll-slim min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => hasRank(item.minRole));
          if (visible.length === 0) return null;

          return (
            <div key={section.heading} className="mb-5">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-cream/40">
                {section.heading}
              </p>
              <div className="space-y-1">
                {visible.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-brand-gold/15 font-medium text-brand-gold"
                          : "text-brand-cream/75 hover:bg-brand-cream/5 hover:text-brand-cream"
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-brand-cream/10 px-6 py-5">
        <a
          href={telHref(PHONE)}
          className="block text-sm text-brand-cream/80 transition-colors hover:text-brand-cream"
        >{formatPhoneDisplay(PHONE)}</a>
        <p className="truncate text-xs text-brand-cream/40">
          {user?.full_name ?? "Operator"} · {user ? ROLE_LABELS[user.role] : "Staff"}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-brand-cream/50 transition-colors hover:text-brand-cream"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}