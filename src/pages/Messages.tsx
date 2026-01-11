import { useParams, Link, Navigate } from 'react-router-dom';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ConversationList from '@/components/messaging/ConversationList';
import ConversationThread from '@/components/messaging/ConversationThread';
import { useAuth } from '@/contexts/AuthContext';

const Messages = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user, isLoading } = useAuth();

  // Redirect to auth if not logged in
  if (!isLoading && !user) {
    return <Navigate to="/auth" state={{ from: '/messages' }} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            {conversationId && (
              <Button variant="ghost" size="icon" asChild className="hidden md:flex">
                <Link to="/messages">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
            )}
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {/* Desktop: Side-by-side layout */}
          <div className="hidden md:grid md:grid-cols-[350px_1fr] min-h-[600px]">
            {/* Conversation List */}
            <div className="border-r border-border overflow-y-auto max-h-[calc(100vh-240px)]">
              <ConversationList />
            </div>

            {/* Thread or Empty State */}
            <div className="flex flex-col">
              {conversationId ? (
                <ConversationThread conversationId={conversationId} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-muted-foreground max-w-sm">
                    Choose a conversation from the list to view messages.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Single view */}
          <div className="md:hidden min-h-[calc(100vh-240px)]">
            {conversationId ? (
              <ConversationThread conversationId={conversationId} />
            ) : (
              <ConversationList />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Messages;
