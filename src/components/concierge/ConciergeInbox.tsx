import { useState } from "react";
import { Sparkles, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConciergeInbox, useConciergeMessages, type ConciergeAction } from "@/hooks/useConciergeInbox";

interface Props {
  userId: string | undefined;
}

const priorityColor = (p: string) =>
  p === "high" ? "bg-destructive/15 text-destructive border-destructive/20"
    : p === "low" ? "bg-muted text-muted-foreground"
    : "bg-primary/10 text-primary border-primary/20";

export const ConciergeInbox = ({ userId }: Props) => {
  const { threads, totalUnread, markRead } = useConciergeInbox(userId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: messages = [] } = useConciergeMessages(activeId ?? undefined);

  const handleAction = (a: ConciergeAction) => {
    if (a.kind === "link" && a.url) window.location.assign(a.url);
    if (a.kind === "share" && a.url && navigator.share) {
      navigator.share({ url: a.url, title: "Vendibook" }).catch(() => {});
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Open Vendi concierge inbox">
          <Sparkles className="h-5 w-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground flex items-center justify-center">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Vendi Concierge
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 grid grid-rows-[auto_1fr] overflow-hidden">
          {/* Threads list */}
          {!activeId ? (
            <ScrollArea className="row-span-2">
              <div className="divide-y">
                {threads.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    <Bell className="mx-auto mb-2 h-6 w-6 opacity-50" />
                    Nothing yet — Vendi will reach out with timely tips and opportunities.
                  </div>
                ) : threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveId(t.id); markRead(t.id); }}
                    className="w-full text-left p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{t.topic}</div>
                      <Badge variant="outline" className={priorityColor(t.priority)}>
                        {t.priority}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}</span>
                      {t.unread_count > 0 && (
                        <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5">
                          {t.unread_count} new
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <>
              <div className="px-5 py-3 border-b flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}>← Back</Button>
              </div>
              <ScrollArea className="px-5 py-4">
                <div className="space-y-4">
                  {messages.map((m) => (
                    <div key={m.id} className="space-y-2">
                      <div className={`rounded-lg p-3 text-sm ${m.sender_role === "ai" ? "bg-primary/5 border border-primary/10" : "bg-muted"}`}>
                        {m.content}
                      </div>
                      {m.actions?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {m.actions.map((a, i) => (
                            <Button key={i} size="sm" variant={a.kind === "share" ? "default" : "outline"} onClick={() => handleAction(a)}>
                              {a.label}
                            </Button>
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
