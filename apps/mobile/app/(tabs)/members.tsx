import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function MembersScreen() {
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const members = useQuery(
    api.organizations.listMembers,
    myOrg ? { organizationId: myOrg.organization._id } : 'skip',
  );
  const inviteMember = useMutation(api.organizations.inviteMember);
  const updateMemberRole = useMutation(api.organizations.updateMemberRole);
  const removeMember = useMutation(api.organizations.removeMember);

  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'scorer'>('scorer');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = myOrg?.membership.role === 'owner' || myOrg?.membership.role === 'admin';
  const isOwner = myOrg?.membership.role === 'owner';

  if (myOrg === undefined) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (myOrg === null) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Please create an organization first.</ThemedText>
      </ThemedView>
    );
  }

  if (!canManage) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Only owners and admins can manage members.</ThemedText>
      </ThemedView>
    );
  }

  const organizationId = myOrg.organization._id;

  const handleInvite = async () => {
    if (!inviteUserId.trim()) return;
    setError(null);
    setIsInviting(true);
    try {
      await inviteMember({
        organizationId,
        userId: inviteUserId.trim() as Id<'users'>,
        role: inviteRole,
      });
      setInviteUserId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: Id<'organizationMembers'>, role: 'owner' | 'admin' | 'scorer') => {
    setError(null);
    try {
      await updateMemberRole({ memberId, role });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemove = async (memberId: Id<'organizationMembers'>) => {
    setError(null);
    try {
      await removeMember({ memberId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title">Members</ThemedText>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <View style={styles.formCard}>
          <ThemedText style={styles.sectionTitle}>Invite a member</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="User ID"
            value={inviteUserId}
            onChangeText={setInviteUserId}
          />
          <View style={styles.row}>
            <Pressable
              style={[styles.roleButton, inviteRole === 'admin' ? styles.roleButtonActive : null]}
              onPress={() => setInviteRole('admin')}>
              <ThemedText style={inviteRole === 'admin' ? styles.roleButtonTextActive : styles.roleButtonText}>
                Admin
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.roleButton, inviteRole === 'scorer' ? styles.roleButtonActive : null]}
              onPress={() => setInviteRole('scorer')}>
              <ThemedText style={inviteRole === 'scorer' ? styles.roleButtonTextActive : styles.roleButtonText}>
                Scorer
              </ThemedText>
            </Pressable>
          </View>
          <Pressable
            style={[styles.primaryButton, isInviting ? styles.primaryButtonDisabled : null]}
            onPress={() => void handleInvite()}
            disabled={isInviting}>
            <ThemedText style={styles.primaryButtonText}>{isInviting ? 'Inviting...' : 'Invite'}</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Current members</ThemedText>
          {members === undefined ? (
            <ThemedText style={styles.helperText}>Loading...</ThemedText>
          ) : members.length === 0 ? (
            <ThemedText style={styles.helperText}>No members found.</ThemedText>
          ) : (
            members.map((member) => (
              <View key={member._id} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <ThemedText style={styles.memberEmail}>{member.email ?? 'Unknown'}</ThemedText>
                  <ThemedText style={styles.memberRole}>{member.role}</ThemedText>
                </View>
                {isOwner ? (
                  <View style={styles.memberActions}>
                    <View style={styles.row}>
                      {(['owner', 'admin', 'scorer'] as const).map((role) => (
                        <Pressable
                          key={role}
                          style={[styles.smallRoleButton, member.role === role ? styles.smallRoleButtonActive : null]}
                          onPress={() => void handleRoleChange(member._id, role)}>
                          <ThemedText
                            style={member.role === role ? styles.smallRoleButtonTextActive : styles.smallRoleButtonText}>
                            {role.charAt(0).toUpperCase()}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                    <Pressable onPress={() => void handleRemove(member._id)}>
                      <ThemedText style={styles.removeText}>Remove</ThemedText>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 20,
  },
  section: {
    gap: 12,
  },
  formCard: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  roleButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  roleButtonText: {
    opacity: 0.8,
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
  primaryButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  errorText: {
    color: '#b91c1c',
  },
  memberCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberEmail: {
    fontWeight: '500',
  },
  memberRole: {
    fontSize: 12,
    opacity: 0.7,
  },
  memberActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  smallRoleButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  smallRoleButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  smallRoleButtonText: {
    fontSize: 12,
    opacity: 0.8,
  },
  smallRoleButtonTextActive: {
    fontSize: 12,
    color: '#fff',
  },
  removeText: {
    fontSize: 12,
    color: '#b91c1c',
  },
});
