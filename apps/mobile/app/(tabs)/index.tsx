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

  return <Dashboard org={myOrg} />;
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
    _id: string;
    name: string;
    description?: string;
  };
  membership: {
    role: 'owner' | 'admin' | 'scorer';
  };
};

function Dashboard({ org }: { org: OrgData }) {
  const { signOut } = useAuthActions();
  const tournaments = useQuery(api.tournaments.listTournaments, {});
  const members = useQuery(api.organizations.listMembers, {
    organizationId: org.organization._id as Parameters<typeof api.organizations.listMembers>[0]['organizationId'],
  });
  const roster = useQuery(api.organizations.getRoster, {
    organizationId: org.organization._id as Parameters<typeof api.organizations.getRoster>[0]['organizationId'],
  });

  const activeTournaments = tournaments?.filter((t) => t.status === 'active').length ?? 0;
  const totalTournaments = tournaments?.length ?? 0;
  const totalMembers = members?.length ?? 0;
  const totalTeams = roster?.teamNames.length ?? 0;
  const totalPlayers = roster?.playerNames.length ?? 0;

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

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{activeTournaments}</ThemedText>
          <ThemedText style={styles.statLabel}>Active Tournaments</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{totalTournaments}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Tournaments</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{totalMembers}</ThemedText>
          <ThemedText style={styles.statLabel}>Members</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{totalTeams}</ThemedText>
          <ThemedText style={styles.statLabel}>Teams</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statValue}>{totalPlayers}</ThemedText>
          <ThemedText style={styles.statLabel}>Players</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.helperText}>
        Use the tabs below to manage tournaments, roster, and members.
      </ThemedText>
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
  flexItem: {
    flex: 1,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    minWidth: 100,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
});
