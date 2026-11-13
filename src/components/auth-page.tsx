import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthRedirectUrl, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { asset, SHOP } from "@/lib/shop";

type AuthMode = "login" | "signup" | "forgot" | "reset";
type NoticeKind = "error" | "info" | "success";

function readableAuthError(error: Error): string {
  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) {
    return "That email and password don’t match. Check them and try again.";
  }
  if (message.includes("email not confirmed")) {
    return "Please confirm your email using the link we sent before logging in.";
  }
  if (message.includes("too many requests") || message.includes("rate limit")) {
    return "Too many attempts. Please wait a little while and try again.";
  }
  if (message.includes("password") && (message.includes("weak") || message.includes("short"))) {
    return "Choose a stronger password with at least 8 characters.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "We couldn’t reach the account service. Check your connection and try again.";
  }
  if (message.includes("already registered")) {
    return "An account may already use this email. Try logging in or resetting your password.";
  }
  return error.message;
}

export function AuthPage({
  onContinue,
  onStaffLogin,
  onCustomerLogin,
  staffLogin = false,
  initialNotice = "",
  recoveringPassword = false,
  onPasswordChanged,
}: {
  onContinue: () => void;
  onStaffLogin: () => void;
  onCustomerLogin: () => void;
  staffLogin?: boolean;
  initialNotice?: string;
  recoveringPassword?: boolean;
  onPasswordChanged: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(recoveringPassword ? "reset" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState(initialNotice);
  const [noticeKind, setNoticeKind] = useState<NoticeKind>("info");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (recoveringPassword) setMode("reset");
  }, [recoveringPassword]);

  useEffect(() => {
    if (initialNotice) {
      setNotice(initialNotice);
      setNoticeKind("error");
    }
  }, [initialNotice]);

  function showMessage(message: string, kind: NoticeKind) {
    setNotice(message);
    setNoticeKind(kind);
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setNotice("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    if (!supabase) {
      showMessage(
        "Sign-in setup is incomplete. You can still browse as a guest; the shop owner needs to add the Supabase project settings.",
        "error",
      );
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if ((mode === "signup" || mode === "reset") && password !== confirmPassword) {
      showMessage("Those passwords don’t match. Please try again.", "error");
      return;
    }

    setPending(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: String(formData.get("name") ?? "").trim() },
            emailRedirectTo: getAuthRedirectUrl(),
          },
        });
        if (error) throw error;
        if (data.session) {
          showMessage("Your account is ready. Welcome to the pasal!", "success");
        } else if (data.user?.identities?.length === 0) {
          showMessage(
            "An account may already use this email. Try logging in or resetting your password.",
            "info",
          );
        } else {
          showMessage(
            "If this email can be registered, a confirmation link is on its way. After confirming, come back here to log in.",
            "success",
          );
        }
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthRedirectUrl(),
        });
        if (error) throw error;
        showMessage(
          "If an account exists for that email, a password-reset link is on its way.",
          "success",
        );
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        showMessage("Your password has been updated.", "success");
        onPasswordChanged();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        showMessage(readableAuthError(error), "error");
      } else {
        showMessage("We couldn’t complete that request. Please try again.", "error");
      }
    } finally {
      setPending(false);
    }
  }

  const isRecovery = mode === "reset";
  const showsEmail = mode !== "reset";
  const showsPassword = mode === "login" || mode === "signup" || isRecovery;
  const showsConfirmPassword = mode === "signup" || isRecovery;

  return (
    <main className="page-transition grid min-h-dvh bg-bg sm:grid-cols-[0.9fr_1.1fr]">
      <section className="relative flex min-h-[250px] flex-col justify-between overflow-hidden bg-accent px-6 py-6 text-accent-foreground sm:min-h-dvh sm:px-6 sm:py-9 lg:px-14 lg:py-12">
        <img
          src={asset("product/basket-bright.jpg")}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1610]/90 via-[#1c1610]/35 to-[#1c1610]/25" />

        <a href="#welcome" className="relative z-10 flex w-fit items-center gap-3">
          <img
            src={asset("brand/acharya-dhunro-pasal-logo.png")}
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-full object-cover"
          />
          <span className="font-display text-lg font-medium tracking-tight">{SHOP.name}</span>
        </a>

        <div id="welcome" className="relative z-10 mt-10 max-w-lg sm:mt-12 lg:mb-8">
          <p className="text-xs font-medium tracking-[0.18em] text-white/75 uppercase">
            Small-batch · Kathmandu, Nepal
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] font-medium tracking-tight md:text-5xl lg:text-6xl">
            A little crunch,
            <br />
            a lot of care.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
            Traditional maize, puffed into light, golden pipes. Find your next teatime favorite
            at {SHOP.name}.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-8 sm:px-6 sm:py-10 lg:px-14">
        <div className="w-full max-w-md">
          <p className="text-sm font-medium text-primary">
            {staffLogin ? "Staff inventory sign-in" : "Welcome to the pasal"}
          </p>
          <h2 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {mode === "login"
              ? "Good to see you."
              : mode === "signup"
                ? "Join our community."
                : mode === "forgot"
                  ? "Reset your password."
                  : "Choose a new password."}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {staffLogin
              ? "Use your own account. Inventory access is limited to emails approved by the shop owner."
              : mode === "login"
              ? "Sign in to your account, or browse our snacks as a guest."
              : mode === "signup"
                ? "Create an account to make your next visit easier."
                : mode === "forgot"
                  ? "We’ll email you a secure link to reset your password."
                  : "Use at least 8 characters for your new password."}
          </p>

          {!isSupabaseConfigured && (
            <p className="mt-4 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
              Account sign-in is being set up. You can still browse the shop as a guest.
            </p>
          )}

          {(mode === "login" || mode === "signup") && (
            <div
              className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1"
              role="tablist"
              aria-label="Account options"
            >
              {(["login", "signup"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={mode === option}
                  onClick={() => changeMode(option)}
                  disabled={pending}
                  className={`h-10 rounded-full text-sm font-medium transition-colors duration-180 ${
                    mode === option
                      ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  {option === "login" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>
          )}

          <form className="mt-5 space-y-3.5" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Your name</Label>
                <Input
                  id="fullName"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Name"
                  required
                  disabled={pending}
                />
              </div>
            )}

            {showsEmail && (
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  disabled={pending}
                />
              </div>
            )}

            {showsPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">{isRecovery ? "New password" : "Password"}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="pr-12"
                    required
                    disabled={pending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted transition-colors duration-180 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
                    disabled={pending}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            {showsConfirmPassword && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Enter your password again"
                  required
                  disabled={pending}
                />
              </div>
            )}

            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => changeMode("forgot")}
                  disabled={pending}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending
                ? "Please wait…"
                : mode === "login"
                  ? "Log in"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Update password"}
              {!pending && <ArrowRight />}
            </Button>

            <p
              className={`min-h-5 text-sm ${
                noticeKind === "error" ? "text-primary" : "text-muted"
              }`}
              role={noticeKind === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {notice}
            </p>
          </form>

          {(mode === "forgot" || isRecovery) && (
            <button
              type="button"
              className="mt-2 w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => changeMode("login")}
            >
              Return to log in
            </button>
          )}

          <div className="my-4 flex items-center gap-4 text-xs text-subtle">
            <span className="h-px flex-1 bg-border" />
            <span>or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {!staffLogin && (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={onContinue}
                disabled={pending}
              >
                Browse the shop as a guest
              </Button>
              <button
                type="button"
                className="mt-4 w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                onClick={onStaffLogin}
                disabled={pending}
              >
                Staff sign-in
              </button>
              <p className="mt-3 text-center text-xs leading-relaxed text-subtle">
                Your password is handled securely by Supabase. Guest browsing is always available.
              </p>
            </>
          )}
          {staffLogin && (
            <button
              type="button"
              className="mt-4 w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={onCustomerLogin}
              disabled={pending}
            >
              Return to customer sign-in
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
