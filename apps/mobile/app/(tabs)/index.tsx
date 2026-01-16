import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@workspace/backend/convex/_generated/api';
import type { Id } from '@workspace/backend/convex/_generated/dataModel';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <AuthLoading>
        <ThemedText>Checking session...</ThemedText>
      </AuthLoading>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
      <Authenticated>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <OrganizationGate />
        </ScrollView>
      </Authenticated>
    </ThemedView>
  );
}

function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <View style={styles.card}>
      <ThemedText type="title">{flow === 'signIn' ? 'Sign in' : 'Sign up'}</ThemedText>
      <ThemedText style={styles.subtitle}>
        Use email and password to access your account.
      </ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Email"
        inputMode="email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        style={styles.primaryButton}
        onPress={async () => {
          setError(null);
          try {
            await signIn('password', { email, password, flow });
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Sign-in failed.');
          }
        }}>
        <ThemedText style={styles.primaryButtonText}>
          {flow === 'signIn' ? 'Sign in' : 'Create account'}
        </ThemedText>
      </Pressable>
      <Pressable
        style={styles.linkButton}
        onPress={() => setFlow(flow === 'signIn' ? 'signUp' : 'signIn')}>
        <ThemedText style={styles.linkText}>
          {flow === 'signIn' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </ThemedText>
      </Pressable>
      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
    </View>
  );
}

function OrganizationGate() {
  const myOrg = useQuery(api.organizations.getMyOrganization);

  if (myOrg === undefined) {
    return <ThemedText style={styles.helperText}>Loading...</ThemedText>;
  }

  if (myOrg === null) {
    return <CreateOrganizationForm />;
  }

  return <OrganizationDashboard org={myOrg} />;
}

function CreateOrganizationForm() {
  const createOrganization = useMutation(api.organizations.createOrganization);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Organization name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createOrganization({
        name: trimmedName,
        description: description.trim() || undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <ThemedText type="title">Welcome</ThemedText>
        <ThemedText style={styles.subtitle}>
          Create your organization to start managing tournaments.
        </ThemedText>
      </View>

      <View style={styles.formCard}>
        <ThemedText style={styles.sectionTitle}>Create your organization</ThemedText>
        <ThemedText style={styles.sectionLabel}>Organization name</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="AVP League"
          value={name}
          onChangeText={setName}
        />
        <ThemedText style={styles.sectionLabel}>Description (optional)</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Professional volleyball organization"
          value={description}
          onChangeText={setDescription}
        />
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        <Pressable
          style={[styles.primaryButton, isSubmitting ? styles.primaryButtonDisabled : null]}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}>
          <ThemedText style={styles.primaryButtonText}>
            {isSubmitting ? 'Creating organization...' : 'Create organization'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

type OrgData = {
  organization: {
    _id: Id<'organizations'>;
    _creationTime: number;
    name: string;
    description?: string;
    createdBy: Id<'users'>;
  };
  membership: {
    _id: Id<'organizationMembers'>;
    _creationTime: number;
    organizationId: Id<'organizations'>;
    userId: Id<'users'>;
    role: 'owner' | 'admin' | 'scorer';
  };
};

function OrganizationDashboard({ org }: { org: OrgData }) {
  const { signOut } = useAuthActions();
  const canManage = org.membership.role === 'owner' || org.membership.role === 'admin';

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.flexItem}>
          <ThemedText type="title">{org.organization.name}</ThemedText>
          {org.organization.description ? (
            <ThemedText style={styles.subtitle}>{org.organization.description}</ThemedText>
          ) : null}
          <ThemedText style={styles.helperText}>Your role: {org.membership.role}</ThemedText>
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
          <ThemedText>Sign out</ThemedText>
        </Pressable>
      </View>

      <TournamentSection canManage={canManage} />
    </View>
  );
}

function TournamentSection({ canManage }: { canManage: boolean }) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<Id<'tournaments'> | null>(null);
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentDescription, setTournamentDescription] = useState('');
  const [tournamentStatus, setTournamentStatus] = useState<'draft' | 'active' | 'completed'>('draft');
  const [tournamentStartDate, setTournamentStartDate] = useState('');
  const [tournamentEndDate, setTournamentEndDate] = useState('');
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [isCreatingTournament, setIsCreatingTournament] = useState(false);

  const [format, setFormat] = useState<'singles' | 'doubles' | 'teams'>('singles');
  const [name, setName] = useState('');
  const [homeTeamName, setHomeTeamName] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');
  const [homePlayers, setHomePlayers] = useState('');
  const [awayPlayers, setAwayPlayers] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tournaments = useQuery(api.tournaments.listTournaments);
  const createTournament = useMutation(api.tournaments.createTournament);
  const updateTournament = useMutation(api.tournaments.updateTournament);
  const matches = useQuery(api.matches.listMatches);
  const matchesByTournament = useQuery(
    api.matches.listMatchesByTournament,
    selectedTournamentId ? { tournamentId: selectedTournamentId } : 'skip',
  );
  const createMatch = useMutation(api.matches.createMatch);

  const visibleMatches = selectedTournamentId ? matchesByTournament : matches;
  const selectedTournament = tournaments?.find(
    (tournament) => tournament._id === selectedTournamentId,
  );

  const requiredPlayers = format === 'singles' ? 1 : format === 'doubles' ? 2 : 0;

  const parsePlayers = (value: string) =>
    value
      .split(',')
      .map((player) => player.trim())
      .filter(Boolean);

  const buildParticipants = () => {
    const homePlayersList = parsePlayers(homePlayers);
    const awayPlayersList = parsePlayers(awayPlayers);

    const homeParticipant = {
      side: 'home' as const,
      players: homePlayersList,
      ...(format === 'teams' ? { teamName: homeTeamName.trim() } : {}),
    };
    const awayParticipant = {
      side: 'away' as const,
      players: awayPlayersList,
      ...(format === 'teams' ? { teamName: awayTeamName.trim() } : {}),
    };

    return { homeParticipant, awayParticipant };
  };

  const parseDate = (value: string) => (value ? new Date(value).getTime() : undefined);

  const handleCreateTournament = async () => {
    setTournamentError(null);

    const trimmedName = tournamentName.trim();
    if (!trimmedName) {
      setTournamentError('Tournament name is required.');
      return;
    }

    const startDate = parseDate(tournamentStartDate);
    const endDate = parseDate(tournamentEndDate);
    if (startDate !== undefined && endDate !== undefined && startDate > endDate) {
      setTournamentError('Start date must be before end date.');
      return;
    }

    setIsCreatingTournament(true);
    try {
      const id = await createTournament({
        name: trimmedName,
        description: tournamentDescription.trim() || undefined,
        status: tournamentStatus,
        startDate,
        endDate,
      });
      setTournamentName('');
      setTournamentDescription('');
      setTournamentStatus('draft');
      setTournamentStartDate('');
      setTournamentEndDate('');
      setSelectedTournamentId(id);
    } catch (caught) {
      setTournamentError(caught instanceof Error ? caught.message : 'Unable to create tournament.');
    } finally {
      setIsCreatingTournament(false);
    }
  };

  const handleStatusUpdate = async (status: 'draft' | 'active' | 'completed') => {
    if (!selectedTournamentId) {
      return;
    }

    try {
      await updateTournament({ tournamentId: selectedTournamentId, status });
    } catch (caught) {
      setTournamentError(caught instanceof Error ? caught.message : 'Unable to update tournament.');
    }
  };

  const handleCreateMatch = async () => {
    setError(null);

    const { homeParticipant, awayParticipant } = buildParticipants();

    if (format === 'teams') {
      if (!homeParticipant.teamName || !awayParticipant.teamName) {
        setError('Team names are required for team matches.');
        return;
      }
    } else if (
      homeParticipant.players.length !== requiredPlayers ||
      awayParticipant.players.length !== requiredPlayers
    ) {
      setError(`${format} format requires ${requiredPlayers} player(s) per side.`);
      return;
    }

    const trimmedName = name.trim();
    const payload = {
      format,
      participants: [homeParticipant, awayParticipant],
      ...(trimmedName ? { name: trimmedName } : {}),
      ...(selectedTournamentId ? { tournamentId: selectedTournamentId } : {}),
    };

    setIsSubmitting(true);
    try {
      await createMatch(payload);
      setName('');
      setHomeTeamName('');
      setAwayTeamName('');
      setHomePlayers('');
      setAwayPlayers('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create match.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {canManage ? (
        <View style={styles.formCard}>
          <ThemedText style={styles.sectionTitle}>Create a tournament</ThemedText>
          <ThemedText style={styles.sectionLabel}>Tournament name</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Summer Spike Classic"
            value={tournamentName}
            onChangeText={setTournamentName}
          />
          <ThemedText style={styles.sectionLabel}>Description (optional)</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Open division tournament."
            value={tournamentDescription}
            onChangeText={setTournamentDescription}
          />
          <ThemedText style={styles.sectionLabel}>Status</ThemedText>
          <View style={styles.row}>
            {(['draft', 'active', 'completed'] as const).map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.formatButton,
                  tournamentStatus === option ? styles.formatButtonActive : null,
                ]}
                onPress={() => setTournamentStatus(option)}>
                <ThemedText
                  style={
                    tournamentStatus === option ? styles.formatButtonTextActive : styles.formatButtonText
                  }>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <View style={styles.flexItem}>
              <ThemedText style={styles.sectionLabel}>Start date (YYYY-MM-DD)</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="2026-05-01"
                value={tournamentStartDate}
                onChangeText={setTournamentStartDate}
              />
            </View>
            <View style={styles.flexItem}>
              <ThemedText style={styles.sectionLabel}>End date (YYYY-MM-DD)</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="2026-05-03"
                value={tournamentEndDate}
                onChangeText={setTournamentEndDate}
              />
            </View>
          </View>
          {tournamentError ? <ThemedText style={styles.errorText}>{tournamentError}</ThemedText> : null}
          <Pressable
            style={[styles.primaryButton, isCreatingTournament ? styles.primaryButtonDisabled : null]}
            onPress={() => void handleCreateTournament()}
            disabled={isCreatingTournament}>
            <ThemedText style={styles.primaryButtonText}>
              {isCreatingTournament ? 'Creating tournament...' : 'Create tournament'}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Select a tournament</ThemedText>
        <View style={styles.rowWrap}>
          <Pressable
            style={[
              styles.formatButton,
              selectedTournamentId === null ? styles.formatButtonActive : null,
            ]}
            onPress={() => setSelectedTournamentId(null)}>
            <ThemedText
              style={selectedTournamentId === null ? styles.formatButtonTextActive : styles.formatButtonText}>
              All matches
            </ThemedText>
          </Pressable>
          {tournaments?.map((tournament) => (
            <Pressable
              key={tournament._id}
              style={[
                styles.formatButton,
                selectedTournamentId === tournament._id ? styles.formatButtonActive : null,
              ]}
              onPress={() => setSelectedTournamentId(tournament._id)}>
              <ThemedText
                style={
                  selectedTournamentId === tournament._id
                    ? styles.formatButtonTextActive
                    : styles.formatButtonText
                }>
                {tournament.name}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        {selectedTournament && canManage ? (
          <View style={styles.statusCard}>
            <ThemedText style={styles.helperText}>
              Current status: {selectedTournament.status}
            </ThemedText>
            <View style={styles.row}>
              {(['draft', 'active', 'completed'] as const).map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.formatButton,
                    selectedTournament.status === status ? styles.formatButtonActive : null,
                  ]}
                  onPress={() => void handleStatusUpdate(status)}>
                  <ThemedText
                    style={
                      selectedTournament.status === status
                        ? styles.formatButtonTextActive
                        : styles.formatButtonText
                    }>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {canManage ? (
        <View style={styles.formCard}>
          <ThemedText style={styles.sectionTitle}>Create a match</ThemedText>
          <ThemedText style={styles.sectionLabel}>Match name (optional)</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Friday Night Volleyball"
            value={name}
            onChangeText={setName}
          />

          <ThemedText style={styles.sectionLabel}>Format</ThemedText>
          <View style={styles.row}>
            {(['singles', 'doubles', 'teams'] as const).map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.formatButton,
                  format === option ? styles.formatButtonActive : null,
                ]}
                onPress={() => setFormat(option)}>
                <ThemedText style={format === option ? styles.formatButtonTextActive : styles.formatButtonText}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {format !== 'teams' ? (
            <ThemedText style={styles.helperText}>
              Enter exactly {requiredPlayers} player(s) per side.
            </ThemedText>
          ) : null}

          {format === 'teams' ? (
            <View style={styles.row}>
              <View style={styles.flexItem}>
                <ThemedText style={styles.sectionLabel}>Home team</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Home team"
                  value={homeTeamName}
                  onChangeText={setHomeTeamName}
                />
              </View>
              <View style={styles.flexItem}>
                <ThemedText style={styles.sectionLabel}>Away team</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Away team"
                  value={awayTeamName}
                  onChangeText={setAwayTeamName}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.row}>
            <View style={styles.flexItem}>
              <ThemedText style={styles.sectionLabel}>Home players</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Comma-separated names"
                value={homePlayers}
                onChangeText={setHomePlayers}
              />
            </View>
            <View style={styles.flexItem}>
              <ThemedText style={styles.sectionLabel}>Away players</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Comma-separated names"
                value={awayPlayers}
                onChangeText={setAwayPlayers}
              />
            </View>
          </View>

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

          <Pressable
            style={[styles.primaryButton, isSubmitting ? styles.primaryButtonDisabled : null]}
            onPress={() => void handleCreateMatch()}
            disabled={isSubmitting}>
            <ThemedText style={styles.primaryButtonText}>
              {isSubmitting ? 'Creating match...' : 'Create match'}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.matchesSection}>
        <ThemedText type="title">Recent matches</ThemedText>
        {visibleMatches === undefined ? (
          <ThemedText style={styles.helperText}>Loading matches...</ThemedText>
        ) : visibleMatches.length ? (
          visibleMatches.map((match) => {
            const home = match.participants.find((participant) => participant.side === 'home');
            const away = match.participants.find((participant) => participant.side === 'away');
            const homeLabel = home?.teamName || home?.players.join(', ') || 'Home';
            const awayLabel = away?.teamName || away?.players.join(', ') || 'Away';
            const formatLabel = match.format.charAt(0).toUpperCase() + match.format.slice(1);
            const tournamentLabel = match.tournamentId
              ? tournaments?.find((tournament) => tournament._id === match.tournamentId)?.name ??
                'Tournament'
              : 'Independent';

            return (
              <View key={match._id} style={styles.matchCard}>
                <ThemedText style={styles.matchTitle}>{match.name || 'Volleyball Match'}</ThemedText>
                <ThemedText style={styles.helperText}>
                  {formatLabel} · {match.status}
                </ThemedText>
                <ThemedText style={styles.helperText}>{tournamentLabel}</ThemedText>
                <ThemedText style={styles.matchSubtitle}>
                  {homeLabel} vs {awayLabel}
                </ThemedText>
              </View>
            );
          })
        ) : (
          <ThemedText style={styles.helperText}>
            No matches yet.{canManage ? ' Create the first one above.' : ''}
          </ThemedText>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
    alignSelf: 'center',
  },
  section: {
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
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
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    opacity: 0.7,
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
  matchesSection: {
    gap: 12,
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
  matchSubtitle: {
    fontSize: 13,
  },
});
