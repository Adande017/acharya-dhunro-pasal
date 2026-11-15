import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthPage } from "./components/auth-page";
import { SHOP, type PackId } from "./lib/shop";
import { isSupabaseConfigured } from "./lib/supabase-config";

const AboutPage = lazy(() =>
  import("./components/about-page").then((module) => ({
    default: module.AboutPage,
  })),
);
const GoogleAccountSetupPage = lazy(() =>
  import("./components/google-account-setup-page").then((module) => ({
    default: module.GoogleAccountSetupPage,
  })),
);
const CommunityPage = lazy(() =>
  import("./components/community-page").then((module) => ({
    default: module.CommunityPage,
  })),
);
const InventoryPage = lazy(() =>
  import("./components/inventory-page").then((module) => ({
    default: module.InventoryPage,
  })),
);
const OwnerDashboardPage = lazy(() =>
  import("./components/owner-dashboard-page").then((module) => ({
    default: module.OwnerDashboardPage,
  })),
);
const ProductsPage = lazy(() =>
  import("./components/products-page").then((module) => ({
    default: module.ProductsPage,
  })),
);
const ShopPage = lazy(() =>
  import("./components/shop-page").then((module) => ({
    default: module.ShopPage,
  })),
);

function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-bg px-6 text-sm text-muted">
          Opening page…
        </main>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState(false);
  const [inventoryAccess, setInventoryAccess] = useState<boolean | null>(null);
  const [ownerAccess, setOwnerAccess] = useState<boolean | null>(null);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [showCommunity, setShowCommunity] = useState(
    () => window.location.hash === "#community" || window.location.hash === "",
  );
  const [showInventory, setShowInventory] = useState(
    () => window.location.hash === "#inventory",
  );
  const [showOwner, setShowOwner] = useState(
    () => window.location.hash === "#owner",
  );
  const [showProducts, setShowProducts] = useState(
    () => window.location.hash === "#products",
  );
  const [showAbout, setShowAbout] = useState(
    () => window.location.hash === "#about",
  );
  const [selectedPack, setSelectedPack] = useState<PackId>("snack");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    let unsubscribe: (() => void) | undefined;
    void import("./lib/supabase")
      .then(({ supabase }) => {
        if (!active) return null;
        if (!supabase) throw new Error("Sign-in setup is incomplete.");
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (!active) return;
          setUser(session?.user ?? null);
          if (event === "PASSWORD_RECOVERY") {
            setRecoveringPassword(true);
            setGuest(false);
          } else if (
            event === "INITIAL_SESSION" ||
            event === "SIGNED_IN" ||
            event === "SIGNED_OUT"
          ) {
            setInventoryAccess(session ? null : false);
            setOwnerAccess(session ? null : false);
            setRecoveringPassword(false);
          }

          const currentHash = window.location.hash;
          const explicitRoute = [
            "#about",
            "#community",
            "#inventory",
            "#order",
            "#owner",
            "#products",
            "#top",
          ].includes(currentHash);
          const shouldRouteToAuthenticatedPage =
            event === "SIGNED_IN" ||
            (event === "INITIAL_SESSION" && Boolean(session) && !explicitRoute);

          if (shouldRouteToAuthenticatedPage && session) {
            setInventoryAccess(null);
            setRecoveringPassword(false);
            setGuest(false);
            const returnToOwner =
              currentHash === "#owner" ||
              window.sessionStorage.getItem("auth-return-to-owner") === "true";
            const returnToStaff =
              !returnToOwner &&
              (currentHash === "#inventory" ||
                window.sessionStorage.getItem("auth-return-to-staff") === "true");
            window.sessionStorage.removeItem("auth-return-to-staff");
            window.sessionStorage.removeItem("auth-return-to-owner");
            if (returnToOwner) {
              window.history.replaceState(null, "", "#owner");
              setShowOwner(true);
              setShowCommunity(false);
              setShowInventory(false);
              setShowProducts(false);
              setShowAbout(false);
            } else if (returnToStaff) {
              window.history.replaceState(null, "", "#inventory");
              setShowOwner(false);
              setShowCommunity(false);
              setShowInventory(true);
              setShowProducts(false);
              setShowAbout(false);
            } else {
              setShowCommunity(true);
              setShowOwner(false);
              setShowInventory(false);
              setShowProducts(false);
              setShowAbout(false);
              if (window.location.hash !== "#community") {
                window.history.replaceState(null, "", "#community");
              }
            }
          }
        });
        unsubscribe = () => subscription.unsubscribe();
        return supabase.auth.getSession();
      })
      .then((result) => {
        if (!active || !result) return;
        const { data, error } = result;
        if (error) {
          setNotice("We couldn’t restore your sign-in. Please log in again.");
        } else {
          setUser(data.session?.user ?? null);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setNotice(
          error instanceof Error
            ? `We couldn’t restore your sign-in: ${error.message}`
            : "We couldn’t restore your sign-in. Please try again.",
        );
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setInventoryAccess(false);
      setOwnerAccess(false);
      return;
    }

    let active = true;
    setInventoryAccess(null);
    void (async () => {
      try {
        const { supabase } = await import("./lib/supabase");
        if (!supabase) throw new Error("Staff access could not be verified.");
        const [staffResult, ownerResult] = await Promise.all([
          supabase.rpc("is_inventory_staff"),
          supabase.rpc("is_inventory_owner"),
        ]);
        if (!active) return;
        if (staffResult.error || ownerResult.error) {
          setInventoryAccess(false);
          setOwnerAccess(false);
          setNotice("Account access could not be verified. Please try again later.");
          return;
        }
        setInventoryAccess(staffResult.data);
        setOwnerAccess(ownerResult.data);
      } catch {
        if (!active) return;
        setInventoryAccess(false);
        setOwnerAccess(false);
        setNotice("Account access could not be verified. Please try again later.");
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    function syncPageFromUrl() {
      setShowProducts(window.location.hash === "#products");
      setShowAbout(window.location.hash === "#about");
      setShowInventory(window.location.hash === "#inventory");
      setShowOwner(window.location.hash === "#owner");
      setShowCommunity(
        window.location.hash === "#community" || window.location.hash === "",
      );
    }

    window.addEventListener("popstate", syncPageFromUrl);
    return () => window.removeEventListener("popstate", syncPageFromUrl);
  }, []);

  useEffect(() => {
    if (showCommunity || showProducts || showAbout || window.location.hash !== "#order") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showAbout, showCommunity, showProducts]);

  function navigateTo(
    page: "shop" | "community" | "products" | "about" | "inventory" | "owner",
    destination = "top",
  ) {
    const hash =
      page === "community"
        ? "#community"
        : page === "inventory"
          ? "#inventory"
          : page === "owner"
            ? "#owner"
            : page === "products"
              ? "#products"
              : page === "about"
                ? "#about"
                : destination === "order"
                  ? "#order"
                  : "#top";
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }
    setShowCommunity(page === "community");
    setShowInventory(page === "inventory");
    setShowOwner(page === "owner");
    setShowProducts(page === "products");
    setShowAbout(page === "about");
  }

  async function signOut() {
    if (!isSupabaseConfigured) {
      setNotice("Sign-in is not configured yet. You can continue browsing as a guest.");
      return;
    }

    try {
      const { supabase } = await import("./lib/supabase");
      if (!supabase) throw new Error("Sign-in is not configured.");
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

  if (user && !recoveringPassword) {
    if (
      user.app_metadata.provider === "google" &&
      user.user_metadata.pasal_account_setup_completed !== true
    ) {
      return (
        <PageSuspense>
          <GoogleAccountSetupPage user={user} />
        </PageSuspense>
      );
    }

    if (showOwner && ownerAccess === null) {
      return (
        <main className="grid min-h-dvh place-items-center bg-bg px-6 text-sm text-muted">
          Checking owner access…
        </main>
      );
    }

    if (showOwner && !ownerAccess) {
      return (
        <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center text-fg">
          <div className="max-w-md">
            <h1 className="font-display text-3xl font-semibold">Owner access required</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              This dashboard is available only to the verified shop owner account.
            </p>
            <button
              type="button"
              onClick={() => navigateTo("shop")}
              className="mt-6 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground"
            >
              Back to shop
            </button>
          </div>
        </main>
      );
    }

    if (showOwner && ownerAccess) {
      return (
        <PageSuspense>
          <OwnerDashboardPage
            onInventory={() => navigateTo("inventory")}
            onSignOut={signOut}
          />
        </PageSuspense>
      );
    }

    if (showInventory && inventoryAccess === null) {
      return (
        <main className="grid min-h-dvh place-items-center bg-bg px-6 text-sm text-muted">
          Checking staff access…
        </main>
      );
    }

    if (showInventory && !inventoryAccess) {
      return (
        <main className="grid min-h-dvh place-items-center bg-bg px-6 text-center text-fg">
          <div className="max-w-md">
            <h1 className="font-display text-3xl font-semibold">Staff access required</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              This account is not approved for inventory. Sign in with the shop owner account ({SHOP.email}), or ask the owner to approve this account’s email under Staff access.
            </p>
            <button
              type="button"
              onClick={() => navigateTo("shop")}
              className="mt-6 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground"
            >
              Back to shop
            </button>
          </div>
        </main>
      );
    }

    if (showInventory && inventoryAccess) {
      return (
        <Suspense
          fallback={
            <main className="grid min-h-dvh place-items-center bg-bg px-6 text-sm text-muted">
              Opening inventory…
            </main>
          }
        >
          <InventoryPage
            onShop={() => navigateTo("shop")}
            onOwnerDashboard={() => navigateTo("owner")}
            onSignOut={signOut}
            isOwner={user.email?.toLowerCase() === SHOP.email.toLowerCase()}
          />
        </Suspense>
      );
    }

    if (showCommunity) {
      return (
        <PageSuspense>
          <CommunityPage
            user={user}
            onShop={() => navigateTo("shop")}
            onSignOut={signOut}
          />
        </PageSuspense>
      );
    }

    if (showProducts) {
      return (
        <PageSuspense>
          <ProductsPage
            onHome={() => navigateTo("shop")}
            onOrder={(pack) => {
              setSelectedPack(pack);
              navigateTo("shop", "order");
            }}
          />
        </PageSuspense>
      );
    }

    if (showAbout) {
      return (
        <PageSuspense>
          <AboutPage
            onHome={() => navigateTo("shop")}
            onProducts={() => navigateTo("products")}
            onCommunity={() => navigateTo("community")}
          />
        </PageSuspense>
      );
    }

    return (
      <PageSuspense>
        <ShopPage
          initialPack={selectedPack}
          onProducts={() => navigateTo("products")}
          onAbout={() => navigateTo("about")}
          onCommunity={() => navigateTo("community")}
          onSignOut={signOut}
          onStaffLogin={() => navigateTo("inventory")}
          onInventory={
            inventoryAccess ? () => navigateTo("inventory") : undefined
          }
          accountNotice={notice}
        />
      </PageSuspense>
    );
  }

  if (!guest) {
    return (
      <AuthPage
        onContinue={() => setGuest(true)}
        onStaffLogin={() => navigateTo("inventory")}
        onCustomerLogin={() => navigateTo("shop")}
        staffLogin={showInventory || showOwner}
        ownerLogin={showOwner}
        initialNotice={notice}
        recoveringPassword={recoveringPassword}
        onPasswordChanged={() => {
          setRecoveringPassword(false);
          setNotice("");
        }}
      />
    );
  }

  if (showProducts) {
    return (
      <PageSuspense>
        <ProductsPage
          onHome={() => navigateTo("shop")}
          onOrder={(pack) => {
            setSelectedPack(pack);
            navigateTo("shop", "order");
          }}
        />
      </PageSuspense>
    );
  }

  if (showAbout) {
    return (
      <PageSuspense>
        <AboutPage
          onHome={() => navigateTo("shop")}
          onProducts={() => navigateTo("products")}
          onCommunity={user ? () => navigateTo("community") : undefined}
          onAccount={
            user
              ? undefined
              : () => {
                  setGuest(false);
                  window.scrollTo(0, 0);
                }
          }
        />
      </PageSuspense>
    );
  }

  return (
    <PageSuspense>
      <ShopPage
        initialPack={selectedPack}
        onProducts={() => navigateTo("products")}
        onAbout={() => navigateTo("about")}
        onCommunity={user ? () => navigateTo("community") : undefined}
        onAccount={
          user
            ? undefined
            : () => {
                setGuest(false);
                window.scrollTo(0, 0);
              }
        }
        onSignOut={user ? signOut : undefined}
        onStaffLogin={!user ? () => navigateTo("inventory") : undefined}
        accountNotice={notice}
      />
    </PageSuspense>
  );
}
