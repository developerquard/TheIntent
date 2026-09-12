import { Download, Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { useWebRTCCall } from "@/lib/use-webrtc-call";

export function CallPanel({
  roomId,
  selfId,
  canCall,
}: {
  roomId: string;
  selfId: string;
  canCall: boolean;
}) {
  const call = useWebRTCCall(roomId, selfId);
  const active = call.status !== "idle";

  return (
    <div className="animate-fade-in mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">Live call</p>
          <p className="font-mono-label text-xs text-muted-foreground">
            {call.status === "idle" && "Peer-to-peer · encrypted · no recording"}
            {call.status === "calling" && "Ringing the room…"}
            {call.status === "connecting" && "Connecting…"}
            {call.status === "connected" && "Connected"}
          </p>
        </div>

        {!active ? (
          <div className="flex gap-2">
            <button
              disabled={!canCall}
              onClick={() => call.startCall(false)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
            >
              <Phone className="h-4 w-4" /> Voice
            </button>
            <button
              disabled={!canCall}
              onClick={() => call.startCall(true)}
              className="flex items-center gap-2 rounded-xl border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
            >
              <Video className="h-4 w-4" /> Video
            </button>
            <a
              href="/ringtone.mp3"
              download="the-intent-ringtone.mp3"
              title="Download ringtone"
              className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={call.toggleMute}
              className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {call.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              onClick={call.toggleCamera}
              className="flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {call.cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
            <button
              onClick={call.endCall}
              className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-all hover:bg-destructive/90 active:scale-95"
            >
              <PhoneOff className="h-4 w-4" /> End
            </button>
          </div>
        )}
      </div>

      {active && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="relative overflow-hidden rounded-xl border border-border bg-black/80 aspect-video">
            <video
              ref={call.remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
            {!call.remoteHasVideo && (
              <div className="absolute inset-0 flex items-center justify-center font-mono-label text-xs text-white/70">
                voice only · remote
              </div>
            )}
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border bg-black/80 aspect-video">
            <video
              ref={call.localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {!call.cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center font-mono-label text-xs text-white/70">
                camera off · you
              </div>
            )}
          </div>
        </div>
      )}

      {!canCall && (
        <p className="mt-2 text-xs text-muted-foreground">Join this room to start a call.</p>
      )}
    </div>
  );
}
