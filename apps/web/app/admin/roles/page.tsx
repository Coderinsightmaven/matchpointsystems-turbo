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
import { Label } from "@workspace/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  MoreHorizontalIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
} from "lucide-react";
import Link from "next/link";

export default function RolesPage() {
  // Check admin access first
  const adminAccess = useQuery(api.adminAccess.checkAdminAccess, {});
  
  // Only fetch data if user is confirmed admin
  const roles = useQuery(
    api.roles.listRoles,
    adminAccess?.isAdmin ? {} : "skip"
  );
  const createRole = useMutation(api.roles.createRole);
  const deleteRole = useMutation(api.roles.deleteRole);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<NonNullable<typeof roles>[number] | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await createRole({
        name: newRoleName.trim(),
        description: newRoleDescription.trim() || undefined,
      });
      setCreateDialogOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    setIsLoading(true);
    setError(null);
    try {
      await deleteRole({ roleId: selectedRole._id });
      setDeleteDialogOpen(false);
      setSelectedRole(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setIsLoading(false);
    }
  };

  if (!roles) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
          Roles
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
          <p className="ml-2">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Roles
        </h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="border rounded-lg bg-white dark:bg-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-slate-500 dark:text-slate-400 py-8"
                >
                  No roles defined yet. Create your first role to get started.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role._id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {role.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {role.permissionCount} permission
                      {role.permissionCount !== 1 ? "s" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {role.userCount} user{role.userCount !== 1 ? "s" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontalIcon className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/roles/${role._id}`}>
                            <PencilIcon className="w-4 h-4 mr-2" />
                            Edit Role
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/roles/${role._id}`}>
                            <KeyIcon className="w-4 h-4 mr-2" />
                            Manage Permissions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedRole(role);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600"
                          disabled={role.userCount > 0}
                        >
                          <TrashIcon className="w-4 h-4 mr-2" />
                          Delete Role
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

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Role</DialogTitle>
            <DialogDescription>
              Create a new role to assign to users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Admin, Manager, User"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Describe what this role can do"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                className="mt-1"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewRoleName("");
                setNewRoleDescription("");
                setError(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={isLoading || !newRoleName.trim()}
            >
              {isLoading ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role "{selectedRole?.name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedRole(null);
                setError(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
