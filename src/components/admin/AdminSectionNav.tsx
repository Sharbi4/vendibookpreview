import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  MessagesSquare,
  Truck,
  Headphones,
  DollarSign,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/listings", label: "Listings", icon: FileText },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/messages", label: "Messages", icon: MessagesSquare },
  { to: "/admin/freight", label: "Freight", icon: Truck },
  { to: "/admin/support", label: "Support", icon: Headphones },
  { to: "/admin/finance", label: "Finance", icon: DollarSign },
  { to: "/admin/verified-sellers", label: "Verifications", icon: BadgeCheck },
];

/** Shared section switcher so every admin screen is part of one dashboard. */
const AdminSectionNav = () => {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Admin sections"
      className="mb-6 -mx-4 px-4 overflow-x-auto md:mx-0 md:px-0"
    >
      <ul className="flex items-center gap-2 min-w-max">
        {SECTIONS.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AdminSectionNav;
