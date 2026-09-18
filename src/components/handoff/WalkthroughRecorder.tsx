import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CircleStop, RefreshCw, Video, Loader2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { handoffOps } from '@/hooks/useHandoff';

const MAX_SECONDS = 300;

const PROMPTS = [
  'Exterior — walk all four sides',
  'VIN / serial / identifying plate, if the asset has one',
  'Interior and workspace',
  'Major equipment — power it on if you can',
  'Any visible damage or wear',
  'Final state as it is handed over',
];

interface Props {
  handoffId: string;
  disabled?: boolean;
  onUploaded: () => void;
}

export default function WalkthroughRecorder({ handoffId, disabled, onUploaded }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) {
          recorderRef.current?.state === 'recording' && recorderRef.current.stop();
          return MAX_SECONDS;
        }
        return s + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const openCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      setPermissionError(null);
      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch (err) {
        setPermissionError(
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow camera and microphone access in your browser to record the walkthrough.'
            : 'We could not open your camera on this device. You can still add photos below.',
        );
      }
    },
    [stopStream],
  );

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mimeCandidates = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    recorder.onstop = () => {
      setBlob(new Blob(chunksRef.current, { type: mimeType ?? 'video/webm' }));
      setRecording(false);
    };
    recorderRef.current = recorder;
    setSeconds(0);
    setBlob(null);
    recorder.start(1000);
    setRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const upload = async (file: Blob, mediaType: 'video' | 'photo', duration?: number) => {
    setUploading(true);
    try {
      const ext = mediaType === 'photo' ? 'jpg' : file.type.includes('mp4') ? 'mp4' : 'webm';
      const path = `${handoffId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('handoff-evidence').upload(path, file, {
        contentType: file.type || (mediaType === 'photo' ? 'image/jpeg' : 'video/webm'),
        upsert: false,
      });
      if (error) throw error;
      await handoffOps({
        action: 'register_media',
        handoff_session_id: handoffId,
        storage_path: path,
        media_type: mediaType,
        byte_size: file.size,
        duration_seconds: duration ?? null,
      });
      toast.success(mediaType === 'photo' ? 'Photo added to the evidence record.' : 'Walkthrough saved to the evidence record.');
      setBlob(null);
      setSeconds(0);
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="space-y-4">
      <ul className="grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
        {PROMPTS.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-foreground/40" />
            {p}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Don't hold personal documents up to the camera. Record the asset, not your paperwork.
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-foreground/5">
        <video
          ref={videoRef}
          playsInline
          muted
          className="aspect-video w-full bg-black object-cover"
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
          {!ready ? (
            <Button size="sm" onClick={() => openCamera(facing)} disabled={disabled}>
              <Camera className="mr-2 h-4 w-4" /> Open camera
            </Button>
          ) : recording ? (
            <Button size="sm" variant="destructive" onClick={stopRecording}>
              <CircleStop className="mr-2 h-4 w-4" /> Stop · {mm}:{ss}
            </Button>
          ) : (
            <Button size="sm" onClick={startRecording} disabled={disabled}>
              <Video className="mr-2 h-4 w-4" /> {blob ? 'Record again' : 'Start recording'}
            </Button>
          )}
          {ready && !recording && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const next = facing === 'environment' ? 'user' : 'environment';
                setFacing(next);
                openCamera(next);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Flip camera
            </Button>
          )}
          {ready && (
            <span className="text-xs text-muted-foreground">Up to 5 minutes · keep this screen open</span>
          )}
        </div>
      </div>

      {permissionError && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          {permissionError}
        </p>
      )}

      {blob && !recording && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
          <span className="text-sm">Recording ready · {mm}:{ss}</span>
          <Button size="sm" disabled={uploading} onClick={() => upload(blob, 'video', seconds)}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save to evidence
          </Button>
          <Button size="sm" variant="ghost" disabled={uploading} onClick={() => { setBlob(null); setSeconds(0); }}>
            Discard
          </Button>
        </div>
      )}

      <div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <ImagePlus className="h-4 w-4" />
          Add photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={disabled || uploading}
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              for (const f of files) await upload(f, 'photo');
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
}
