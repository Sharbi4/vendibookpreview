import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Send, Loader2, Paperclip, X, FileText, Image as ImageIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBookingMessages } from '@/hooks/useBookingMessages';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface MessageThreadProps {
  bookingId: string;
  otherPartyName?: string;
}

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const MessageThread: React.FC<MessageThreadProps> = ({
  bookingId,
  otherPartyName = 'User',
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, isLoading, isSending, sendMessage, markAsRead } =
    useBookingMessages(bookingId);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    markAsRead();
  }, [messages.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image, PDF, or Word document.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    const trimmedMessage = newMessage.trim();
    
    // Validate message length
    if (!trimmedMessage && !selectedFile) return;
    
    if (trimmedMessage.length > 5000) {
      toast({
        title: 'Message too long',
        description: 'Messages must be less than 5000 characters.',
        variant: 'destructive',
      });
      return;
    }
    
    await sendMessage(trimmedMessage, selectedFile || undefined);
    setNewMessage('');
    clearSelectedFile();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isImageAttachment = (type: string | null) => type?.startsWith('image/');
  const isPdfAttachment = (type: string | null) => type === 'application/pdf';

  const renderAttachment = (url: string | null, name: string | null, type: string | null) => {
    if (!url || !name) return null;

    if (isImageAttachment(type)) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img 
            src={url} 
            alt={name} 
            className="max-w-[200px] max-h-[200px] rounded-md object-cover hover:opacity-90 transition-opacity"
          />
        </a>
      );
    }

    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 mt-2 p-2 rounded-md bg-background/50 hover:bg-background/80 transition-colors"
      >
        {isPdfAttachment(type) ? (
          <FileText className="h-4 w-4 text-red-500" />
        ) : (
          <FileText className="h-4 w-4 text-blue-500" />
        )}
        <span className="text-xs truncate max-w-[150px]">{name}</span>
        <Download className="h-3 w-3 ml-auto" />
      </a>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px]">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex flex-col max-w-[80%]',
                    isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
                  )}
                >
                <div
                    className={cn(
                      'rounded-lg px-4 py-2',
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    {renderAttachment(message.attachment_url, message.attachment_name, message.attachment_type)}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {format(new Date(message.created_at), 'MMM d, h:mm a')}
                    {isOwn && message.read_at && (
                      <span className="ml-2">• Read</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-4">
        {/* File preview */}
        {selectedFile && (
          <div className="mb-3 p-2 bg-muted rounded-md flex items-center gap-2">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="h-12 w-12 rounded bg-background flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={clearSelectedFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept={ALLOWED_FILE_TYPES.join(',')}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-[60px] w-[50px] shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherPartyName}...`}
            className="min-h-[60px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !selectedFile) || isSending}
            size="icon"
            className="h-[60px] w-[60px] shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
