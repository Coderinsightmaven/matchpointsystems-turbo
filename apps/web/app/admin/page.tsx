"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { UsersIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  // Check admin access first - layout handles redirect but we still need to wait
  const adminAccess = useQuery(api.adminAccess.checkAdminAccess, {});
  
  // Only fetch data if user is confirmed admin
  const users = useQuery(
    api.users.listUsers,
    adminAccess?.isAdmin ? {} : "skip"
  );
  const roles = useQuery(
    api.roles.listRoles,
    adminAccess?.isAdmin ? {} : "skip"
  );

  const stats = [
    {
      title: "Total Users",
      value: users?.length ?? "-",
      description: "Registered accounts",
      icon: UsersIcon,
      href: "/admin/users",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Active Users",
      value:
        users?.filter((u) => u.profile?.isActive !== false).length ?? "-",
      description: "Currently active",
      icon: UsersIcon,
      href: "/admin/users",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Roles",
      value: roles?.length ?? "-",
      description: "Defined roles",
      icon: ShieldIcon,
      href: "/admin/roles",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  // Show error state if queries failed (no permission)
  if (users === undefined && roles === undefined) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          Admin Dashboard
        </h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <p className="ml-2">Loading dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {stat.value}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link
                href="/admin/users"
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <UsersIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    Manage Users
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    View, edit, and manage user accounts
                  </p>
                </div>
              </Link>
              <Link
                href="/admin/roles"
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <ShieldIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    Manage Roles
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Create and configure roles with permissions
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Activity logging coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
