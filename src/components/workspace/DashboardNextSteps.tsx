import { ArrowUpRight, CheckCircle2, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';

type NextStep = { id: string; label: string; hint: string; to: string; icon: LucideIcon; tone?: 'warn' | 'neutral' };

export default function DashboardNextSteps({ tasks }: { tasks: NextStep[] }) {
  return <section className="v2-panel overflow-hidden" aria-label="Your next steps">
    <div className="v2-panel-head">
      <div><h2>Up next</h2><p>{tasks.length ? 'A few things to keep moving.' : 'You’re up to date.'}</p></div>
      {tasks.length > 0 && <Sheet>
        <SheetTrigger asChild><button type="button" className="v2-btn-quiet">View all ({tasks.length})</button></SheetTrigger>
        <SheetContent className="w-full overflow-y-auto bg-[#fffdf9] text-[#29231e] sm:max-w-lg">
          <SheetHeader><SheetTitle>Your next steps</SheetTitle><SheetDescription>Upcoming walkthroughs, requests, and account reminders.</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-2">{tasks.map(task => <SheetClose asChild key={task.id}><Link to={task.to} className="flex items-start gap-3 rounded-2xl border border-[#e7ded3] p-4 transition-colors hover:bg-[#f7f1e9]">
            <task.icon className={`mt-0.5 h-5 w-5 shrink-0 ${task.tone === 'warn' ? 'text-amber-700' : 'text-[#806b59]'}`} />
            <span className="min-w-0"><strong className="block text-sm">{task.label}</strong><small className="mt-1 block leading-relaxed text-[#786c60]">{task.hint}</small></span><ArrowUpRight className="ml-auto h-4 w-4 shrink-0" />
          </Link></SheetClose>)}</div>
        </SheetContent>
      </Sheet>}
    </div>
    {tasks.length ? <div className="grid gap-2 px-4 pb-4 md:grid-cols-3">{tasks.slice(0,3).map(task => <Link key={task.id} to={task.to} className="group flex min-w-0 items-start gap-3 rounded-2xl border border-[#e9e1d6] bg-[#fcf9f4] p-3.5 transition-colors hover:border-orange-200 hover:bg-[#fff4e9]">
      <span className={`rounded-xl p-2 ${task.tone === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-[#eee7dc] text-[#806b59]'}`}><task.icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold leading-snug">{task.label}</strong><small className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">{task.hint}</small></span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </Link>)}</div> : <div className="flex items-center gap-2 px-5 pb-4 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" />New requests and reminders will appear here.</div>}
  </section>;
}
