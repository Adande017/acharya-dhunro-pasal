import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { asset, SHOP } from "@/lib/shop";

type AuthMode = "login" | "signup";

export function AuthPage({ onContinue }: { onContinue: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setNotice("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (mode === "signup" && formData.get("password") !== formData.get("confirmPassword")) {
      setNotice("Your passwords don’t match. Please check and try again.");
      return;
    }

    setNotice("Account access isn’t connected yet. You can browse and order as a guest.");
  }

  return (
    <main className="grid min-h-dvh bg-bg lg:grid-cols-2">
      <section className="relative flex min-h-[280px] flex-col justify-between overflow-hidden bg-accent px-6 py-6 text-accent-foreground sm:min-h-[340px] sm:px-10 sm:py-9 lg:min-h-dvh lg:px-14 lg:py-12">
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

        <div id="welcome" className="relative z-10 mt-12 max-w-lg sm:mt-16 lg:mb-8">
          <p className="text-xs font-medium tracking-[0.18em] text-white/75 uppercase">
            Small-batch · Kathmandu, Nepal
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] font-medium tracking-tight sm:text-5xl lg:text-6xl">
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

      <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div className="w-full max-w-md">
          <p className="text-sm font-medium text-primary">Welcome to the pasal</p>
          <h2 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {mode === "login" ? "Good to see you." : "Join our community."}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {mode === "login"
              ? "Sign in to your account, or browse our snacks as a guest."
              : "Create an account to get started, or visit the shop as a guest."}
          </p>

          <div
            className="mt-7 grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1"
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
                className={`h-10 rounded-full text-sm font-medium transition-colors ${
                  mode === option
                    ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                    : "text-muted hover:text-fg"
                }`}
              >
                {option === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
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
                />
              </div>
            )}

            <Button type="submit" size="lg" className="mt-2 w-full">
              {mode === "login" ? "Log in" : "Create account"}
              <ArrowRight />
            </Button>

            <p className="min-h-5 text-sm text-muted" role="status" aria-live="polite">
              {notice}
            </p>
          </form>

          <div className="my-5 flex items-center gap-4 text-xs text-subtle">
            <span className="h-px flex-1 bg-border" />
            <span>or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" size="lg" className="w-full" onClick={onContinue}>
            Browse the shop as a guest
          </Button>
          <p className="mt-4 text-center text-xs leading-relaxed text-subtle">
            Account sign-in and registration aren’t set up yet. You can still browse and order
            without an account.
          </p>
        </div>
      </section>
    </main>
  );
}
