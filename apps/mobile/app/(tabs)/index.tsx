import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';

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
        <SignedInPanel />
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

  return (
    <View style={styles.card}>
      <ThemedText type="title">You are signed in</ThemedText>
      <ThemedText style={styles.subtitle}>Convex Auth session is active.</ThemedText>
      <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
        <ThemedText>Sign out</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  subtitle: {
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
});
