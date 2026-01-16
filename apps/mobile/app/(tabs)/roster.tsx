import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@workspace/backend/convex/_generated/api';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function RosterScreen() {
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const roster = useQuery(
    api.organizations.getRoster,
    myOrg ? { organizationId: myOrg.organization._id } : 'skip',
  );
  const addTeamName = useMutation(api.organizations.addTeamName);
  const removeTeamName = useMutation(api.organizations.removeTeamName);
  const addPlayerName = useMutation(api.organizations.addPlayerName);
  const removePlayerName = useMutation(api.organizations.removePlayerName);

  const [newTeamName, setNewTeamName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canManage = myOrg?.membership.role === 'owner' || myOrg?.membership.role === 'admin';

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
        <ThemedText>Only owners and admins can manage the roster.</ThemedText>
      </ThemedView>
    );
  }

  const organizationId = myOrg.organization._id;

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;
    setError(null);
    try {
      await addTeamName({ organizationId, name: newTeamName.trim() });
      setNewTeamName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add team');
    }
  };

  const handleRemoveTeam = async (name: string) => {
    setError(null);
    try {
      await removeTeamName({ organizationId, name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove team');
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    setError(null);
    try {
      await addPlayerName({ organizationId, name: newPlayerName.trim() });
      setNewPlayerName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add player');
    }
  };

  const handleRemovePlayer = async (name: string) => {
    setError(null);
    try {
      await removePlayerName({ organizationId, name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove player');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title">Roster</ThemedText>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <View style={styles.formCard}>
          <ThemedText style={styles.sectionTitle}>Team Names</ThemedText>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flexItem]}
              placeholder="Add team name"
              value={newTeamName}
              onChangeText={setNewTeamName}
            />
            <Pressable style={styles.addButton} onPress={() => void handleAddTeam()}>
              <ThemedText style={styles.addButtonText}>Add</ThemedText>
            </Pressable>
          </View>
          <View style={styles.tagContainer}>
            {roster?.teamNames.length === 0 ? (
              <ThemedText style={styles.helperText}>No teams yet</ThemedText>
            ) : null}
            {roster?.teamNames.map((name) => (
              <Pressable key={name} style={styles.tag} onPress={() => void handleRemoveTeam(name)}>
                <ThemedText style={styles.tagText}>{name} ×</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.formCard}>
          <ThemedText style={styles.sectionTitle}>Player Names</ThemedText>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flexItem]}
              placeholder="Add player name"
              value={newPlayerName}
              onChangeText={setNewPlayerName}
            />
            <Pressable style={styles.addButton} onPress={() => void handleAddPlayer()}>
              <ThemedText style={styles.addButtonText}>Add</ThemedText>
            </Pressable>
          </View>
          <View style={styles.tagContainer}>
            {roster?.playerNames.length === 0 ? (
              <ThemedText style={styles.helperText}>No players yet</ThemedText>
            ) : null}
            {roster?.playerNames.map((name) => (
              <Pressable key={name} style={styles.tag} onPress={() => void handleRemovePlayer(name)}>
                <ThemedText style={styles.tagText}>{name} ×</ThemedText>
              </Pressable>
            ))}
          </View>
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
  flexItem: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
  },
  errorText: {
    color: '#b91c1c',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  tagText: {
    fontSize: 14,
  },
});
