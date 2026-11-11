import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthPage } from "./components/auth-page";
import { CommunityPage } from "./components/community-page";
import { ShopPage } from "./components/shop-page";
import { supabase } from "./lib/supabase";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [showCommunity, setShowCommunity] = useState(
    () => window.location.hash !== "#top",
  );
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setRecoveringPassword(true);
        setGuest(false);
      } else if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setRecoveringPassword(false);
        if (session) {
          setGuest(false);
          setShowCommunity(true);
          if (window.location.hash !== "#community") {
            window.history.replaceState(null, "", "#community");
          }
        }
      }
      setAuthReady(true);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setNotice("We couldn’t restore your sign-in. Please log in again.");
        } else {
          setUser(data.session?.user ?? null);
        }
        setAuthReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setNotice(
          error instanceof Error
            ? `We couldn’t restore your sign-in: ${error.message}`
            : "We couldn’t restore your sign-in. Please try again.",
        );
        setAuthReady(true);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function syncPageFromUrl() {
      setShowCommunity(
        window.location.hash === "#community" || window.location.hash === "",
      );
    }

    window.addEventListener("popstate", syncPageFromUrl);
    return () => window.removeEventListener("popstate", syncPageFromUrl);
  }, []);

  function navigateTo(page: "shop" | "community") {
    const hash = page === "community" ? "#community" : "#top";
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }
    setShowCommunity(page === "community");
  }

  async function signOut() {
    if (!supabase) {
      setNotice("Sign-in is not configured yet. You can continue browsing as a guest.");
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setNotice("We couldn’t sign you out. Please try again.");
        return;
      }
      setNotice("");
    } catch (error: unknown) {
      setNotice(
        error instanceof Error
          ? `We couldn’t sign you out: ${error.message}`
          : "We couldn’t sign you out. Please try again.",
      );
    }
  }

  if (!authReady) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-6 text-sm text-muted">
        Restoring your sign-in…
      </main>
    );
  }

  if (user && !recoveringPassword) {
    return showCommunity ? (
      <CommunityPage
        user={user}
        onShop={() => navigateTo("shop")}
        onSignOut={signOut}
      />
    ) : (
      <ShopPage
        onCommunity={() => navigateTo("community")}
        onSignOut={signOut}
        accountNotice={notice}
      />
    );
  }

  return guest ? (
    <ShopPage
      onAccount={
        user
          ? undefined
          : () => {
              setGuest(false);
              window.scrollTo(0, 0);
            }
      }
      onSignOut={user ? signOut : undefined}
      accountNotice={notice}
    />
  ) : (
    <AuthPage
      onContinue={() => setGuest(true)}
      initialNotice={notice}
      recoveringPassword={recoveringPassword}
      onPasswordChanged={() => {
        setRecoveringPassword(false);
        setNotice("");
      }}
    />
  );
}
