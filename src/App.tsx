import { lazy, Suspense, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AboutPage } from "./components/about-page";
import { AuthPage } from "./components/auth-page";
import { CommunityPage } from "./components/community-page";
import { ProductsPage } from "./components/products-page";
import { ShopPage } from "./components/shop-page";
import { SHOP, type PackId } from "./lib/shop";
import { supabase } from "./lib/supabase";

const InventoryPage = lazy(() =>
  import("./components/inventory-page").then((module) => ({
    default: module.InventoryPage,
  })),
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [inventoryAccess, setInventoryAccess] = useState<boolean | null>(null);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [showCommunity, setShowCommunity] = useState(
    () => window.location.hash === "#community" || window.location.hash === "",
  );
  const [showInventory, setShowInventory] = useState(
    () => window.location.hash === "#inventory",
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
        setInventoryAccess(session ? null : false);
        setRecoveringPassword(false);
        if (session) {
          setGuest(false);
          if (window.location.hash === "#inventory") {
            setShowCommunity(false);
            setShowInventory(true);
            setShowProducts(false);
            setShowAbout(false);
          } else {
            setShowCommunity(true);
            setShowInventory(false);
            setShowProducts(false);
            setShowAbout(false);
            if (window.location.hash !== "#community") {
              window.history.replaceState(null, "", "#community");
            }
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
    if (!user || !supabase) {
      setInventoryAccess(false);
      return;
    }

    let active = true;
    setInventoryAccess(null);
    void (async () => {
      try {
        const { data, error } = await supabase.rpc("is_inventory_staff");
        if (!active) return;
        if (error) {
          setInventoryAccess(false);
          setNotice("Staff access could not be verified. Please try again later.");
          return;
        }
        setInventoryAccess(data);
      } catch {
        if (!active) return;
        setInventoryAccess(false);
        setNotice("Staff access could not be verified. Please try again later.");
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
    page: "shop" | "community" | "products" | "about" | "inventory",
    destination = "top",
  ) {
    const hash =
      page === "community"
        ? "#community"
        : page === "inventory"
          ? "#inventory"
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
    setShowProducts(page === "products");
    setShowAbout(page === "about");
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
              This account is not approved for inventory. Ask the shop owner to add your email, then sign in again.
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
            onSignOut={signOut}
            isOwner={user.email?.toLowerCase() === SHOP.email.toLowerCase()}
          />
        </Suspense>
      );
    }

    if (showCommunity) {
      return (
        <CommunityPage
          user={user}
          onShop={() => navigateTo("shop")}
          onSignOut={signOut}
        />
      );
    }

    if (showProducts) {
      return (
        <ProductsPage
          onHome={() => navigateTo("shop")}
          onOrder={(pack) => {
            setSelectedPack(pack);
            navigateTo("shop", "order");
          }}
        />
      );
    }

    if (showAbout) {
      return (
        <AboutPage
          onHome={() => navigateTo("shop")}
          onProducts={() => navigateTo("products")}
          onCommunity={() => navigateTo("community")}
        />
      );
    }

    return (
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
    );
  }

  if (!guest) {
    return (
      <AuthPage
        onContinue={() => setGuest(true)}
        onStaffLogin={() => navigateTo("inventory")}
        onCustomerLogin={() => navigateTo("shop")}
        staffLogin={showInventory}
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
      <ProductsPage
        onHome={() => navigateTo("shop")}
        onOrder={(pack) => {
          setSelectedPack(pack);
          navigateTo("shop", "order");
        }}
      />
    );
  }

  if (showAbout) {
    return (
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
    );
  }

  return (
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
  );
}
