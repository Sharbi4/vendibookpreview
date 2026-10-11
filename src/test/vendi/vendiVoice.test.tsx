import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
const sdk = vi.hoisted(() => ({ options: {} as any, volume: vi.fn(), end: vi.fn(), start: vi.fn() }));
vi.mock('@elevenlabs/react', () => ({ useConversation: (options: any) => {
  sdk.options = options;
  return { status: 'connected', isSpeaking: false, setVolume: sdk.volume, endSession: sdk.end,
    startSession: sdk.start, sendContextualUpdate: vi.fn() };
} }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn(), Link: ({ children }: any) => <span>{children}</span> }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import VendiVoiceAgent from '@/components/vendi-listing/VendiVoiceAgent';

describe('Vendi voice controls', () => {
  beforeEach(() => vi.clearAllMocks());
  it('mutes microphone input without silencing the speaker', () => {
    render(<VendiVoiceAgent context="Draft" onAnswer={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mute microphone' }));
    expect(sdk.options.micMuted).toBe(true);
    expect(sdk.volume).not.toHaveBeenCalled();
    expect(screen.getByText('Microphone muted')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unmute microphone' }));
    expect(sdk.options.micMuted).toBe(false);
  });
  it('retains agent messages without applying the same user transcript twice', () => {
    const answer = vi.fn(), message = vi.fn();
    render(<VendiVoiceAgent context="Draft" onAnswer={answer} onAgentMessage={message} />);
    act(() => sdk.options.onMessage({ source: 'ai', message: 'What is your asking price?' }));
    act(() => sdk.options.onMessage({ source: 'user', message: 'Thirty thousand' }));
    act(() => sdk.options.clientTools.save_answer({ value: '30000' }));
    expect(message).toHaveBeenCalledWith('What is your asking price?');
    expect(answer).toHaveBeenCalledTimes(1);
    expect(answer).toHaveBeenCalledWith('30000');
  });
  it('cannot publish by voice without explicit on-screen acceptance', async () => {
    const publish = vi.fn(), review = vi.fn();
    render(<VendiVoiceAgent context="Draft" onAnswer={vi.fn()} onPublish={publish} onGoToReview={review} />);
    await sdk.options.clientTools.publish_listing();
    expect(publish).not.toHaveBeenCalled();
    expect(review).toHaveBeenCalledOnce();
  });
});
