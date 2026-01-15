"use client"

import { useState } from "react"
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"

export function AuthPanel() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <AuthLoading>
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </AuthLoading>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
      <Authenticated>
        <SignedInPanel />
      </Authenticated>
    </div>
  )
}

function SignInForm() {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn")
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setError(null)
        const formData = new FormData(event.currentTarget)
        formData.set("flow", flow)
        try {
          await signIn("password", formData)
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Sign-in failed.")
        }
      }}
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Use email and password to access your account.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
      >
        {flow === "signIn" ? "Sign in" : "Create account"}
      </button>
      <button
        type="button"
        className="w-full text-sm text-muted-foreground"
        onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
      >
        {flow === "signIn"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
    </form>
  )
}

function SignedInPanel() {
  const { signOut } = useAuthActions()

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">You are signed in</h1>
      <p className="text-sm text-muted-foreground">
        Convex Auth session is active.
      </p>
      <button
        type="button"
        className="rounded-md border border-input px-3 py-2 text-sm font-medium"
        onClick={() => void signOut()}
      >
        Sign out
      </button>
    </div>
  )
}
