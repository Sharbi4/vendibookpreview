import { useState, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Phone, PhoneOff, Loader2, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const AGENT_ID = 'your-agent-id'; // User will configure this

const VoiceAgentButton = () => {
  const { session } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to VendiBook voice agent');
      setShowPanel(true);
    },
    onDisconnect: () => {
      console.log('Disconnected from voice agent');
      // Save the conversation data
      if (transcript.length > 0) {
        saveConversationData();
      }
    },
    onMessage: (message: any) => {
      if (message.type === 'user_transcript') {
        const text = message.user_transcription_event?.user_transcript;
        if (text) setTranscript(prev => [...prev, `User: ${text}`]);
      } else if (message.type === 'agent_response') {
        const text = message.agent_response_event?.agent_response;
        if (text) setTranscript(prev => [...prev, `Agent: ${text}`]);
      }
    },
    onError: (error: any) => {
      console.error('Voice agent error:', error);
      toast.error('Voice agent connection failed. Please try again.');
    },
  });

  const saveConversationData = useCallback(async () => {
    try {
      const fullTranscript = transcript.join('\n');
      
      // Use AI to extract intent from the transcript
      const { data: aiData } = await supabase.functions.invoke('extract-voice-intent', {
        body: { transcript: fullTranscript },
      });

      await supabase.functions.invoke('save-voice-lead', {
        body: {
          summary: aiData?.summary || 'Voice conversation with VendiBot',
          intent_type: aiData?.intent_type || 'other',
          category: aiData?.category || null,
          location: aiData?.location || null,
          dates: aiData?.dates || null,
          budget: aiData?.budget || null,
          listing_mode: aiData?.listing_mode || null,
          raw_transcript: fullTranscript,
          session_id: conversation.getId?.() || null,
          metadata: { source: 'voice_agent' },
        },
      });
    } catch (err) {
      console.error('Failed to save voice lead:', err);
    }
  }, [transcript, conversation, session]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    setTranscript([]);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke(
        'elevenlabs-conversation-token',
        { body: { agent_id: AGENT_ID } }
      );

      if (error || !data?.signed_url) {
        throw new Error('Failed to get conversation token');
      }

      await conversation.startSession({
        signedUrl: data.signed_url,
      });
    } catch (error) {
      console.error('Failed to start voice agent:', error);
      toast.error('Could not start voice agent. Please check your microphone permissions.');
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setShowPanel(false);
  }, [conversation]);

  const isActive = conversation.status === 'connected';

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={isActive ? stopConversation : startConversation}
        disabled={isConnecting}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3 shadow-2xl text-sm font-semibold transition-all duration-300 ${
          isActive
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        {isConnecting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isActive ? (
          <PhoneOff className="w-5 h-5" />
        ) : (
          <Phone className="w-5 h-5" />
        )}
        {isConnecting ? 'Connecting...' : isActive ? 'End Call' : 'Talk to VendiBot'}
      </motion.button>

      {/* Active call panel */}
      <AnimatePresence>
        {showPanel && isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary/10 px-4 py-3 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${conversation.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-primary'}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">VendiBot</p>
                <p className="text-xs text-muted-foreground">
                  {conversation.isSpeaking ? 'Speaking...' : 'Listening...'}
                </p>
              </div>
              {conversation.isSpeaking && (
                <Volume2 className="w-4 h-4 text-primary ml-auto animate-pulse" />
              )}
            </div>

            {/* Transcript */}
            <div className="px-4 py-3 max-h-48 overflow-y-auto space-y-2">
              {transcript.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Ask me anything about renting or buying food trucks, trailers, or kitchen spaces!
                </p>
              ) : (
                transcript.slice(-6).map((line, i) => (
                  <p
                    key={i}
                    className={`text-xs ${
                      line.startsWith('User:')
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {line}
                  </p>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border bg-muted/30">
              <p className="text-[10px] text-muted-foreground text-center">
                Your conversation helps us improve your experience
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAgentButton;
