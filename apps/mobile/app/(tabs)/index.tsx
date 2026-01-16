import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@workspace/backend/convex/_generated/api';

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
          <SignedInPanel />
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

function SignedInPanel() {
  const { signOut } = useAuthActions();
  const matches = useQuery(api.matches.listMatches);
  const createMatch = useMutation(api.matches.createMatch);

  const [format, setFormat] = useState<'singles' | 'doubles' | 'teams'>('singles');
  const [name, setName] = useState('');
  const [homeTeamName, setHomeTeamName] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');
  const [homePlayers, setHomePlayers] = useState('');
  const [awayPlayers, setAwayPlayers] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View>
          <ThemedText type="title">Volleyball matches</ThemedText>
          <ThemedText style={styles.subtitle}>Create singles, doubles, or team play.</ThemedText>
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
          <ThemedText>Sign out</ThemedText>
        </Pressable>
      </View>

      <View style={styles.formCard}>
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

      <View style={styles.matchesSection}>
        <ThemedText type="title">Recent matches</ThemedText>
        {matches === undefined ? (
          <ThemedText style={styles.helperText}>Loading matches...</ThemedText>
        ) : matches.length ? (
          matches.map((match) => {
            const home = match.participants.find((participant) => participant.side === 'home');
            const away = match.participants.find((participant) => participant.side === 'away');
            const homeLabel = home?.teamName || home?.players.join(', ') || 'Home';
            const awayLabel = away?.teamName || away?.players.join(', ') || 'Away';
            const formatLabel = match.format.charAt(0).toUpperCase() + match.format.slice(1);

            return (
              <View key={match._id} style={styles.matchCard}>
                <ThemedText style={styles.matchTitle}>{match.name || 'Volleyball Match'}</ThemedText>
                <ThemedText style={styles.helperText}>
                  {formatLabel} · {match.status}
                </ThemedText>
                <ThemedText style={styles.matchSubtitle}>
                  {homeLabel} vs {awayLabel}
                </ThemedText>
              </View>
            );
          })
        ) : (
          <ThemedText style={styles.helperText}>No matches yet.</ThemedText>
        )}
      </View>
    </View>
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
    alignItems: 'center',
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
