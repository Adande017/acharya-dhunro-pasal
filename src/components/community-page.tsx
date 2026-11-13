import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Heart,
  LogOut,
  MessageCircle,
  MessagesSquare,
  Search,
  Send,
  Store,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

type CommunityTab = "feed" | "members" | "messages" | "profile";
type ProfileRow = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  created_at: string;
};
type CommunityProfile = ProfileRow & { avatarUrl: string | null };
type PostRow = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
};
type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
};
type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};
type FriendshipRow = {
  user_low: string;
  user_high: string;
  requester_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
};
type ConversationSummary = {
  id: string;
  other: CommunityProfile;
  latestMessage: string;
  latestAt: string;
};
type FeedPost = {
  post: PostRow;
  author: CommunityProfile;
  comments: Array<{ comment: CommentRow; author: CommunityProfile }>;
  likeCount: number;
  liked: boolean;
};

const TABS: Array<{ id: CommunityTab; label: string; icon: typeof Users }> = [
  { id: "feed", label: "Community", icon: MessagesSquare },
  { id: "members", label: "Find friends", icon: Users },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "profile", label: "My profile", icon: Camera },
];

function messageOf(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "";
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "";

  if (
    code === "PGRST205" ||
    (message.toLowerCase().includes("friendships") &&
      (message.toLowerCase().includes("schema cache") ||
        message.toLowerCase().includes("does not exist")))
  ) {
    return "Friend connections aren’t set up yet. Run the friendships migration in Supabase, then reload.";
  }
  return message || "Something went wrong. Please try again.";
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({ profile, size = "md" }: { profile?: CommunityProfile; size?: "sm" | "md" | "lg" }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const sizeClass = size === "lg" ? "size-20 text-xl" : size === "sm" ? "size-9 text-xs" : "size-11 text-sm";
  const avatarUrl = profile?.avatarUrl;
  return avatarUrl && failedUrl !== avatarUrl ? (
    <img
      src={avatarUrl}
      alt={`${profile.display_name}'s profile`}
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(avatarUrl)}
      className={`${sizeClass} shrink-0 rounded-full bg-surface-muted object-cover ring-2 ring-bg shadow-[var(--shadow-border)]`}
    />
  ) : (
    <span
      className={`${sizeClass} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-surface-muted font-semibold text-accent ring-2 ring-bg shadow-[var(--shadow-border)]`}
      aria-label={profile?.display_name ?? "Member"}
    >
      {profile ? initials(profile.display_name) : "?"}
    </span>
  );
}

async function signedProfiles(rows: ProfileRow[]): Promise<CommunityProfile[]> {
  const client = supabase;
  if (!client) throw new Error("Community service is unavailable.");
  return Promise.all(
    rows.map(async (row) => {
      if (!row.avatar_path) return { ...row, avatarUrl: null };
      const { data, error } = await client.storage
        .from("avatars")
        .createSignedUrl(row.avatar_path, 3600);
      if (error) throw error;
      return { ...row, avatarUrl: data.signedUrl };
    }),
  );
}

export function CommunityPage({
  user,
  onShop,
  onSignOut,
}: {
  user: User;
  onShop: () => void;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<CommunityTab>("feed");
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [members, setMembers] = useState<CommunityProfile[]>([]);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [friendships, setFriendships] = useState<FriendshipRow[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [postText, setPostText] = useState("");
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [messageText, setMessageText] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!avatarFile) {
      setPreviewAvatar(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setPreviewAvatar(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  async function loadProfile(): Promise<CommunityProfile> {
    if (!supabase) throw new Error("Community service is unavailable.");
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error?.code === "PGRST116") {
      throw new Error("Your member profile is missing. Run the community database migration.");
    }
    if (error) throw error;
    const [result] = await signedProfiles([data]);
    if (!result) throw new Error("Your member profile could not be loaded.");
    setProfile(result);
    setDisplayName(result.display_name);
    return result;
  }

  async function loadMembers(): Promise<CommunityProfile[]> {
    if (!supabase) throw new Error("Community service is unavailable.");
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("display_name", { ascending: true })
      .limit(200);
    if (error) throw error;
    const results = await signedProfiles(data);
    setMembers(results);
    return results;
  }

  async function loadFeed(profiles = members): Promise<void> {
    if (!supabase) throw new Error("Community service is unavailable.");
    const { data: posts, error: postError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (postError) throw postError;
    const postIds = posts.map((post) => post.id);
    if (!postIds.length) {
      setFeed([]);
      return;
    }

    const missingIds = [...new Set(posts.map((post) => post.author_id))].filter(
      (id) => !profiles.some((member) => member.id === id),
    );
    let allProfiles = profiles;
    if (missingIds.length) {
      const { data, error } = await supabase.from("profiles").select("*").in("id", missingIds);
      if (error) throw error;
      allProfiles = [...profiles, ...(await signedProfiles(data))];
    }
    const [likesResult, commentsResult] = await Promise.all([
      supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
      supabase.from("comments").select("*").in("post_id", postIds).order("created_at"),
    ]);
    if (likesResult.error) throw likesResult.error;
    if (commentsResult.error) throw commentsResult.error;

    const commentAuthorIds = [...new Set(commentsResult.data.map((comment) => comment.author_id))];
    const missingCommentAuthors = commentAuthorIds.filter(
      (id) => !allProfiles.some((member) => member.id === id),
    );
    if (missingCommentAuthors.length) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("id", missingCommentAuthors);
      if (error) throw error;
      allProfiles = [...allProfiles, ...(await signedProfiles(data))];
    }

    setFeed(
      posts.map((post) => ({
        post,
        author: allProfiles.find((member) => member.id === post.author_id) ?? {
          id: post.author_id,
          display_name: "Member",
          avatar_path: null,
          created_at: post.created_at,
          avatarUrl: null,
        },
        comments: commentsResult.data
          .filter((comment) => comment.post_id === post.id)
          .map((comment) => ({
            comment,
            author: allProfiles.find((member) => member.id === comment.author_id) ?? {
              id: comment.author_id,
              display_name: "Member",
              avatar_path: null,
              created_at: comment.created_at,
              avatarUrl: null,
            },
          })),
        likeCount: likesResult.data.filter((like) => like.post_id === post.id).length,
        liked: likesResult.data.some(
          (like) => like.post_id === post.id && like.user_id === user.id,
        ),
      })),
    );
  }

  async function loadConversations(profiles = members): Promise<void> {
    if (!supabase) throw new Error("Community service is unavailable.");
    const { data: memberships, error } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id")
      .eq("user_id", user.id);
    if (error) throw error;
    const conversationIds = [...new Set(memberships.map((item) => item.conversation_id))];
    if (!conversationIds.length) {
      setConversations([]);
      return;
    }

    const { data: participants, error: participantsError } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds);
    if (participantsError) throw participantsError;
    const otherIds = [...new Set(
      participants
        .filter((item) => item.user_id !== user.id)
        .map((item) => item.user_id),
    )];
    let allProfiles = profiles;
    const missing = otherIds.filter((id) => !allProfiles.some((member) => member.id === id));
    if (missing.length) {
      const { data, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", missing);
      if (profilesError) throw profilesError;
      allProfiles = [...allProfiles, ...(await signedProfiles(data))];
    }
    const [messagesResult, conversationsResult] = await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("conversations").select("*").in("id", conversationIds),
    ]);
    if (messagesResult.error) throw messagesResult.error;
    if (conversationsResult.error) throw conversationsResult.error;

    const latestByConversation = new Map<string, MessageRow>();
    for (const message of messagesResult.data) {
      if (!latestByConversation.has(message.conversation_id)) {
        latestByConversation.set(message.conversation_id, message);
      }
    }
    const summaries = participants
      .filter((item) => item.user_id !== user.id)
      .map((item) => {
        const other = allProfiles.find((member) => member.id === item.user_id);
        if (!other) return null;
        const latest = latestByConversation.get(item.conversation_id);
        return {
          id: item.conversation_id,
          other,
          latestMessage: latest?.content ?? "Start a conversation",
          latestAt:
            latest?.created_at ??
            conversationsResult.data.find((conversation) => conversation.id === item.conversation_id)
              ?.created_at ??
            "",
        };
      })
      .filter((item): item is ConversationSummary => item !== null)
      .sort((a, b) => b.latestAt.localeCompare(a.latestAt));
    setConversations(summaries);
  }

  async function loadMessages(conversationId: string): Promise<void> {
    if (!supabase) throw new Error("Community service is unavailable.");
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    setMessages(data);
  }

  async function loadFriendships(): Promise<FriendshipRow[]> {
    if (!supabase) throw new Error("Community service is unavailable.");
    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    setFriendships(data);
    return data;
  }

  async function refreshCommunity(): Promise<void> {
    setNotice("");
    setLoading(true);
    try {
      await loadProfile();
      const loadedMembers = await loadMembers();
      await Promise.all([
        loadFeed(loadedMembers),
        loadConversations(loadedMembers),
        loadFriendships(),
      ]);
    } catch (error: unknown) {
      setNotice(messageOf(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshCommunity();
  }, [user.id]);

  useEffect(() => {
    if (tab !== "messages" || !activeConversation) return;
    let active = true;
    const refreshMessages = () => {
      void loadMessages(activeConversation).catch((error: unknown) => {
        if (active) setNotice(messageOf(error));
      });
    };
    refreshMessages();
    const interval = window.setInterval(refreshMessages, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [tab, activeConversation]);

  async function withPending(action: () => Promise<void>): Promise<void> {
    setPending(true);
    setNotice("");
    try {
      await action();
    } catch (error: unknown) {
      setNotice(messageOf(error));
    } finally {
      setPending(false);
    }
  }

  async function publishPost(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const content = postText.trim();
    const client = supabase;
    if (!content || !client) return;
    await withPending(async () => {
      const { error } = await client.from("posts").insert({ author_id: user.id, content });
      if (error) throw error;
      setPostText("");
      await loadFeed();
    });
  }

  async function toggleLike(post: FeedPost): Promise<void> {
    const client = supabase;
    if (!client) return;
    await withPending(async () => {
      const result = post.liked
        ? await client
            .from("post_likes")
            .delete()
            .eq("post_id", post.post.id)
            .eq("user_id", user.id)
        : await client.from("post_likes").insert({ post_id: post.post.id, user_id: user.id });
      if (result.error) throw result.error;
      await loadFeed();
    });
  }

  async function publishComment(event: FormEvent<HTMLFormElement>, postId: string): Promise<void> {
    event.preventDefault();
    const content = commentText[postId]?.trim() ?? "";
    const client = supabase;
    if (!content || !client) return;
    await withPending(async () => {
      const { error } = await client
        .from("comments")
        .insert({ post_id: postId, author_id: user.id, content });
      if (error) throw error;
      setCommentText((current) => ({ ...current, [postId]: "" }));
      await loadFeed();
    });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const client = supabase;
    if (!client || !profile) return;
    const nextName = displayName.trim();
    if (!nextName || nextName.length > 60) {
      setNotice("Enter a name between 1 and 60 characters.");
      return;
    }
    await withPending(async () => {
      let avatarPath = profile.avatar_path;
      if (avatarFile) {
        const extension = avatarFile.type.split("/")[1];
        if (!["jpeg", "png", "webp"].includes(extension) || avatarFile.size > 5 * 1024 * 1024) {
          throw new Error("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
        }
        avatarPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await client.storage
          .from("avatars")
          .upload(avatarPath, avatarFile, { contentType: avatarFile.type, upsert: false });
        if (uploadError) throw uploadError;
      }
      const { data, error } = await client
        .from("profiles")
        .update({ display_name: nextName, avatar_path: avatarPath })
        .eq("id", user.id)
        .select("*")
        .single();
      if (error) throw error;
      const [updatedProfile] = await signedProfiles([data]);
      if (!updatedProfile) throw new Error("Your profile could not be refreshed.");
      setProfile(updatedProfile);
      setAvatarFile(null);
      await loadMembers();
      await loadFeed();
      setNotice("Your profile has been updated.");
    });
  }

  async function startConversation(member: CommunityProfile): Promise<void> {
    const client = supabase;
    if (!client) return;
    await withPending(async () => {
      const { data, error } = await client.rpc("start_conversation", {
        target_user: member.id,
      });
      if (error) throw error;
      setActiveConversation(data);
      setTab("messages");
      await loadConversations();
    });
  }

  async function requestFriend(memberId: string): Promise<void> {
    const client = supabase;
    if (!client) return;
    await withPending(async () => {
      const { error } = await client.rpc("request_friend", { target_user: memberId });
      if (error) throw error;
      await loadFriendships();
    });
  }

  async function respondToFriendRequest(requesterId: string, acceptRequest: boolean): Promise<void> {
    const client = supabase;
    if (!client) return;
    await withPending(async () => {
      const { error } = await client.rpc("respond_to_friend_request", {
        requester: requesterId,
        accept_request: acceptRequest,
      });
      if (error) throw error;
      await loadFriendships();
    });
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const content = messageText.trim();
    const client = supabase;
    if (!content || !activeConversation || !client) return;
    await withPending(async () => {
      const { error } = await client.from("messages").insert({
        conversation_id: activeConversation,
        sender_id: user.id,
        content,
      });
      if (error) throw error;
      setMessageText("");
      await Promise.all([loadMessages(activeConversation), loadConversations()]);
    });
  }

  if (!supabase) {
    return (
      <main className="page-transition grid min-h-dvh place-items-center bg-bg px-6 text-center">
        <div className="max-w-md rounded-3xl bg-surface p-8 shadow-[var(--shadow-border)]">
          <h1 className="font-display text-2xl">Community is unavailable</h1>
          <p className="mt-3 text-sm text-muted">Account services need to be configured first.</p>
          <Button className="mt-6" onClick={onShop}>
            <Store /> Back to shop
          </Button>
        </div>
      </main>
    );
  }

  const incomingRequests = friendships
    .filter((friendship) => friendship.status === "pending" && friendship.requester_id !== user.id)
    .map((friendship) => ({
      friendship,
      member: members.find((item) => item.id === friendship.requester_id),
    }))
    .filter((item): item is { friendship: FriendshipRow; member: CommunityProfile } => Boolean(item.member));
  const friends = members.filter((member) =>
    friendships.some(
      (friendship) =>
        friendship.status === "accepted" &&
        (friendship.user_low === member.id || friendship.user_high === member.id),
    ),
  );
  const suggestions = members
    .filter((member) => {
      if (member.id === user.id) return false;
      const relationship = friendships.find(
        (friendship) =>
          friendship.user_low === member.id || friendship.user_high === member.id,
      );
      return (
        !relationship ||
        relationship.status === "declined" ||
        (relationship.status === "pending" && relationship.requester_id === user.id)
      );
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const visibleConversations = conversations.filter((conversation) =>
    `${conversation.other.display_name} ${conversation.latestMessage}`
      .toLowerCase()
      .includes(conversationSearch.trim().toLowerCase()),
  );
  const activeChat = conversations.find((item) => item.id === activeConversation);

  return (
    <main className="page-transition min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <MessagesSquare className="size-5" />
            </span>
            <div>
              <p className="font-display text-base font-semibold">Pasal community</p>
              <p className="text-xs text-muted">A place for our members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onShop}>
              <Store /> <span className="hidden sm:inline">Shop</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onSignOut} aria-label="Sign out">
              <LogOut /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-10">
        <nav
          className="flex gap-2 overflow-x-auto rounded-2xl bg-surface p-2 shadow-[var(--shadow-border)] lg:flex-col lg:self-start"
          aria-label="Community"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-180 ${
                tab === id ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface-muted hover:text-fg"
              }`}
            >
              <Icon className="size-4" />
              {label}
              {id === "messages" && conversations.length > 0 && (
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {conversations.length}
                </span>
              )}
            </button>
          ))}
          <div className="hidden border-t border-border pt-4 lg:block">
            <div className="flex items-center gap-3 px-2">
              <Avatar profile={profile ?? undefined} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{profile?.display_name ?? "Your profile"}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
          </div>
        </nav>

        <section className="min-w-0">
          {notice && (
            <p className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary" role="alert">
              {notice}
            </p>
          )}
          {loading ? (
            <div className="rounded-3xl bg-surface p-8 text-sm text-muted shadow-[var(--shadow-border)]">
              Loading your community…
            </div>
          ) : !profile ? (
            <div className="rounded-3xl bg-surface p-8 shadow-[var(--shadow-border)]">
              <h1 className="font-display text-2xl">Community setup required</h1>
              <p className="mt-2 text-sm text-muted">
                Apply the community migration in Supabase, then reload this page.
              </p>
              <Button className="mt-5" variant="outline" onClick={() => void refreshCommunity()}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              {tab === "feed" && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-medium text-primary">Your people, your pasal</p>
                    <h1 className="mt-1 font-display text-3xl font-semibold">Community feed</h1>
                  </div>
                  <form
                    onSubmit={publishPost}
                    className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar profile={profile} />
                      <div className="min-w-0 flex-1">
                        <Label htmlFor="post-content">Share something with the community</Label>
                        <textarea
                          id="post-content"
                          value={postText}
                          onChange={(event) => setPostText(event.target.value)}
                          maxLength={2000}
                          rows={3}
                          placeholder="What’s on your mind?"
                          className="mt-2 w-full resize-y rounded-2xl bg-bg p-4 text-sm outline-none ring-1 ring-border placeholder:text-subtle focus:ring-2 focus:ring-ring"
                          required
                        />
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-subtle">{postText.length}/2000</span>
                          <Button type="submit" size="sm" disabled={pending || !postText.trim()}>
                            <Send /> Share post
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>

                  {feed.length === 0 ? (
                    <div className="rounded-3xl bg-surface p-8 text-center shadow-[var(--shadow-border)]">
                      <MessagesSquare className="mx-auto size-8 text-muted" />
                      <p className="mt-3 font-medium">Be the first to post</p>
                      <p className="mt-1 text-sm text-muted">Share a thought with the pasal community.</p>
                    </div>
                  ) : (
                    feed.map((item) => (
                      <article key={item.post.id} className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
                        <div className="flex items-center gap-3">
                          <Avatar profile={item.author} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{item.author.display_name}</p>
                            <time className="text-xs text-muted" dateTime={item.post.created_at}>
                              {formatTime(item.post.created_at)}
                            </time>
                          </div>
                        </div>
                        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{item.post.content}</p>
                        <div className="mt-4 flex items-center gap-4 border-t border-border pt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            aria-pressed={item.liked}
                            onClick={() => void toggleLike(item)}
                          >
                            <Heart className={item.liked ? "fill-primary text-primary" : ""} />
                            {item.likeCount} {item.likeCount === 1 ? "like" : "likes"}
                          </Button>
                          <span className="flex items-center gap-2 text-xs text-muted">
                            <MessageCircle className="size-4" />
                            {item.comments.length} {item.comments.length === 1 ? "comment" : "comments"}
                          </span>
                        </div>
                        {item.comments.length > 0 && (
                          <div className="mt-2 space-y-3 border-t border-border pt-4">
                            {item.comments.map(({ comment, author }) => (
                              <div key={comment.id} className="flex gap-2.5">
                                <Avatar profile={author} size="sm" />
                                <div className="min-w-0 flex-1 rounded-2xl bg-bg px-3 py-2">
                                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                    <span className="text-xs font-semibold">{author.display_name}</span>
                                    <time className="text-[0.6875rem] text-subtle" dateTime={comment.created_at}>
                                      {formatTime(comment.created_at)}
                                    </time>
                                  </div>
                                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <form
                          onSubmit={(event) => void publishComment(event, item.post.id)}
                          className="mt-4 flex items-center gap-2"
                        >
                          <Input
                            value={commentText[item.post.id] ?? ""}
                            onChange={(event) =>
                              setCommentText((current) => ({ ...current, [item.post.id]: event.target.value }))
                            }
                            placeholder="Write a comment…"
                            maxLength={1000}
                            aria-label="Write a comment"
                            required
                          />
                          <Button
                            type="submit"
                            size="icon"
                            aria-label="Post comment"
                            disabled={pending || !commentText[item.post.id]?.trim()}
                          >
                            <Send />
                          </Button>
                        </form>
                      </article>
                    ))
                  )}
                  <Button variant="outline" className="w-full" onClick={() => void loadFeed()} disabled={pending}>
                    Refresh feed
                  </Button>
                </div>
              )}

              {tab === "members" && (
                <div className="space-y-8">
                  <p className="text-sm font-medium text-primary">Get to know everyone</p>
                  <h1 className="mt-1 font-display text-3xl font-semibold">Friends & suggestions</h1>

                  {incomingRequests.length > 0 && (
                    <section>
                      <h2 className="font-display text-xl font-semibold">Friend requests</h2>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {incomingRequests.map(({ friendship, member }) => (
                          <article key={`${friendship.user_low}-${friendship.user_high}`} className="flex min-w-0 items-center gap-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
                            <Avatar profile={member} />
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{member.display_name}</p>
                            <Button size="sm" onClick={() => void respondToFriendRequest(member.id, true)} disabled={pending}>
                              <Check /> Accept
                            </Button>
                            <Button size="icon" variant="ghost" aria-label={`Decline ${member.display_name}'s request`} onClick={() => void respondToFriendRequest(member.id, false)} disabled={pending}>
                              <X />
                            </Button>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  <section>
                    <h2 className="font-display text-xl font-semibold">Suggested members</h2>
                    <p className="mt-1 text-sm text-muted">Meet others in the pasal community and grow your circle.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {suggestions.map((member) => {
                        const requestSent = friendships.some(
                          (friendship) =>
                            friendship.status === "pending" &&
                            friendship.requester_id === user.id &&
                            (friendship.user_low === member.id || friendship.user_high === member.id),
                        );
                        return (
                      <article key={member.id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
                        <Avatar profile={member} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{member.display_name}</p>
                          <p className="text-xs text-muted">Pasal community member</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => void requestFriend(member.id)} disabled={pending || requestSent}>
                          <UserPlus /> {requestSent ? "Request sent" : "Add friend"}
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Message ${member.display_name}`} onClick={() => void startConversation(member)} disabled={pending}>
                          <MessageCircle />
                        </Button>
                          </article>
                        );
                      })}
                      {suggestions.length === 0 && (
                        <p className="rounded-2xl bg-surface p-5 text-sm text-muted">You’re all caught up—there are no new suggestions right now.</p>
                      )}
                    </div>
                  </section>

                  <section>
                    <h2 className="font-display text-xl font-semibold">Your friends</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {friends.map((member) => (
                        <article key={member.id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
                          <Avatar profile={member} />
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{member.display_name}</p>
                          <Button size="sm" variant="outline" onClick={() => void startConversation(member)} disabled={pending}>
                            <MessageCircle /> Message
                          </Button>
                        </article>
                      ))}
                      {friends.length === 0 && (
                        <p className="rounded-2xl bg-surface p-5 text-sm text-muted">Friends you add will appear here.</p>
                      )}
                    </div>
                  </section>
                </div>
              )}

              {tab === "profile" && (
                <div className="max-w-2xl">
                  <p className="text-sm font-medium text-primary">Make yourself at home</p>
                  <h1 className="mt-1 font-display text-3xl font-semibold">My profile</h1>
                  <form onSubmit={saveProfile} className="mt-5 space-y-6 rounded-3xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-8">
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                      {previewAvatar ? (
                        <img src={previewAvatar} alt="Selected profile preview" className="size-20 rounded-full object-cover" />
                      ) : (
                        <Avatar profile={profile} size="lg" />
                      )}
                      <div>
                        <Label htmlFor="avatar-upload">Profile photo</Label>
                        <Input
                          id="avatar-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="mt-2 h-auto max-w-full py-2"
                          onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                        />
                        <p className="mt-1 text-xs text-muted">JPG, PNG, or WebP up to 5 MB. Only signed-in members can view it.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-name">Display name</Label>
                      <Input
                        id="profile-name"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        maxLength={60}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-email">Email address</Label>
                      <Input id="profile-email" value={user.email ?? ""} readOnly disabled />
                      <p className="text-xs text-muted">Your email is private and isn’t shown on your profile.</p>
                    </div>
                    <Button type="submit" disabled={pending}>
                      Save profile
                    </Button>
                  </form>
                </div>
              )}

              {tab === "messages" && (
                <div>
                  <p className="text-sm font-medium text-primary">A quieter place to catch up</p>
                  <h1 className="mt-1 font-display text-3xl font-semibold">Messages</h1>
                  <div className="mt-5 grid min-h-[min(68dvh,720px)] overflow-hidden rounded-[28px] border border-border/70 bg-surface shadow-[0_20px_60px_rgba(47,34,20,0.09)] md:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className={`min-h-[min(68dvh,720px)] flex-col border-border bg-surface/90 md:flex md:border-r ${activeConversation ? "hidden" : "flex"}`}>
                      <div className="border-b border-border/80 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h2 className="font-display text-xl font-semibold">Your inbox</h2>
                            <p className="mt-0.5 text-xs text-muted">
                              {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"}
                            </p>
                          </div>
                          <Button variant="outline" size="icon" aria-label="Find members" onClick={() => setTab("members")}>
                            <Users />
                          </Button>
                        </div>
                        <div className="relative mt-4">
                          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
                          <Input
                            value={conversationSearch}
                            onChange={(event) => setConversationSearch(event.target.value)}
                            placeholder="Search conversations"
                            aria-label="Search conversations"
                            className="h-10 rounded-xl border-transparent bg-bg pl-9 focus-visible:border-ring"
                          />
                        </div>
                      </div>
                      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                        {visibleConversations.map((conversation) => (
                          <button
                            key={conversation.id}
                            type="button"
                            onClick={() => setActiveConversation(conversation.id)}
                            aria-pressed={activeConversation === conversation.id}
                            className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${
                              activeConversation === conversation.id
                                ? "bg-accent text-accent-foreground shadow-sm"
                                : "hover:bg-surface-muted"
                            }`}
                          >
                            <Avatar profile={conversation.other} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold">{conversation.other.display_name}</span>
                                {conversation.latestAt && (
                                  <time
                                    className={`shrink-0 text-[0.6875rem] ${
                                      activeConversation === conversation.id ? "text-accent-foreground/70" : "text-subtle"
                                    }`}
                                    dateTime={conversation.latestAt}
                                  >
                                    {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
                                      new Date(conversation.latestAt),
                                    )}
                                  </time>
                                )}
                              </span>
                              <span
                                className={`mt-0.5 block truncate text-xs ${
                                  activeConversation === conversation.id ? "text-accent-foreground/75" : "text-muted"
                                }`}
                              >
                                {conversation.latestMessage}
                              </span>
                            </span>
                          </button>
                        ))}
                        {visibleConversations.length === 0 && (
                          <div className="grid min-h-52 place-items-center px-5 text-center">
                            <div>
                              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-muted text-muted">
                                <MessageCircle className="size-5" />
                              </span>
                              <p className="mt-3 text-sm font-medium">
                                {conversations.length ? "No matching conversations" : "No conversations yet"}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-muted">
                                {conversations.length
                                  ? "Try another name or message."
                                  : "Find a member and say hello to start a chat."}
                              </p>
                              {!conversations.length && (
                                <Button variant="link" className="mt-2" onClick={() => setTab("members")}>
                                  Find a member
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </aside>
                    <section
                      className={`min-h-[min(68dvh,720px)] min-w-0 flex-col bg-[linear-gradient(150deg,rgba(236,228,214,0.45),transparent_38%)] ${
                        activeConversation ? "flex" : "hidden md:flex"
                      }`}
                      aria-label={activeChat ? `Chat with ${activeChat.other.display_name}` : "Conversation"}
                    >
                      {activeChat ? (
                        <>
                          <header className="flex items-center gap-3 border-b border-border/70 bg-surface/75 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
                            <Button
                              className="md:hidden"
                              size="icon"
                              variant="ghost"
                              aria-label="Back to conversations"
                              onClick={() => setActiveConversation(null)}
                            >
                              <ArrowLeft />
                            </Button>
                            <Avatar profile={activeChat.other} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{activeChat.other.display_name}</p>
                              <p className="text-xs text-muted">Private conversation</p>
                            </div>
                          </header>
                          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
                            {messages.map((message) => {
                              const isOwnMessage = message.sender_id === user.id;
                              return (
                                <div
                                  key={message.id}
                                  className={`flex items-end gap-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}
                                >
                                  {!isOwnMessage && <Avatar profile={activeChat.other} size="sm" />}
                                  <div
                                    className={`max-w-[min(84%,34rem)] rounded-3xl px-4 py-3 shadow-sm ${
                                      isOwnMessage
                                        ? "rounded-br-md bg-accent text-accent-foreground"
                                        : "rounded-bl-md border border-border/60 bg-surface text-fg"
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
                                    <time
                                      className={`mt-1.5 block text-right text-[0.6875rem] ${
                                        isOwnMessage ? "text-accent-foreground/65" : "text-subtle"
                                      }`}
                                      dateTime={message.created_at}
                                    >
                                      {formatTime(message.created_at)}
                                    </time>
                                  </div>
                                </div>
                              );
                            })}
                            {messages.length === 0 && (
                              <div className="grid min-h-64 place-items-center text-center">
                                <div className="max-w-xs">
                                  <Avatar profile={activeChat.other} size="lg" />
                                  <p className="mt-4 font-display text-xl font-semibold">Say hello to {activeChat.other.display_name.split(" ")[0]}</p>
                                  <p className="mt-1 text-sm leading-relaxed text-muted">A friendly message is a lovely way to start.</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <form onSubmit={sendMessage} className="border-t border-border/70 bg-surface/80 p-3 backdrop-blur sm:px-5 sm:py-4">
                            <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-bg p-1.5 pl-3 shadow-inner focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/15">
                              <textarea
                                value={messageText}
                                onChange={(event) => setMessageText(event.target.value)}
                                placeholder="Write a message…"
                                maxLength={4000}
                                aria-label="Write a message"
                                rows={1}
                                className="max-h-32 min-h-10 flex-1 resize-y bg-transparent py-2 text-sm outline-none placeholder:text-subtle"
                                required
                              />
                              <Button
                                type="submit"
                                size="icon"
                                aria-label="Send message"
                                className="mb-0.5 size-10 shrink-0 rounded-xl"
                                disabled={pending || !messageText.trim()}
                              >
                                <Send />
                              </Button>
                            </div>
                            <p className="mt-2 px-1 text-[0.6875rem] text-subtle">Keep it kind. Your message is shared only in this conversation.</p>
                          </form>
                        </>
                      ) : (
                        <div className="grid flex-1 place-items-center p-8 text-center">
                          <div className="max-w-sm">
                            <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-surface-muted text-primary shadow-inner">
                              <MessagesSquare className="size-7" />
                            </span>
                            <h2 className="mt-5 font-display text-2xl font-semibold">A little catch-up?</h2>
                            <p className="mt-2 text-sm leading-relaxed text-muted">
                              Pick a conversation to continue, or find a member to start a new one.
                            </p>
                            <Button className="mt-5" variant="outline" onClick={() => setTab("members")}>
                              <Users /> Find members
                            </Button>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
