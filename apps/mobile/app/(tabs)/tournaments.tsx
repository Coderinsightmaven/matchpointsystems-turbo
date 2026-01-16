import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, Modal } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';
import * as Haptics from 'expo-haptics';

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
  const [homeSelectedPlayers, setHomeSelectedPlayers] = useState<string[]>([]);
  const [awaySelectedPlayers, setAwaySelectedPlayers] = useState<string[]>([]);
  const [division, setDivision] = useState<'mens' | 'womens' | 'mixed'>('mens');
  const [scoringFormat, setScoringFormat] = useState<'standard' | 'avp_beach'>('avp_beach');
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

  const [scoringMatchId, setScoringMatchId] = useState<Id<'matches'> | null>(null);

  const matchesByTournament = useQuery(
    api.matches.listMatchesByTournament,
    selectedTournamentId ? { tournamentId: selectedTournamentId } : 'skip',
  );

  const canManage = myOrg?.membership.role === 'owner' || myOrg?.membership.role === 'admin';
  const canScore = myOrg?.membership.role === 'owner' || myOrg?.membership.role === 'admin' || myOrg?.membership.role === 'scorer';
  const selectedTournament = tournaments?.find((t) => t._id === selectedTournamentId);
  const requiredPlayers = matchFormat === 'singles' ? 1 : matchFormat === 'doubles' ? 2 : 0;
  const teamNames = myOrg?.organization.teamNames ?? [];
  const playerNames = myOrg?.organization.playerNames ?? [];

  const toggleHomePlayer = (name: string) => {
    if (homeSelectedPlayers.includes(name)) {
      setHomeSelectedPlayers(homeSelectedPlayers.filter((p) => p !== name));
    } else if (matchFormat === 'teams' || homeSelectedPlayers.length < requiredPlayers) {
      setHomeSelectedPlayers([...homeSelectedPlayers, name]);
    }
  };

  const toggleAwayPlayer = (name: string) => {
    if (awaySelectedPlayers.includes(name)) {
      setAwaySelectedPlayers(awaySelectedPlayers.filter((p) => p !== name));
    } else if (matchFormat === 'teams' || awaySelectedPlayers.length < requiredPlayers) {
      setAwaySelectedPlayers([...awaySelectedPlayers, name]);
    }
  };

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

    const homeParticipant = {
      side: 'home' as const,
      players: homeSelectedPlayers,
      ...(matchFormat === 'teams' ? { teamName: homeTeamName.trim() } : {}),
    };
    const awayParticipant = {
      side: 'away' as const,
      players: awaySelectedPlayers,
      ...(matchFormat === 'teams' ? { teamName: awayTeamName.trim() } : {}),
    };

    if (matchFormat === 'teams') {
      if (!homeParticipant.teamName || !awayParticipant.teamName) {
        setMatchError('Team names are required for team matches.');
        return;
      }
    } else if (homeSelectedPlayers.length !== requiredPlayers || awaySelectedPlayers.length !== requiredPlayers) {
      setMatchError(`${matchFormat} format requires ${requiredPlayers} player(s) per side.`);
      return;
    }

    setIsCreatingMatch(true);
    try {
      await createMatch({
        format: matchFormat,
        division,
        participants: [homeParticipant, awayParticipant],
        tournamentId: selectedTournamentId,
        scoringFormat,
        ...(matchName.trim() ? { name: matchName.trim() } : {}),
      });
      setMatchName('');
      setHomeTeamName('');
      setAwayTeamName('');
      setHomeSelectedPlayers([]);
      setAwaySelectedPlayers([]);
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
            <ThemedText style={styles.labelText}>Match Format</ThemedText>
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
            <ThemedText style={styles.labelText}>Division</ThemedText>
            <View style={styles.row}>
              {([
                { value: 'mens', label: "Men's" },
                { value: 'womens', label: "Women's" },
                { value: 'mixed', label: 'Mixed' },
              ] as const).map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.formatButton, division === opt.value ? styles.formatButtonActive : null]}
                  onPress={() => setDivision(opt.value)}>
                  <ThemedText style={division === opt.value ? styles.formatButtonTextActive : styles.formatButtonText}>
                    {opt.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText style={styles.labelText}>Scoring Format</ThemedText>
            <View style={styles.row}>
              <Pressable
                style={[styles.formatButton, styles.flexItem, scoringFormat === 'avp_beach' ? styles.formatButtonActive : null]}
                onPress={() => setScoringFormat('avp_beach')}>
                <ThemedText style={scoringFormat === 'avp_beach' ? styles.formatButtonTextActive : styles.formatButtonText}>
                  AVP Beach
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.formatButton, styles.flexItem, scoringFormat === 'standard' ? styles.formatButtonActive : null]}
                onPress={() => setScoringFormat('standard')}>
                <ThemedText style={scoringFormat === 'standard' ? styles.formatButtonTextActive : styles.formatButtonText}>
                  Standard
                </ThemedText>
              </Pressable>
            </View>
            {matchFormat === 'teams' ? (
              <>
                <ThemedText style={styles.labelText}>Home Team</ThemedText>
                {teamNames.length > 0 ? (
                  <View style={styles.rowWrap}>
                    {teamNames.map((team) => {
                      const isSelected = homeTeamName === team;
                      const isOtherSide = awayTeamName === team;
                      return (
                        <Pressable
                          key={team}
                          style={[
                            styles.formatButton,
                            isSelected ? styles.formatButtonActive : null,
                            isOtherSide ? styles.formatButtonDisabled : null,
                          ]}
                          onPress={() => !isOtherSide && setHomeTeamName(isSelected ? '' : team)}
                          disabled={isOtherSide}>
                          <ThemedText style={isSelected ? styles.formatButtonTextActive : isOtherSide ? styles.formatButtonTextDisabled : styles.formatButtonText}>
                            {team}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <ThemedText style={styles.helperText}>No teams in roster.</ThemedText>
                )}
                <ThemedText style={styles.labelText}>Away Team</ThemedText>
                {teamNames.length > 0 ? (
                  <View style={styles.rowWrap}>
                    {teamNames.map((team) => {
                      const isSelected = awayTeamName === team;
                      const isOtherSide = homeTeamName === team;
                      return (
                        <Pressable
                          key={team}
                          style={[
                            styles.formatButton,
                            isSelected ? styles.formatButtonActive : null,
                            isOtherSide ? styles.formatButtonDisabled : null,
                          ]}
                          onPress={() => !isOtherSide && setAwayTeamName(isSelected ? '' : team)}
                          disabled={isOtherSide}>
                          <ThemedText style={isSelected ? styles.formatButtonTextActive : isOtherSide ? styles.formatButtonTextDisabled : styles.formatButtonText}>
                            {team}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <ThemedText style={styles.helperText}>No teams in roster.</ThemedText>
                )}
              </>
            ) : null}
            <ThemedText style={styles.labelText}>
              Home Players {matchFormat !== 'teams' ? `(${homeSelectedPlayers.length}/${requiredPlayers})` : ''}
            </ThemedText>
            {playerNames.length > 0 ? (
              <View style={styles.rowWrap}>
                {playerNames.map((player) => {
                  const isSelected = homeSelectedPlayers.includes(player);
                  const isOtherSide = awaySelectedPlayers.includes(player);
                  const canSelect = matchFormat === 'teams' || homeSelectedPlayers.length < requiredPlayers;
                  const isDisabled = isOtherSide || (!isSelected && !canSelect);
                  return (
                    <Pressable
                      key={player}
                      style={[
                        styles.formatButton,
                        isSelected ? styles.formatButtonActive : null,
                        isDisabled ? styles.formatButtonDisabled : null,
                      ]}
                      onPress={() => !isDisabled && toggleHomePlayer(player)}
                      disabled={isDisabled}>
                      <ThemedText style={isSelected ? styles.formatButtonTextActive : isDisabled ? styles.formatButtonTextDisabled : styles.formatButtonText}>
                        {player}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <ThemedText style={styles.helperText}>No players in roster.</ThemedText>
            )}
            <ThemedText style={styles.labelText}>
              Away Players {matchFormat !== 'teams' ? `(${awaySelectedPlayers.length}/${requiredPlayers})` : ''}
            </ThemedText>
            {playerNames.length > 0 ? (
              <View style={styles.rowWrap}>
                {playerNames.map((player) => {
                  const isSelected = awaySelectedPlayers.includes(player);
                  const isOtherSide = homeSelectedPlayers.includes(player);
                  const canSelect = matchFormat === 'teams' || awaySelectedPlayers.length < requiredPlayers;
                  const isDisabled = isOtherSide || (!isSelected && !canSelect);
                  return (
                    <Pressable
                      key={player}
                      style={[
                        styles.formatButton,
                        isSelected ? styles.formatButtonActive : null,
                        isDisabled ? styles.formatButtonDisabled : null,
                      ]}
                      onPress={() => !isDisabled && toggleAwayPlayer(player)}
                      disabled={isDisabled}>
                      <ThemedText style={isSelected ? styles.formatButtonTextActive : isDisabled ? styles.formatButtonTextDisabled : styles.formatButtonText}>
                        {player}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <ThemedText style={styles.helperText}>No players in roster.</ThemedText>
            )}
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
                const divisionLabel = match.division
                  ? match.division === 'mens' ? "Men's" : match.division === 'womens' ? "Women's" : 'Mixed'
                  : null;
                const formatLabel = match.format.charAt(0).toUpperCase() + match.format.slice(1);

                const scoreDisplay = match.score
                  ? `${match.score.setsWon.home}-${match.score.setsWon.away} (${match.score.home}-${match.score.away})`
                  : null;

                return (
                  <Pressable
                    key={match._id}
                    style={styles.matchCard}
                    onPress={() => canScore && match.scoringFormat ? setScoringMatchId(match._id) : null}>
                    <View style={styles.matchHeader}>
                      <ThemedText style={styles.matchTitle}>{match.name || 'Match'}</ThemedText>
                      <View style={[styles.statusBadge, match.status === 'in_progress' ? styles.statusBadgeLive : null]}>
                        <ThemedText style={styles.statusBadgeText}>
                          {match.status === 'in_progress' ? 'LIVE' : match.status}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.helperText}>{homeLabel} vs {awayLabel}</ThemedText>
                    <ThemedText style={styles.helperText}>
                      {divisionLabel && `${divisionLabel} `}{formatLabel}
                    </ThemedText>
                    {scoreDisplay ? (
                      <ThemedText style={styles.scoreText}>{scoreDisplay}</ThemedText>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={scoringMatchId !== null} animationType="slide" presentationStyle="pageSheet">
        {scoringMatchId && <ScoringModal matchId={scoringMatchId} onClose={() => setScoringMatchId(null)} />}
      </Modal>
    </ThemedView>
  );
}

function ScoringModal({ matchId, onClose }: { matchId: Id<'matches'>; onClose: () => void }) {
  const matchScore = useQuery(api.scoring.getMatchScore, { matchId });
  const startMatch = useMutation(api.scoring.startMatch);
  const addPoint = useMutation(api.scoring.addPoint);
  const undoPoint = useMutation(api.scoring.undoPoint);
  const endMatch = useMutation(api.scoring.endMatch);

  if (matchScore === undefined) {
    return (
      <ThemedView style={styles.modalContainer}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (matchScore === null) {
    return (
      <ThemedView style={styles.modalContainer}>
        <ThemedText>Match not found.</ThemedText>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <ThemedText>Close</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const home = matchScore.participants.find((p) => p.side === 'home');
  const away = matchScore.participants.find((p) => p.side === 'away');
  const homeLabel = home?.teamName || home?.players.join(', ') || 'Home';
  const awayLabel = away?.teamName || away?.players.join(', ') || 'Away';
  const maxSets = matchScore.scoringFormat === 'standard' ? 5 : 3;

  const handleStart = async () => {
    try {
      await startMatch({ matchId });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPoint = async (side: 'home' | 'away') => {
    try {
      await addPoint({ matchId, side });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUndo = async () => {
    try {
      await undoPoint({ matchId });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnd = async () => {
    try {
      await endMatch({ matchId });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ThemedView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <ThemedText type="title">{matchScore.name || 'Match'}</ThemedText>
        <Pressable onPress={onClose}>
          <ThemedText style={styles.closeText}>Close</ThemedText>
        </Pressable>
      </View>

      {matchScore.status === 'scheduled' && (
        <View style={styles.centeredContent}>
          <ThemedText style={styles.helperText}>Match has not started</ThemedText>
          <Pressable style={styles.startButton} onPress={() => void handleStart()}>
            <ThemedText style={styles.startButtonText}>Start Match</ThemedText>
          </Pressable>
        </View>
      )}

      {matchScore.status === 'in_progress' && matchScore.score && (
        <>
          <ThemedText style={styles.setInfo}>Set {matchScore.score.currentSet} of {maxSets}</ThemedText>

          <View style={styles.setsDisplay}>
            <ThemedText style={styles.setsScore}>{matchScore.score.setsWon.home}</ThemedText>
            <ThemedText style={styles.setsDivider}>-</ThemedText>
            <ThemedText style={styles.setsScore}>{matchScore.score.setsWon.away}</ThemedText>
          </View>

          <View style={styles.scoreRow}>
            <Pressable style={styles.scoreButton} onPress={() => void handleAddPoint('home')}>
              <ThemedText style={styles.teamLabel} numberOfLines={1}>{homeLabel}</ThemedText>
              <ThemedText style={styles.bigScore}>{matchScore.score.home}</ThemedText>
              <ThemedText style={styles.tapHint}>Tap to score</ThemedText>
            </Pressable>

            <Pressable style={styles.scoreButton} onPress={() => void handleAddPoint('away')}>
              <ThemedText style={styles.teamLabel} numberOfLines={1}>{awayLabel}</ThemedText>
              <ThemedText style={styles.bigScore}>{matchScore.score.away}</ThemedText>
              <ThemedText style={styles.tapHint}>Tap to score</ThemedText>
            </Pressable>
          </View>

          {matchScore.score.setHistory.length > 0 && (
            <View style={styles.historyRow}>
              {matchScore.score.setHistory.map((set, idx) => (
                <ThemedText key={idx} style={styles.historyText}>
                  Set {idx + 1}: {set.home}-{set.away}
                </ThemedText>
              ))}
            </View>
          )}

          <View style={styles.actionsRow}>
            {matchScore.canUndo && (
              <Pressable style={styles.undoButton} onPress={() => void handleUndo()}>
                <ThemedText>Undo</ThemedText>
              </Pressable>
            )}
            <Pressable style={styles.endButton} onPress={() => void handleEnd()}>
              <ThemedText style={styles.endButtonText}>End Match</ThemedText>
            </Pressable>
          </View>
        </>
      )}

      {matchScore.status === 'completed' && matchScore.score && (
        <View style={styles.centeredContent}>
          <ThemedText style={styles.completedText}>Match Completed</ThemedText>
          <View style={styles.setsDisplay}>
            <View style={styles.finalScoreBlock}>
              <ThemedText style={styles.teamLabel}>{homeLabel}</ThemedText>
              <ThemedText style={styles.finalScore}>{matchScore.score.setsWon.home}</ThemedText>
            </View>
            <ThemedText style={styles.setsDivider}>-</ThemedText>
            <View style={styles.finalScoreBlock}>
              <ThemedText style={styles.teamLabel}>{awayLabel}</ThemedText>
              <ThemedText style={styles.finalScore}>{matchScore.score.setsWon.away}</ThemedText>
            </View>
          </View>
        </View>
      )}
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
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
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
  formatButtonDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  formatButtonTextDisabled: {
    color: '#9ca3af',
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
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchTitle: {
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  statusBadgeLive: {
    backgroundColor: '#22c55e',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  closeText: {
    color: '#3b82f6',
  },
  closeButton: {
    padding: 12,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  startButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  setInfo: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 8,
  },
  setsDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  setsScore: {
    fontSize: 32,
    fontWeight: '700',
  },
  setsDivider: {
    fontSize: 24,
    opacity: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  scoreButton: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  bigScore: {
    fontSize: 64,
    fontWeight: '700',
  },
  tapHint: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  historyText: {
    fontSize: 12,
    opacity: 0.7,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  undoButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
  },
  endButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  endButtonText: {
    color: '#b91c1c',
  },
  completedText: {
    fontSize: 18,
    opacity: 0.7,
  },
  finalScoreBlock: {
    alignItems: 'center',
  },
  finalScore: {
    fontSize: 48,
    fontWeight: '700',
  },
});
