"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { api } from "@workspace/backend/convex/_generated/api";
import {
  UsersIcon,
  ShieldIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ChevronLeftIcon,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    exact: true,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: UsersIcon,
  },
  {
    href: "/admin/roles",
    label: "Roles",
    icon: ShieldIcon,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  // Check if user has admin access
  const adminAccess = useQuery(
    api.adminAccess.checkAdminAccess,
    isAuthenticated ? {} : "skip"
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  // Redirect non-admins to home page
  useEffect(() => {
    if (adminAccess !== undefined && !adminAccess.isAdmin) {
      router.push("/");
    }
  }, [adminAccess, router]);

  if (isLoading || adminAccess === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <p className="ml-2 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !adminAccess.isAdmin) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back to App
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-3">
            Admin Panel
          </h1>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              void signOut().then(() => {
                router.push("/signin");
              });
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100 transition-colors w-full"
          >
            <LogOutIcon className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
