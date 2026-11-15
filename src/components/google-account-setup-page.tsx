import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

function metadataString(user: User, ...keys: string[]): string {
  for (const key of keys) {
    const value = user.user_metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function googleDisplayName(user: User): string {
  const name = metadataString(user, "full_name", "name");
  if (name) return name;
  const givenName = metadataString(user, "given_name");
  const familyName = metadataString(user, "family_name");
  return [givenName, familyName].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Member";
}

export function GoogleAccountSetupPage({ user }: { user: User }) {
  const [displayName, setDisplayName] = useState(() => googleDisplayName(user));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setProfileReady(false);
    setProfileError("");

    void (async () => {
      if (!supabase) throw new Error("Account setup is unavailable. Please try again later.");
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      if (!active) return;
      setDisplayName(data.display_name || googleDisplayName(user));
      setUsername(data.username);
      setProfileReady(true);
    })().catch((error: unknown) => {
      if (!active) return;
      setProfileError(
        error instanceof Error ? error.message : "Your Google profile could not be loaded.",
      );
    });

    return () => {
      active = false;
    };
  }, [loadAttempt, user]);

  async function finishSetup(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setNotice("");

    const nextName = displayName.trim();
    const nextUsername = username.trim().toLowerCase();
    if (!nextName || nextName.length > 60) {
      setNotice("Enter a name between 1 and 60 characters.");
      return;
    }
    if (!/^[a-z0-9_]{3,50}$/.test(nextUsername)) {
      setNotice("Choose a username with 3–50 lowercase letters, numbers, or underscores.");
      return;
    }
    if (password.length < 8) {
      setNotice("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setNotice("Those passwords don’t match. Please try again.");
      return;
    }

    setPending(true);
    try {
      if (!supabase) throw new Error("Account setup is unavailable. Please try again later.");
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: nextName, username: nextUsername })
        .eq("id", user.id);
      if (profileError?.code === "23505") {
        throw new Error("That username is already taken. Please choose another.");
      }
      if (profileError?.code === "23514") {
        throw new Error("Choose a username with 3–50 lowercase letters, numbers, or underscores.");
      }
      if (profileError) throw profileError;

      const { error: passwordError } = await supabase.auth.updateUser({
        password,
        data: { ...user.user_metadata, pasal_account_setup_completed: true },
      });
      if (passwordError) throw passwordError;
    } catch (error: unknown) {
      setNotice(
        error instanceof Error
          ? error.message
          : "We couldn’t finish setting up your account. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!profileReady) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
        <div className="max-w-md">
          {profileError ? (
            <>
              <p role="alert" className="text-sm text-primary">
                We couldn’t load your Google profile: {profileError}
              </p>
              <Button
                type="button"
                className="mt-5"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              >
                Try again
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted">Loading your Google profile…</p>
          )}
        </div>
      </main>
    );
  }

  const avatarUrl = metadataString(user, "avatar_url", "picture");

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5 py-10">
      <section className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-[var(--shadow-border)] sm:p-8">
        <div className="flex items-center gap-4">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="size-14 rounded-full object-cover"
            />
          )}
          <div>
            <p className="text-sm font-medium text-primary">Google sign-in verified</p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Finish your account</h1>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          We filled in your details from Google. Choose a password for your pasal account; it
          won’t change your Google password.
        </p>

        <form className="mt-6 space-y-4" onSubmit={finishSetup}>
          <div className="space-y-2">
            <Label htmlFor="google-account-name">Display name</Label>
            <Input
              id="google-account-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={60}
              autoComplete="name"
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="google-account-email">Google email</Label>
            <Input
              id="google-account-email"
              type="email"
              value={user.email ?? ""}
              readOnly
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="google-account-username">Username</Label>
            <Input
              id="google-account-username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }
              minLength={3}
              maxLength={50}
              pattern="[a-z0-9_]{3,50}"
              autoComplete="username"
              required
              disabled={pending}
            />
            <p className="text-xs text-muted">
              This unique username was generated from your Google name. You can change it if
              available.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="google-account-password">Create a password</Label>
            <Input
              id="google-account-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="google-account-confirm-password">Confirm password</Label>
            <Input
              id="google-account-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
              disabled={pending}
            />
          </div>
          <p role="alert" aria-live="polite" className="min-h-5 text-sm text-primary">
            {notice}
          </p>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Setting up your account…" : "Create account and continue"}
          </Button>
        </form>
      </section>
    </main>
  );
}
