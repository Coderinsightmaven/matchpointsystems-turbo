"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  ArrowLeftIcon,
  KeyIcon,
  ShieldIcon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react";
import Link from "next/link";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as Id<"users">;

  // Check admin access first
  const adminAccess = useQuery(api.adminAccess.checkAdminAccess, {});
  
  // Only fetch data if user is confirmed admin
  const user = useQuery(
    api.users.getUser,
    adminAccess?.isAdmin ? { userId } : "skip"
  );
  const roles = useQuery(
    api.roles.listRoles,
    adminAccess?.isAdmin ? {} : "skip"
  );

  const updateUserRole = useMutation(api.users.updateUserRole);
  const activateUser = useMutation(api.users.activateUser);
  const deactivateUser = useMutation(api.users.deactivateUser);
  const resetPassword = useMutation(api.users.resetPassword);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = async (roleId: string) => {
    setIsLoading(true);
    try {
      await updateUserRole({
        userId,
        roleId: roleId ? (roleId as Id<"roles">) : undefined,
      });
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword) return;
    setIsLoading(true);
    try {
      await resetPassword({
        userId,
        newPassword,
      });
      setPasswordDialogOpen(false);
      setNewPassword("");
    } catch (error) {
      console.error("Failed to reset password:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setIsLoading(true);
    try {
      if (user?.profile?.isActive === false) {
        await activateUser({ userId });
      } else {
        await deactivateUser({ userId });
      }
    } catch (error) {
      console.error("Failed to toggle user status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
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
          <p className="ml-2">Loading user...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Users
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {user.email}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              User ID: {user._id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user.profile?.isActive === false ? (
              <Badge variant="destructive">Inactive</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>Basic user information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-500 dark:text-slate-400">Email</Label>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <Label className="text-slate-500 dark:text-slate-400">
                Created
              </Label>
              <p className="font-medium">
                {new Date(user._creationTime).toLocaleString()}
              </p>
            </div>
            {user.emailVerificationTime && (
              <div>
                <Label className="text-slate-500 dark:text-slate-400">
                  Email Verified
                </Label>
                <p className="font-medium">
                  {new Date(user.emailVerificationTime).toLocaleString()}
                </p>
              </div>
            )}
            {user.profile?.lastPasswordResetAt && (
              <div>
                <Label className="text-slate-500 dark:text-slate-400">
                  Last Password Reset
                </Label>
                <p className="font-medium">
                  {new Date(user.profile.lastPasswordResetAt).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role & Permissions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="w-5 h-5" />
              Role & Permissions
            </CardTitle>
            <CardDescription>
              Manage this user's role and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Assigned Role</Label>
              <Select
                value={user.role?._id ?? ""}
                onValueChange={handleRoleChange}
                disabled={isLoading}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No role</SelectItem>
                  {roles?.map((role) => (
                    <SelectItem key={role._id} value={role._id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {user.permissions && user.permissions.length > 0 && (
              <div>
                <Label className="text-slate-500 dark:text-slate-400">
                  Permissions
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {user.permissions.map((perm) => (
                    <Badge key={perm.key} variant="outline">
                      {perm.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Manage this user account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setPasswordDialogOpen(true)}
                disabled={isLoading}
              >
                <KeyIcon className="w-4 h-4 mr-2" />
                Reset Password
              </Button>

              {user.profile?.isActive === false ? (
                <Button
                  variant="outline"
                  onClick={handleToggleActive}
                  disabled={isLoading}
                  className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <UserCheckIcon className="w-4 h-4 mr-2" />
                  Activate Account
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleToggleActive}
                  disabled={isLoading}
                  className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <UserXIcon className="w-4 h-4 mr-2" />
                  Deactivate Account
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {user.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="New password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false);
                setNewPassword("");
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordReset}
              disabled={isLoading || newPassword.length < 8}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
