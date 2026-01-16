"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Separator } from "@workspace/ui/components/separator";
import { ArrowLeftIcon, SaveIcon, ShieldIcon, KeyIcon } from "lucide-react";
import Link from "next/link";

export default function RoleEditPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params.id as Id<"roles">;

  // Check admin access first
  const adminAccess = useQuery(api.adminAccess.checkAdminAccess, {});
  
  // Only fetch data if user is confirmed admin
  const role = useQuery(
    api.roles.getRole,
    adminAccess?.isAdmin ? { roleId } : "skip"
  );
  const allPermissions = useQuery(
    api.permissions.listPermissions,
    adminAccess?.isAdmin ? {} : "skip"
  );

  const updateRole = useMutation(api.roles.updateRole);
  const assignPermissions = useMutation(api.roles.assignPermissions);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Id<"permissions">>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form with role data
  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || "");
      setSelectedPermissions(new Set(role.permissions.map((p) => p._id)));
    }
  }, [role]);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Update role details
      await updateRole({
        roleId,
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Update permissions
      await assignPermissions({
        roleId,
        permissionIds: Array.from(selectedPermissions),
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (permissionId: Id<"permissions">) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permissionId)) {
      newSet.delete(permissionId);
    } else {
      newSet.add(permissionId);
    }
    setSelectedPermissions(newSet);
  };

  const selectAllPermissions = () => {
    if (allPermissions) {
      setSelectedPermissions(new Set(allPermissions.map((p) => p._id)));
    }
  };

  const clearAllPermissions = () => {
    setSelectedPermissions(new Set());
  };

  if (!role || !allPermissions) {
    return (
      <div>
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
          <p className="ml-2">Loading role...</p>
        </div>
      </div>
    );
  }

  // Group permissions by category (first part of the key)
  const permissionGroups = allPermissions.reduce(
    (acc, perm) => {
      const category = perm.key.split(".")[0];
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    },
    {} as Record<string, typeof allPermissions>
  );

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/roles"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Roles
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Edit Role
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {role.userCount} user{role.userCount !== 1 ? "s" : ""} assigned to
              this role
            </p>
          </div>
          <Button onClick={handleSave} disabled={isLoading || !name.trim()}>
            <SaveIcon className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400">
            Changes saved successfully!
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="w-5 h-5" />
              Role Details
            </CardTitle>
            <CardDescription>Basic role information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Permissions Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <KeyIcon className="w-5 h-5" />
                  Permissions
                </CardTitle>
                <CardDescription>
                  Select which permissions this role should have
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllPermissions}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllPermissions}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(permissionGroups).map(([category, perms]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 capitalize">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {perms.map((perm) => (
                      <label
                        key={perm._id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedPermissions.has(perm._id)}
                          onCheckedChange={() => togglePermission(perm._id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                            {perm.name}
                          </p>
                          {perm.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {perm.description}
                            </p>
                          )}
                          <Badge variant="outline" className="mt-1 text-xs">
                            {perm.key}
                          </Badge>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
