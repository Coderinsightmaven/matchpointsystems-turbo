"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  MoreHorizontalIcon,
  SearchIcon,
  KeyIcon,
  UserXIcon,
  UserCheckIcon,
  ShieldIcon,
} from "lucide-react";
import Link from "next/link";

export default function UsersPage() {
  // Check admin access first
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

  const updateUserRole = useMutation(api.users.updateUserRole);
  const activateUser = useMutation(api.users.activateUser);
  const deactivateUser = useMutation(api.users.deactivateUser);
  const resetPassword = useMutation(api.users.resetPassword);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<NonNullable<typeof users>[number] | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const filteredUsers = users?.filter((user) =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    setIsLoading(true);
    try {
      await updateUserRole({
        userId: selectedUser._id,
        roleId: selectedRoleId ? (selectedRoleId as Id<"roles">) : undefined,
      });
      setRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRoleId("");
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser || !newPassword) return;
    setIsLoading(true);
    try {
      await resetPassword({
        userId: selectedUser._id,
        newPassword,
      });
      setPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword("");
    } catch (error) {
      console.error("Failed to reset password:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (user: (typeof users)[number]) => {
    try {
      if (user.profile?.isActive === false) {
        await activateUser({ userId: user._id });
      } else {
        await deactivateUser({ userId: user._id });
      }
    } catch (error) {
      console.error("Failed to toggle user status:", error);
    }
  };

  if (!users) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          Users
        </h1>
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
          <p className="ml-2">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Users
        </h1>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg bg-white dark:bg-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-slate-500 dark:text-slate-400 py-8"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers?.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {user.role ? (
                      <Badge variant="secondary">{user.role.name}</Badge>
                    ) : (
                      <span className="text-slate-400 text-sm">No role</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.profile?.isActive === false ? (
                      <Badge variant="destructive">Inactive</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {new Date(user._creationTime).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontalIcon className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setSelectedRoleId(user.role?._id ?? "");
                            setRoleDialogOpen(true);
                          }}
                        >
                          <ShieldIcon className="w-4 h-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setPasswordDialogOpen(true);
                          }}
                        >
                          <KeyIcon className="w-4 h-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(user)}
                          className={
                            user.profile?.isActive === false
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {user.profile?.isActive === false ? (
                            <>
                              <UserCheckIcon className="w-4 h-4 mr-2" />
                              Activate
                            </>
                          ) : (
                            <>
                              <UserXIcon className="w-4 h-4 mr-2" />
                              Deactivate
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.email}
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
