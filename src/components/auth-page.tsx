import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Smartphone } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthRedirectUrl, isSupabaseConfigured } from "@/lib/supabase-config";
import { asset, SHOP } from "@/lib/shop";

type AuthMode = "login" | "signup" | "forgot" | "reset" | "phone" | "phone-verify";
type NoticeKind = "error" | "info" | "success";

function readableAuthError(error: Error): string {
  const code =
    "code" in error && typeof error.code === "string" ? error.code.toLowerCase() : "";
  const message = `${error.message} ${code}`.toLowerCase();
  if (message.includes("otp_disabled")) {
    return "Phone sign-in is not enabled yet. The shop owner needs to enable Phone Auth and configure an SMS provider in Supabase. SMS delivery may cost extra.";
  }
  if (
    message.includes("provider is not enabled") ||
    message.includes("provider_disabled") ||
    message.includes("unsupported provider")
  ) {
    return "This sign-in provider is not enabled yet. The shop owner needs to configure it in Supabase Auth.";
  }
  if (message.includes("invalid login credentials")) {
    return "That email and password don’t match. Check them and try again.";
  }
  if (message.includes("email not confirmed")) {
    return "Please confirm your email before logging in. Check your inbox and spam folder, or resend the link below.";
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
  if (message.includes("invalid otp") || message.includes("token has expired")) {
    return "That verification code is invalid or expired. Request a new code and try again.";
  }
  return error.message;
}

function isUnconfirmedEmail(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code =
    "code" in error && typeof error.code === "string" ? error.code.toLowerCase() : "";
  return code === "email_not_confirmed" || error.message.toLowerCase().includes("email not confirmed");
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-4 shrink-0">
      <path fill="#4285F4" d="M47.5 24.55c0-1.57-.14-3.08-.4-4.55H24v9.02h13.22a11.3 11.3 0 0 1-4.9 7.42l7.72 5.99c4.5-4.16 7.46-10.3 7.46-17.88Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.72-5.99c-2.14 1.44-4.87 2.3-8.19 2.3-6.29 0-11.63-4.24-13.53-9.95l-7.98 6.15C6.43 42.62 14.59 48 24 48Z" />
      <path fill="#FBBC05" d="M10.47 28.56a14.4 14.4 0 0 1 0-9.12l-7.98-6.15a24 24 0 0 0 0 21.42l7.98-6.15Z" />
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.22 3.6l6.9-6.9C35.9 2.38 30.47 0 24 0 14.59 0 6.43 5.38 2.49 13.29l7.98 6.15C12.37 13.74 17.71 9.5 24 9.5Z" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#FFFFFF" d="M13.55 20v-6.2h2.08l.31-2.42h-2.39V9.84c0-.7.2-1.17 1.2-1.17h1.28V6.51c-.22-.03-.98-.1-1.86-.1-1.84 0-3.1 1.12-3.1 3.19v1.78H9v2.42h2.07V20h2.48Z" />
    </svg>
  );
}

function TikTokLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0">
      <path d="M14.7 3.5v10.2a4 4 0 1 1-3.7-4" fill="none" stroke="#25F4EE" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.1 3.5v10.2a4 4 0 1 1-3.7-4" fill="none" stroke="#FE2C55" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.4 3.5v10.2a4 4 0 1 1-3.7-4M15.4 3.5c.3 2.2 1.6 3.6 3.8 4.2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AuthPage({
  onContinue,
  onStaffLogin,
  onCustomerLogin,
  staffLogin = false,
  ownerLogin = false,
  initialNotice = "",
  recoveringPassword = false,
  onPasswordChanged,
}: {
  onContinue: () => void;
  onStaffLogin: () => void;
  onCustomerLogin: () => void;
  staffLogin?: boolean;
  ownerLogin?: boolean;
  initialNotice?: string;
  recoveringPassword?: boolean;
  onPasswordChanged: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(recoveringPassword ? "reset" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState(initialNotice);
  const [noticeKind, setNoticeKind] = useState<NoticeKind>("info");
  const [pending, setPending] = useState(false);
  const [phoneIntent, setPhoneIntent] = useState<"login" | "signup">("login");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");

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
    setUnconfirmedEmail("");
  }

  async function handleSocialSignIn(provider: Provider | "custom:tiktok") {
    setNotice("");
    if (!isSupabaseConfigured) {
      showMessage("Sign-in setup is incomplete. Please try again later.", "error");
      return;
    }

    setPending(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      if (!supabase) throw new Error("Sign-in setup is incomplete.");
      if (ownerLogin) {
        window.sessionStorage.setItem("auth-return-to-owner", "true");
      } else if (staffLogin) {
        window.sessionStorage.setItem("auth-return-to-staff", "true");
      }
      const { error } = await supabase.auth.signInWithOAuth({
        // Supabase supports custom OAuth identifiers, but this SDK's Provider type omits them.
        provider: provider as Provider,
        options: { redirectTo: getAuthRedirectUrl() },
      });
      if (error) throw error;
    } catch (error: unknown) {
      window.sessionStorage.removeItem("auth-return-to-owner");
      window.sessionStorage.removeItem("auth-return-to-staff");
      if (error instanceof Error) {
        showMessage(readableAuthError(error), "error");
      } else {
        showMessage("We couldn’t start sign-in. Please try again.", "error");
      }
      setPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setUnconfirmedEmail("");

    if (!isSupabaseConfigured) {
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
    const phone = String(formData.get("phone") ?? "").replace(/[\s()-]/g, "");

    if ((mode === "signup" || mode === "reset") && password !== confirmPassword) {
      showMessage("Those passwords don’t match. Please try again.", "error");
      return;
    }

    if (mode === "phone" && !/^\+[1-9]\d{7,14}$/.test(phone)) {
      showMessage("Enter a valid phone number with its country code, such as +977 98XXXXXXXX.", "error");
      return;
    }

    setPending(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      if (!supabase) throw new Error("Sign-in setup is incomplete.");
      if (mode === "phone") {
        const { error } = await supabase.auth.signInWithOtp({
          phone,
          options: {
            shouldCreateUser: phoneIntent === "signup",
            ...(phoneIntent === "signup" && {
              data: { full_name: String(formData.get("name") ?? "").trim() },
            }),
          },
        });
        if (error) throw error;
        setPhoneNumber(phone);
        setMode("phone-verify");
        showMessage("We sent a verification code by SMS.", "success");
      } else if (mode === "phone-verify") {
        const { error } = await supabase.auth.verifyOtp({
          phone: phoneNumber,
          token: String(formData.get("token") ?? "").trim(),
          type: "sms",
        });
        if (error) throw error;
      } else if (mode === "signup") {
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
      if (isUnconfirmedEmail(error)) setUnconfirmedEmail(email);
      if (error instanceof Error) {
        showMessage(readableAuthError(error), "error");
      } else {
        showMessage("We couldn’t complete that request. Please try again.", "error");
      }
    } finally {
      setPending(false);
    }
  }

  async function resendConfirmation(): Promise<void> {
    if (!unconfirmedEmail) return;
    setPending(true);
    setNotice("");
    try {
      const { supabase } = await import("@/lib/supabase");
      if (!supabase) throw new Error("Sign-in setup is incomplete.");
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: unconfirmedEmail,
        options: { emailRedirectTo: getAuthRedirectUrl() },
      });
      if (error) throw error;
      showMessage(
        "If this address can be confirmed, a new link is on its way. Check your inbox and spam folder.",
        "success",
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        showMessage(readableAuthError(error), "error");
      } else {
        showMessage("We couldn’t resend the confirmation link. Please try again.", "error");
      }
    } finally {
      setPending(false);
    }
  }

  const isRecovery = mode === "reset";
  const isPhoneMode = mode === "phone" || mode === "phone-verify";
  const showsEmail = mode === "login" || mode === "signup" || mode === "forgot";
  const showsPassword = mode === "login" || mode === "signup" || isRecovery;
  const showsConfirmPassword = mode === "signup" || isRecovery;
  const showsName = mode === "signup" || (mode === "phone" && phoneIntent === "signup");

  return (
    <main className="page-transition grid min-h-dvh grid-cols-1 bg-bg sm:grid-cols-[0.9fr_1.1fr]">
      <section className="relative flex min-w-0 min-h-[112px] flex-col justify-between overflow-hidden bg-accent px-6 py-4 text-accent-foreground sm:min-h-dvh sm:px-6 sm:py-9 lg:px-14 lg:py-12">
        <img
          src={asset("product/basket-bright.webp")}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1610]/90 via-[#1c1610]/35 to-[#1c1610]/25" />

        <a href="#welcome" className="relative z-10 flex w-fit items-center gap-3">
          <img
            src={asset("brand/acharya-dhunro-pasal-logo.webp")}
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-full object-cover"
          />
          <span className="font-display text-lg font-medium tracking-tight">{SHOP.name}</span>
        </a>

        <div id="welcome" className="relative z-10 mt-10 hidden max-w-lg sm:mt-12 sm:block lg:mb-8">
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

      <section className="flex min-w-0 items-center justify-center px-5 py-8 sm:px-6 sm:py-10 lg:px-14">
        <div className="w-full max-w-md">
          <p className="text-sm font-medium text-primary">
            {staffLogin
              ? "Staff inventory sign-in"
              : isPhoneMode
                ? "Phone sign-in"
                : "Welcome to the pasal"}
          </p>
          <h2 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {mode === "phone"
              ? phoneIntent === "signup"
                ? "Join with your phone."
                : "Sign in with your phone."
              : mode === "phone-verify"
                ? "Check your messages."
                : mode === "login"
              ? "Good to see you."
              : mode === "signup"
                ? "Join our community."
                : mode === "forgot"
                  ? "Reset your password."
                  : "Choose a new password."}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {mode === "phone"
              ? "We’ll text you a one-time verification code."
              : mode === "phone-verify"
                ? `Enter the code we sent to ${phoneNumber}.`
                : staffLogin
              ? "Use the shop owner’s account or an email approved for inventory. Configured social sign-in is also available."
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
            {showsName && (
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

            {mode === "phone" && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+977 98XXXXXXXX"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  required
                  disabled={pending}
                />
                <p className="text-xs text-subtle">Include the +country code.</p>
              </div>
            )}

            {mode === "phone-verify" && (
              <div className="space-y-2">
                <Label htmlFor="phoneToken">SMS verification code</Label>
                <Input
                  id="phoneToken"
                  name="token"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter your code"
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
                  onChange={(event) => {
                    if (unconfirmedEmail && event.target.value.trim() !== unconfirmedEmail) {
                      setUnconfirmedEmail("");
                      setNotice("");
                    }
                  }}
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
                    minLength={mode === "login" ? undefined : 8}
                    placeholder={mode === "login" ? "Enter your password" : "At least 8 characters"}
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
                : mode === "phone"
                  ? "Send verification code"
                  : mode === "phone-verify"
                    ? "Verify and continue"
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
            {mode === "login" && unconfirmedEmail && (
              <button
                type="button"
                className="w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                onClick={() => void resendConfirmation()}
                disabled={pending}
              >
                {pending ? "Sending confirmation link…" : "Resend confirmation email"}
              </button>
            )}
          </form>

          {mode === "phone-verify" && (
            <button
              type="button"
              className="mt-2 w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => changeMode("phone")}
              disabled={pending}
            >
              Change phone number
            </button>
          )}

          {isPhoneMode && (
            <button
              type="button"
              className="mt-2 w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => changeMode(phoneIntent)}
              disabled={pending}
            >
              Use email instead
            </button>
          )}

          {(mode === "forgot" || isRecovery) && (
            <button
              type="button"
              className="mt-2 w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => changeMode("login")}
            >
              Return to log in
            </button>
          )}

          {(mode === "login" || mode === "signup") && (
            <div className="mb-5">
              <div className="my-4 flex items-center gap-4 text-xs text-subtle">
                <span className="h-px flex-1 bg-border" />
                <span>or continue with</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start px-2"
                  onClick={() => void handleSocialSignIn("google")}
                  disabled={pending}
                >
                  <GoogleLogo />
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start px-2"
                  onClick={() => void handleSocialSignIn("facebook")}
                  disabled={pending}
                >
                  <FacebookLogo />
                  Facebook
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start px-2"
                  onClick={() => void handleSocialSignIn("custom:tiktok")}
                  disabled={pending}
                >
                  <TikTokLogo />
                  TikTok
                </Button>
                {!staffLogin && (
                  <Button
                    type="button"
                    variant="outline"
                    className="col-span-2 w-full justify-start px-2 sm:col-span-1"
                    onClick={() => {
                      setPhoneIntent(mode);
                      setPhoneNumber("");
                      changeMode("phone");
                    }}
                    disabled={pending}
                  >
                    <Smartphone aria-hidden="true" />
                    Continue with phone
                  </Button>
                )}
              </div>
            </div>
          )}
          {!staffLogin && (
            <>
              <div className="my-4 flex items-center gap-4 text-xs text-subtle">
                <span className="h-px flex-1 bg-border" />
                <span>or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
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
