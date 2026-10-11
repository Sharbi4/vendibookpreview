import { useCallback, useEffect, useRef, useState } from 'react';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { Camera, CameraOff, CircleDot, Loader2, Mic, MicOff, MonitorUp, PhoneOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { meetingProfile } from '@/lib/meetingTypes';
import { useWalkthroughRecord } from '@/hooks/useWalkthroughRecord';

/**
 * Vendibook's own call UI.
 *
 * Normal participants get camera, microphone, camera flip and leave — nothing
 * else. There is no chat, no screen share, and no recording control: recording
 * is started by Vendibook's server once everyone has consented and joined, and
 * the red indicator only appears after the server confirms it is running.
 */
type Props = {
  walkthroughId: string;
  title: string;
  meetingType?: string | null;
  onLeave: (result: { joined: boolean }) => void;
};

export default function VendibookVideoCall({ walkthroughId, title, meetingType, onLeave }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const call = useRef<DailyCall | null>(null);
  const [phase, setPhase] = useState<'preview' | 'joining' | 'joined' | 'error'>('preview');
  const [error, setError] = useState('');
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [camera, setCamera] = useState('');
  const [microphone, setMicrophone] = useState('');
  const [moderator, setModerator] = useState(false);
  const [sharing, setSharing] = useState(false);

  const profile = meetingProfile(meetingType);
  // Poll only while the call is open: the indicator must reflect the server.
  const { recording } = useWalkthroughRecord(walkthroughId, phase === 'joined' ? 10_000 : 0);
  const isRecording = recording?.status === 'recording';

  // The leave path must fire exactly once: the Leave button and Daily's
  // `left-meeting` event can both arrive for the same exit.
  const exited = useRef(false);
  const joinedOnce = useRef(false);
  const finish = useCallback(() => {
    if (exited.current) return;
    exited.current = true;
    const c = call.current;
    call.current = null;
    try { c?.destroy(); } catch { /* already torn down */ }
    onLeave({ joined: joinedOnce.current });
  }, [onLeave]);

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((stream) => { stream.getTracks().forEach((t) => t.stop()); return navigator.mediaDevices.enumerateDevices(); })
      .then(setDevices)
      .catch(() => setError('Camera or microphone permission is blocked. You can update browser permissions and try again.'));
    return () => { call.current?.destroy(); };
  }, []);

  const join = async () => {
    setPhase('joining');
    const { data, error: e } = await supabase.functions.invoke('video-walkthrough-access', { body: { walkthrough_id: walkthroughId } });
    if (e || !data?.token) {
      setError(data?.message || 'Native video is unavailable. Your scheduled walkthrough remains saved.');
      setPhase('error');
      return;
    }
    setModerator(Boolean(data.moderator));
    try {
      const c = DailyIframe.createCallObject({ videoSource: camera || true, audioSource: microphone || true });
      call.current = c;
      c.on('joined-meeting', () => { joinedOnce.current = true; setPhase('joined'); })
        .on('left-meeting', finish)
        .on('error', (ev) => { setError(ev?.errorMsg || 'The call was interrupted.'); setPhase('error'); });
      await c.join({ url: data.roomUrl, token: data.token });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join.');
      setPhase('error');
    }
  };

  useEffect(() => {
    if (phase !== 'joined' || !frame.current || !call.current) return;
    const paint = () => {
      const participants = call.current!.participants();
      frame.current!.innerHTML = '';
      Object.values(participants).forEach((p: any) => {
        const track = p.tracks?.video?.persistentTrack;
        if (!track) return;
        const v = document.createElement('video');
        v.autoplay = true; v.playsInline = true; v.muted = p.local;
        v.srcObject = new MediaStream([track]);
        v.className = p.local ? 'walkthrough-self-video' : 'walkthrough-remote-video';
        frame.current!.appendChild(v);
      });
    };
    call.current.on('participant-joined', paint).on('participant-updated', paint);
    paint();
    return () => { call.current?.off('participant-joined', paint).off('participant-updated', paint); };
  }, [phase]);

  const toggleMic = () => { const v = !mic; setMic(v); call.current?.setLocalAudio(v); };
  const toggleCam = () => { const v = !cam; setCam(v); call.current?.setLocalVideo(v); };
  const toggleShare = async () => {
    if (!moderator) return;
    const next = !sharing;
    setSharing(next);
    try { next ? await call.current?.startScreenShare() : await call.current?.stopScreenShare(); } catch { setSharing(!next); }
  };
  const flip = async () => {
    const cams = devices.filter((d) => d.kind === 'videoinput');
    if (cams.length < 2) return;
    const current = (call.current as any)?.getInputDevices?.().camera?.deviceId;
    const i = cams.findIndex((d) => d.deviceId === current);
    await call.current?.setInputDevicesAsync({ videoDeviceId: cams[(i + 1) % cams.length].deviceId });
  };

  if (phase === 'error') {
    return (
      <div className="walkthrough-call walkthrough-call-error">
        <h1>We couldn’t open the call</h1>
        <p>{error}</p>
        <div className="walkthrough-call-actions">
          <Button variant="outline" onClick={() => { setError(''); setPhase('preview'); }}><RefreshCw /> Try again</Button>
          <Button onClick={finish}>Back to details</Button>
        </div>
      </div>
    );
  }

  if (phase !== 'joined') {
    return (
      <div className="walkthrough-call walkthrough-call-preview">
        <header>
          <span className="walkthrough-call-kicker">{profile.label}</span>
          <h1>{title}</h1>
          <p className="walkthrough-call-recnote"><CircleDot /> This meeting is recorded. Recording starts once everyone has joined.</p>
        </header>
        <div className="walkthrough-call-devices">
          <label>
            <span>Camera</span>
            <select value={camera} onChange={(e) => setCamera(e.target.value)}>
              <option value="">Default camera</option>
              {devices.filter((d) => d.kind === 'videoinput').map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Microphone</span>
            <select value={microphone} onChange={(e) => setMicrophone(e.target.value)}>
              <option value="">Default microphone</option>
              {devices.filter((d) => d.kind === 'audioinput').map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
              ))}
            </select>
          </label>
        </div>
        <ul className="walkthrough-call-checklist">
          {profile.checklist.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="walkthrough-call-actions">
          <Button variant="outline" onClick={finish}>Back</Button>
          <Button onClick={join} disabled={phase === 'joining'}>
            {phase === 'joining' ? <Loader2 className="animate-spin" /> : <Camera />} Join now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="walkthrough-call walkthrough-call-live">
      <div className="walkthrough-call-bar">
        <span className="walkthrough-call-title">{title}</span>
        {isRecording && <span className="walkthrough-call-rec"><CircleDot /> Recording</span>}
      </div>
      <div className="walkthrough-call-stage" ref={frame} />
      <aside className="walkthrough-call-side">
        <h2>What to cover</h2>
        <ul>{profile.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
      </aside>
      <div className="walkthrough-call-controls">
        <button type="button" onClick={toggleMic} aria-label={mic ? 'Mute microphone' : 'Unmute microphone'}>{mic ? <Mic /> : <MicOff />}</button>
        <button type="button" onClick={toggleCam} aria-label={cam ? 'Turn camera off' : 'Turn camera on'}>{cam ? <Camera /> : <CameraOff />}</button>
        <button type="button" onClick={flip} aria-label="Switch camera"><RefreshCw /></button>
        {moderator && (
          <button type="button" onClick={toggleShare} aria-label={sharing ? 'Stop sharing screen' : 'Share screen'}><MonitorUp /></button>
        )}
        <button type="button" className="is-leave" onClick={finish} aria-label="Leave the call"><PhoneOff /></button>
      </div>
    </div>
  );
}
