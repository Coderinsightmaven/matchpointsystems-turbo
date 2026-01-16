import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function TournamentsScreen() {
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const tournaments = useQuery(api.tournaments.listTournaments, {});
  const createTournament = useMutation(api.tournaments.createTournament);
  const updateTournament = useMutation(api.tournaments.updateTournament);
  const archiveTournament = useMutation(api.tournaments.archiveTournament);
  const createMatch = useMutation(api.matches.createMatch);

  const [selectedTournamentId, setSelectedTournamentId] = useState<Id<'tournaments'> | null>(null);
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentDescription, setTournamentDescription] = useState('');
  const [tournamentStatus, setTournamentStatus] = useState<'draft' | 'active' | 'completed'>('draft');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [matchFormat, setMatchFormat] = useState<'singles' | 'doubles' | 'teams'>('singles');
  const [matchName, setMatchName] = useState('');
  const [homeTeamName, setHomeTeamName] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');
  const [homePlayers, setHomePlayers] = useState('');
  const [awayPlayers, setAwayPlayers] = useState('');
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

  const matchesByTournament = useQuery(
    api.matches.listMatchesByTournament,
    selectedTournamentId ? { tournamentId: selectedTournamentId } : 'skip',
  );

  const canManage = myOrg?.membership.role === 'owner' || myOrg?.membership.role === 'admin';
  const selectedTournament = tournaments?.find((t) => t._id === selectedTournamentId);
  const requiredPlayers = matchFormat === 'singles' ? 1 : matchFormat === 'doubles' ? 2 : 0;

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

  const handleCreateTournament = async () => {
    setError(null);
    const trimmedName = tournamentName.trim();
    if (!trimmedName) {
      setError('Tournament name is required.');
      return;
    }

    setIsCreating(true);
    try {
      const id = await createTournament({
        name: trimmedName,
        description: tournamentDescription.trim() || undefined,
        status: tournamentStatus,
      });
      setTournamentName('');
      setTournamentDescription('');
      setTournamentStatus('draft');
      setSelectedTournamentId(id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create tournament.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusUpdate = async (status: 'draft' | 'active' | 'completed') => {
    if (!selectedTournamentId) return;
    try {
      await updateTournament({ tournamentId: selectedTournamentId, status });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update tournament.');
    }
  };

  const handleArchive = async () => {
    if (!selectedTournamentId) return;
    try {
      await archiveTournament({ tournamentId: selectedTournamentId });
      setSelectedTournamentId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to archive tournament.');
    }
  };

  const handleCreateMatch = async () => {
    setMatchError(null);
    if (!selectedTournamentId) {
      setMatchError('Please select a tournament first.');
      return;
    }

    const homePlayersList = homePlayers.split(',').map((p) => p.trim()).filter(Boolean);
    const awayPlayersList = awayPlayers.split(',').map((p) => p.trim()).filter(Boolean);

    const homeParticipant = {
      side: 'home' as const,
      players: homePlayersList,
      ...(matchFormat === 'teams' ? { teamName: homeTeamName.trim() } : {}),
    };
    const awayParticipant = {
      side: 'away' as const,
      players: awayPlayersList,
      ...(matchFormat === 'teams' ? { teamName: awayTeamName.trim() } : {}),
    };

    if (matchFormat === 'teams') {
      if (!homeParticipant.teamName || !awayParticipant.teamName) {
        setMatchError('Team names are required for team matches.');
        return;
      }
    } else if (homePlayersList.length !== requiredPlayers || awayPlayersList.length !== requiredPlayers) {
      setMatchError(`${matchFormat} format requires ${requiredPlayers} player(s) per side.`);
      return;
    }

    setIsCreatingMatch(true);
    try {
      await createMatch({
        format: matchFormat,
        participants: [homeParticipant, awayParticipant],
        tournamentId: selectedTournamentId,
        ...(matchName.trim() ? { name: matchName.trim() } : {}),
      });
      setMatchName('');
      setHomeTeamName('');
      setAwayTeamName('');
      setHomePlayers('');
      setAwayPlayers('');
    } catch (caught) {
      setMatchError(caught instanceof Error ? caught.message : 'Unable to create match.');
    } finally {
      setIsCreatingMatch(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title">Tournaments</ThemedText>

        {canManage ? (
          <View style={styles.formCard}>
            <ThemedText style={styles.sectionTitle}>Create a tournament</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Tournament name"
              value={tournamentName}
              onChangeText={setTournamentName}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={tournamentDescription}
              onChangeText={setTournamentDescription}
            />
            <View style={styles.row}>
              {(['draft', 'active', 'completed'] as const).map((status) => (
                <Pressable
                  key={status}
                  style={[styles.formatButton, tournamentStatus === status ? styles.formatButtonActive : null]}
                  onPress={() => setTournamentStatus(status)}>
                  <ThemedText
                    style={tournamentStatus === status ? styles.formatButtonTextActive : styles.formatButtonText}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
            <Pressable
              style={[styles.primaryButton, isCreating ? styles.primaryButtonDisabled : null]}
              onPress={() => void handleCreateTournament()}
              disabled={isCreating}>
              <ThemedText style={styles.primaryButtonText}>
                {isCreating ? 'Creating...' : 'Create tournament'}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Select a tournament</ThemedText>
          <View style={styles.rowWrap}>
            {tournaments?.length === 0 ? (
              <ThemedText style={styles.helperText}>No tournaments yet.</ThemedText>
            ) : null}
            {tournaments?.map((tournament) => (
              <Pressable
                key={tournament._id}
                style={[styles.formatButton, selectedTournamentId === tournament._id ? styles.formatButtonActive : null]}
                onPress={() => setSelectedTournamentId(tournament._id)}>
                <ThemedText
                  style={selectedTournamentId === tournament._id ? styles.formatButtonTextActive : styles.formatButtonText}>
                  {tournament.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {selectedTournament && canManage ? (
          <View style={styles.statusCard}>
            <ThemedText style={styles.helperText}>Status: {selectedTournament.status}</ThemedText>
            <View style={styles.row}>
              {(['draft', 'active', 'completed'] as const).map((status) => (
                <Pressable
                  key={status}
                  style={[styles.formatButton, selectedTournament.status === status ? styles.formatButtonActive : null]}
                  onPress={() => void handleStatusUpdate(status)}>
                  <ThemedText
                    style={selectedTournament.status === status ? styles.formatButtonTextActive : styles.formatButtonText}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.archiveButton} onPress={() => void handleArchive()}>
              <ThemedText style={styles.archiveButtonText}>Archive tournament</ThemedText>
            </Pressable>
          </View>
        ) : null}

        {selectedTournamentId && canManage ? (
          <View style={styles.formCard}>
            <ThemedText style={styles.sectionTitle}>Create a match</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Match name (optional)"
              value={matchName}
              onChangeText={setMatchName}
            />
            <View style={styles.row}>
              {(['singles', 'doubles', 'teams'] as const).map((format) => (
                <Pressable
                  key={format}
                  style={[styles.formatButton, matchFormat === format ? styles.formatButtonActive : null]}
                  onPress={() => setMatchFormat(format)}>
                  <ThemedText style={matchFormat === format ? styles.formatButtonTextActive : styles.formatButtonText}>
                    {format.charAt(0).toUpperCase() + format.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            {matchFormat === 'teams' ? (
              <View style={styles.row}>
                <TextInput style={[styles.input, styles.flexItem]} placeholder="Home team" value={homeTeamName} onChangeText={setHomeTeamName} />
                <TextInput style={[styles.input, styles.flexItem]} placeholder="Away team" value={awayTeamName} onChangeText={setAwayTeamName} />
              </View>
            ) : null}
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.flexItem]} placeholder="Home players" value={homePlayers} onChangeText={setHomePlayers} />
              <TextInput style={[styles.input, styles.flexItem]} placeholder="Away players" value={awayPlayers} onChangeText={setAwayPlayers} />
            </View>
            {matchError ? <ThemedText style={styles.errorText}>{matchError}</ThemedText> : null}
            <Pressable
              style={[styles.primaryButton, isCreatingMatch ? styles.primaryButtonDisabled : null]}
              onPress={() => void handleCreateMatch()}
              disabled={isCreatingMatch}>
              <ThemedText style={styles.primaryButtonText}>
                {isCreatingMatch ? 'Creating...' : 'Create match'}
              </ThemedText>
            </Pressable>
          </View>
        ) : selectedTournamentId ? null : canManage ? (
          <ThemedText style={styles.helperText}>Select a tournament to create matches.</ThemedText>
        ) : null}

        {selectedTournamentId ? (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Matches</ThemedText>
            {matchesByTournament === undefined ? (
              <ThemedText style={styles.helperText}>Loading...</ThemedText>
            ) : matchesByTournament.length === 0 ? (
              <ThemedText style={styles.helperText}>No matches yet.</ThemedText>
            ) : (
              matchesByTournament.map((match) => {
                const home = match.participants.find((p) => p.side === 'home');
                const away = match.participants.find((p) => p.side === 'away');
                const homeLabel = home?.teamName || home?.players.join(', ') || 'Home';
                const awayLabel = away?.teamName || away?.players.join(', ') || 'Away';

                return (
                  <View key={match._id} style={styles.matchCard}>
                    <ThemedText style={styles.matchTitle}>{match.name || 'Match'}</ThemedText>
                    <ThemedText style={styles.helperText}>{homeLabel} vs {awayLabel}</ThemedText>
                    <ThemedText style={styles.helperText}>{match.format} - {match.status}</ThemedText>
                  </View>
                );
              })
            )}
          </View>
        ) : null}
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
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flexItem: {
    flex: 1,
  },
  formatButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  formatButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  formatButtonText: {
    opacity: 0.8,
  },
  formatButtonTextActive: {
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
  statusCard: {
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  archiveButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  archiveButtonText: {
    color: '#b91c1c',
    fontSize: 12,
  },
  matchCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 4,
  },
  matchTitle: {
    fontWeight: '600',
  },
});
