import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, actorFromUser } from "@/lib/use-auth";
import { useAccessibility } from "@/lib/use-accessibility.tsx";
import {
  declareIntent,
  getCollaborationRooms,
  createCollaborationRoom,
  requestJoinRoom,
  checkIntentSimilarity,
} from "@/lib/social.functions";
import { ThreeDFooter } from "@/components/3d-footer";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppPage,
});

type IntentRow = {
  id: string;
  actor_id: string;
  actor_label: string;
  intent_text: string;
  intent_hash: string;
  status: string;
  created_at: string;
};

interface CollabRoom {
  id: string;
  name: string;
  topic: string;
  maxMembers: number;
  currentMembers: number;
  memberLabels: string[];
  joinMethod: string;
  createdAt: string;
}

function AppPage() {
  const navigate = useNavigate();
  const declare = useServerFn(declareIntent);
  const getRooms = useServerFn(getCollaborationRooms);
  const createRoom = useServerFn(createCollaborationRoom);
  const requestJoin = useServerFn(requestJoinRoom);
  const { user } = useAuth();
  const actor = actorFromUser(user);
  const { soundCues, customMatchSound } = useAccessibility();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [intents, setIntents] = useState<IntentRow[]>([]);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [collabRooms, setCollabRooms] = useState<CollabRoom[]>([]);
  const [intentHash, setIntentHash] = useState("");
  const [modalStep, setModalStep] = useState<"options" | "join" | "create">("options");
  const [maxMembers, setMaxMembers] = useState<2 | 4 | 6 | 8 | 10>(6);
  const [joinMethod, setJoinMethod] = useState<"admin_approval" | "member_voting">(
    "admin_approval",
  );
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [matchingOptions, setMatchingOptions] = useState<any[]>([]);
  const checkSimilarity = useServerFn(checkIntentSimilarity);

  const playMatchSound = useCallback(() => {
    if (soundCues) {
      const audio = customMatchSound ? new Audio(customMatchSound) : new Audio("/match-sound.mp3");
      audio.play().catch(console.error);
    }
  }, [soundCues, customMatchSound]);

  const loadFeed = useCallback(async () => {
    const { data } = await supabase
      .from("intents")
      .select("id, actor_id, actor_label, intent_text, intent_hash, status, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10);
    setIntents((data as IntentRow[]) ?? []);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    const channel = supabase
      .channel("app-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "intents" }, () => loadFeed())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadFeed]);

  async function onDeclare(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !actor.id) return;
    setBusy(true);
    try {
      // First check for similar intents
      const similarityRes = await checkSimilarity({ data: { text, actorId: actor.id } });

      if (similarityRes.hasMatches && similarityRes.matches.length > 0) {
        setMatchingOptions(similarityRes.matches);
        setShowMatchingModal(true);
        setBusy(false);
        return;
      }

      // No matches, proceed with normal intent declaration
      const res = await declare({ data: { actorId: actor.id, actorLabel: actor.label, text } });
      await loadFeed();
      if (res.decision === "HARD_BLOCK") {
        toast.error(`HARD_BLOCK · ${res.flags?.join(", ")} — spam never surfaces.`);
      } else if (res.decision === "REVIEW") {
        toast.warning("REVIEW — intent too short to match. Add more detail.");
      } else if (res.matched && "roomId" in res) {
        playMatchSound();
        toast.success(`Matched · ${res.topic} · similarity ${res.similarity}`);
        setText("");
        navigate({ to: "/rooms/$roomId", params: { roomId: res.roomId } });
        return;
      } else {
        // Check for existing collaboration rooms
        const encoder = new TextEncoder();
        const data = encoder.encode(text.toLowerCase());
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        setIntentHash(hash);

        const roomsRes = await getRooms({ data: { intentHash: hash } });
        if (roomsRes.rooms && roomsRes.rooms.length > 0) {
          setCollabRooms(roomsRes.rooms);
          setModalStep("options");
          setShowCollaborationModal(true);
        } else {
          setModalStep("create");
          setShowCollaborationModal(true);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
      console.error("Declare intent failed:", err);
      toast.error(message || "Could not declare intent.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateRoom() {
    const finalRoomName = text.trim().slice(0, 50) || "Collaboration Room";
    if (!actor.id) return;
    setBusy(true);
    try {
      const res = await createRoom({
        data: {
          actorId: actor.id,
          actorLabel: actor.label,
          text,
          roomName: finalRoomName,
          maxMembers,
          joinMethod,
        },
      });
      if (res.success) {
        toast.success(`Collaboration room created: ${res.topic}`);
        setShowCollaborationModal(false);
        setText("");
        navigate({ to: "/rooms/$roomId", params: { roomId: res.roomId } });
      } else {
        toast.error(res.reason || "Failed to create room");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
      toast.error(message || "Could not create room.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinRoom(roomId: string) {
    if (!actor.id) return;
    setBusy(true);
    try {
      const res = await requestJoin({
        data: {
          roomId,
          actorId: actor.id,
          actorLabel: actor.label,
        },
      });
      if (res.success) {
        toast.success("Join request sent. Waiting for approval.");
        setShowCollaborationModal(false);
        setText("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
      toast.error(message || "Could not request to join.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMatchWithExisting(matchId: string) {
    if (!actor.id) return;
    setBusy(true);
    setShowMatchingModal(false);
    try {
      // Force match with selected intent by calling declareIntent with a modified approach
      // We'll need to modify the backend to support forced matching, but for now let's proceed with normal declaration
      const res = await declare({ data: { actorId: actor.id, actorLabel: actor.label, text } });
      await loadFeed();
      if (res.matched && "roomId" in res) {
        playMatchSound();
        toast.success(`Matched · ${res.topic} · similarity ${res.similarity}`);
        setText("");
        navigate({ to: "/rooms/$roomId", params: { roomId: res.roomId } });
      } else {
        toast.success("Intent declared. Waiting for match.");
        setText("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
      toast.error(message || "Could not declare intent.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateOwnIntent() {
    setShowMatchingModal(false);
    setBusy(true);
    try {
      const res = await declare({ data: { actorId: actor.id, actorLabel: actor.label, text } });
      await loadFeed();
      toast.success("Intent declared. Waiting for match.");
      setText("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
      toast.error(message || "Could not declare intent.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSurpriseMe() {
    if (matchingOptions.length === 0) return;
    const randomMatch = matchingOptions[Math.floor(Math.random() * matchingOptions.length)];
    await handleMatchWithExisting(randomMatch.id);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
      <div className="animate-fade-in">
        <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
          What do you want to do today?
        </h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          Meet people based on what you're trying to do right now—not what an algorithm thinks you
          want.
        </p>
      </div>

      <form
        onSubmit={onDeclare}
        className="animate-fade-in mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm"
        style={{ animationDelay: "60ms" }}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {["Build a startup", "Learn Python", "Gaming", "Fitness", "Networking", "Travel"].map(
            (chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setText(text ? `${text} ${chip}` : chip)}
                className="rounded-full border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:bg-accent"
              >
                {chip}
              </button>
            ),
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "learn tabla with someone this month"'
            maxLength={280}
            className="w-full flex-1 rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60"
          >
            {busy ? "Matching…" : "Declare"}
          </button>
        </div>
      </form>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Live intents</h2>
          <span className="font-mono-label text-sm text-muted-foreground">
            {intents.length} active
          </span>
        </div>
        <ul className="mt-4 space-y-2">
          {intents.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
              <p className="mb-4 text-sm">No live intents yet. Try one of these:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Find a cofounder",
                  "Practice Spanish",
                  "Play football this evening",
                  "Learn AI",
                  "Hiking tomorrow",
                  "Find investors",
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setText(example)}
                    className="rounded-full border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:bg-accent"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </li>
          )}
          {intents.map((i, idx) => (
            <li
              key={i.id}
              className={`animate-fade-in flex items-start gap-4 rounded-xl border bg-card px-4 py-3.5 transition-colors ${
                i.actor_id === actor.id ? "border-primary" : "border-border"
              }`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <span className="font-mono-label text-sm text-muted-foreground">{i.actor_label}</span>
              <span className="flex-1 text-[15px] text-foreground">{i.intent_text}</span>
            </li>
          ))}
        </ul>
        <Link
          to="/rooms"
          className="mt-6 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          View your rooms →
        </Link>
      </section>

      {/* Collaboration Modal */}
      {showCollaborationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            {modalStep === "options" && (
              <>
                <h2 className="text-xl font-bold text-foreground">Collaboration</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Existing collaborations were found for your matching intent. How would you like to
                  proceed?
                </p>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => setModalStep("join")}
                    className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-98 cursor-pointer"
                  >
                    Join Existing Collaboration
                  </button>
                  <button
                    onClick={() => setModalStep("create")}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-accent active:scale-98 cursor-pointer"
                  >
                    Create New Collaboration
                  </button>
                  <button
                    onClick={() => {
                      setShowCollaborationModal(false);
                      setText("");
                    }}
                    className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {modalStep === "join" && (
              <>
                <h2 className="text-xl font-bold text-foreground">Available Collaborations</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Select an active collaboration room matching your intent.
                </p>
                <div className="mt-4 max-h-60 overflow-y-auto space-y-3">
                  {collabRooms.map((room) => (
                    <div
                      key={room.id}
                      className="rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{room.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Members: {room.currentMembers}/{room.maxMembers}
                          </p>
                        </div>
                        <button
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={busy}
                          className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setModalStep("options")}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setShowCollaborationModal(false);
                      setText("");
                    }}
                    className="flex-1 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {modalStep === "create" && (
              <>
                <h2 className="text-xl font-bold text-foreground">Create Collaboration</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start a new collaboration room based on your intent.
                </p>
                <div className="mt-5 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                      Maximum Members
                    </label>
                    <div className="flex gap-2 mt-2">
                      {[2, 4, 6, 8, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setMaxMembers(num as 2 | 4 | 6 | 8 | 10)}
                          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold border transition-all cursor-pointer ${
                            maxMembers === num
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:bg-accent"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                      Join Method
                    </label>
                    <div className="flex gap-2 mt-2">
                      {[
                        { id: "admin_approval", label: "Admin Approval" },
                        { id: "member_voting", label: "Member Voting" },
                      ].map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() =>
                            setJoinMethod(method.id as "admin_approval" | "member_voting")
                          }
                          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold border transition-all cursor-pointer ${
                            joinMethod === method.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:bg-accent"
                          }`}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  <button
                    onClick={handleCreateRoom}
                    disabled={busy}
                    className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 cursor-pointer"
                  >
                    {busy ? "Creating..." : "Create Room"}
                  </button>
                  <button
                    onClick={() => {
                      if (collabRooms.length > 0) {
                        setModalStep("options");
                      } else {
                        setShowCollaborationModal(false);
                        setText("");
                      }
                    }}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent cursor-pointer"
                  >
                    {collabRooms.length > 0 ? "Back" : "Cancel"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Matching Options Modal */}
      {showMatchingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-xl font-bold text-foreground">Similar Intents Found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We found {matchingOptions.length} similar intent(s). How would you like to proceed?
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => {
                  setShowMatchingModal(false);
                  setModalStep("join");
                  setShowCollaborationModal(true);
                }}
                className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-98 cursor-pointer"
              >
                Match with existing pool
              </button>
              <button
                onClick={handleCreateOwnIntent}
                disabled={busy}
                className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-accent active:scale-98 cursor-pointer disabled:opacity-60"
              >
                Create my own new intent
              </button>
              <button
                onClick={handleSurpriseMe}
                disabled={busy}
                className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-accent active:scale-98 cursor-pointer disabled:opacity-60"
              >
                Surprise me
              </button>
              <button
                onClick={() => {
                  setShowMatchingModal(false);
                  setText("");
                }}
                className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {matchingOptions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-foreground">Top Matches:</h3>
                <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
                  {matchingOptions.slice(0, 3).map((match) => (
                    <div
                      key={match.id}
                      className="rounded-lg border border-border bg-background p-3"
                    >
                      <p className="text-xs text-muted-foreground truncate">{match.intent_text}</p>
                      <p className="text-xs font-semibold text-primary mt-1">
                        {(match.score * 100).toFixed(0)}% match
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3D Animated Footer */}
      <ThreeDFooter />
    </div>
  );
}
