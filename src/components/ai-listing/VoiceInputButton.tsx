import React from 'react';
import { VoiceMicButton } from '@/components/voice/VoiceMicButton';
import { useVoiceDictation } from '@/hooks/useVoiceDictation';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({ onTranscript, disabled }) => {
  const voice = useVoiceDictation({ onFinal: onTranscript });
  return (
    <VoiceMicButton
      isRecording={voice.isRecording}
      isBusy={voice.isConnecting}
      onClick={voice.toggle}
      disabled={disabled}
      className="mb-0.5"
    />
  );
};

export default VoiceInputButton;
