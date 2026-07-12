import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Peer-to-peer WebRTC calling for an intent room.
// Signaling rides on a Supabase Realtime broadcast channel (call-<roomId>),
// so it works against a Supabase project with no extra backend, no schema changes,
// and no third-party SDK.

export type CallStatus = "idle" | "calling" | "connecting" | "connected";

type SignalPayload = {
  from: string;
  to?: string;
  kind: "hello" | "offer" | "answer" | "ice" | "bye";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  video?: boolean;
};

// Base STUN servers (always available, free).
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// Optional TURN server for restrictive networks / strict NAT.
// Set VITE_TURN_URL (and optionally credentials) in your .env — baked in at build time.
// e.g. VITE_TURN_URL=turn:turn.example.com:3478
function buildIceServers(): RTCIceServer[] {
  const servers = [...ICE_SERVERS];
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  if (turnUrl) {
    // Support comma-separated URLs (e.g. "turn:host:3478,turns:host:5349").
    const urls = turnUrl.split(",").map((u) => u.trim()).filter(Boolean);
    servers.push({
      urls,
      username: (import.meta.env.VITE_TURN_USERNAME as string | undefined) || undefined,
      credential: (import.meta.env.VITE_TURN_CREDENTIAL as string | undefined) || undefined,
    });
  }
  return servers;
}

export function useWebRTCCall(roomId: string, selfId: string) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const wantVideoRef = useRef(false);
  const politeRef = useRef(false);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Play/stop the ringing tone based on call status.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ringing = status === "calling" || status === "connecting";
    if (ringing) {
      if (!ringtoneRef.current) {
        const audio = new Audio("/ringtone.mp3");
        audio.loop = true;
        audio.volume = 0.6;
        ringtoneRef.current = audio;
      }
      ringtoneRef.current.play().catch(() => {
        /* autoplay may be blocked until a user gesture; ignore */
      });
    } else if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, [status]);

  // Stop the ringtone entirely on unmount.
  useEffect(() => {
    return () => {
      ringtoneRef.current?.pause();
      ringtoneRef.current = null;
    };
  }, []);

  const send = useCallback((payload: Omit<SignalPayload, "from">) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload: { ...payload, from: selfId } as SignalPayload,
    });
  }, [selfId]);

  const attachRemote = useCallback(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, []);

  const cleanup = useCallback((broadcastBye: boolean) => {
    if (broadcastBye) send({ kind: "bye" });
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setStatus("idle");
    setMuted(false);
    setCameraOn(false);
    setRemoteHasVideo(false);
  }, [send]);

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    remoteStreamRef.current = new MediaStream();

    pc.onicecandidate = (e) => {
      if (e.candidate) send({ kind: "ice", candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((track) => {
        remoteStreamRef.current?.addTrack(track);
        if (track.kind === "video") setRemoteHasVideo(true);
      });
      attachRemote();
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("connected");
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        cleanup(false);
      }
    };
    pcRef.current = pc;
    return pc;
  }, [send, attachRemote, cleanup]);

  const getLocalStream = useCallback(async (video: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    setCameraOn(video);
    return stream;
  }, []);

  // Caller initiates.
  const startCall = useCallback(async (video: boolean) => {
    if (status !== "idle") return;
    wantVideoRef.current = video;
    politeRef.current = false;
    setStatus("calling");
    try {
      const pc = createPeer();
      const stream = await getLocalStream(video);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ kind: "offer", sdp: offer, video });
      setStatus("connecting");
    } catch {
      cleanup(false);
    }
  }, [status, createPeer, getLocalStream, send, cleanup]);

  const handleSignal = useCallback(async (msg: SignalPayload) => {
    if (msg.from === selfId) return;
    if (msg.to && msg.to !== selfId) return;

    if (msg.kind === "bye") {
      cleanup(false);
      return;
    }

    if (msg.kind === "offer" && msg.sdp) {
      // Callee (polite) answers.
      politeRef.current = true;
      wantVideoRef.current = !!msg.video;
      setStatus("connecting");
      const pc = pcRef.current ?? createPeer();
      const stream = await getLocalStream(!!msg.video);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ kind: "answer", to: msg.from, sdp: answer });
      return;
    }

    if (msg.kind === "answer" && msg.sdp && pcRef.current) {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      return;
    }

    if (msg.kind === "ice" && msg.candidate && pcRef.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
      } catch {
        /* candidate may arrive before remote desc; ignore */
      }
    }
  }, [selfId, cleanup, createPeer, getLocalStream, send]);

  const endCall = useCallback(() => cleanup(true), [cleanup]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const existing = localStreamRef.current?.getVideoTracks()[0];
    if (existing) {
      existing.stop();
      localStreamRef.current?.removeTrack(existing);
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(null);
      setCameraOn(false);
      return;
    }
    const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const track = vStream.getVideoTracks()[0];
    localStreamRef.current?.addTrack(track);
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) await sender.replaceTrack(track);
    else pc.addTrack(track, localStreamRef.current!);
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setCameraOn(true);
    // renegotiate
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send({ kind: "offer", sdp: offer, video: true });
  }, [send]);

  useEffect(() => {
    if (!roomId || !selfId) return;
    const channel = supabase.channel(`call-${roomId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      handleSignal(payload as SignalPayload);
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      cleanup(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, selfId]);

  return {
    status,
    muted,
    cameraOn,
    remoteHasVideo,
    localVideoRef,
    remoteVideoRef,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
