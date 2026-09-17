import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import ConversationList from '@/components/messaging/ConversationList';
import ConversationThread from '@/components/messaging/ConversationThread';
import MessageSearch from '@/components/messaging/MessageSearch';

export default function WorkspaceMessages() {
  const { conversationId } = useParams<{ conversationId?: string }>();

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <p className="v2-eyebrow">Inbox</p>
          <h1>Messages</h1>
          <p>Conversations with buyers, renters, hosts and sellers.</p>
        </header>

        {!conversationId && <MessageSearch />}

        {conversationId && (
          <Link to="/dashboard/messages" className="v2-btn-quiet self-start md:hidden">
            <ArrowLeft className="h-4 w-4" />
            All conversations
          </Link>
        )}

        <section className="v2-panel overflow-hidden p-0">
          <div className="hidden md:grid md:grid-cols-[320px_1fr] min-h-[560px]">
            <div className="border-r border-[hsl(var(--v2-line))] overflow-y-auto max-h-[calc(100vh-260px)]">
              <ConversationList />
            </div>
            <div className="flex flex-col">
              {conversationId ? (
                <ConversationThread conversationId={conversationId} />
              ) : (
                <div className="v2-empty">
                  <h3>Select a conversation</h3>
                  <p>Choose a conversation on the left to read and reply.</p>
                </div>
              )}
            </div>
          </div>

          <div className="md:hidden min-h-[60vh]">
            {conversationId ? (
              <ConversationThread conversationId={conversationId} />
            ) : (
              <ConversationList />
            )}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
