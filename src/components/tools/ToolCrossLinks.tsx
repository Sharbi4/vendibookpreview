import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, DollarSign, FileCheck, Rocket, Scale } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  tagline: string;
  path: string;
  icon: React.ReactNode;
  gradient: string;
}

// PARKED 2026-08-25: BuildKit, Listing Studio, Concept Lab, Market Radar, and
// Marketing Studio removed from cross-links while disabled. Restore entries
// here (and in toolFlows) when the tools relaunch.
const allTools: Tool[] = [
  { id: 'pricepilot', name: 'PricePilot', tagline: 'Set competitive pricing', path: '/tools/pricepilot', icon: <DollarSign className="h-5 w-5" />, gradient: 'from-yellow-500 to-amber-500' },
  { id: 'permitpath', name: 'PermitPath', tagline: 'Find permits & licenses', path: '/tools/permitpath', icon: <FileCheck className="h-5 w-5" />, gradient: 'from-amber-500 to-orange-500' },
  { id: 'startup-guide', name: 'Startup Guide', tagline: 'Complete launch checklist', path: '/tools/startup-guide', icon: <Rocket className="h-5 w-5" />, gradient: 'from-emerald-500 to-teal-500' },
  { id: 'regulations-hub', name: 'Regulations Hub', tagline: 'Permits & compliance by state', path: '/tools/regulations-hub', icon: <Scale className="h-5 w-5" />, gradient: 'from-blue-500 to-purple-600' }
];

const toolFlows: Record<string, string[]> = {
  'permitpath': ['pricepilot', 'regulations-hub', 'startup-guide'],
  'pricepilot': ['permitpath', 'regulations-hub', 'startup-guide'],
  'startup-guide': ['permitpath', 'regulations-hub', 'pricepilot'],
  'regulations-hub': ['permitpath', 'startup-guide', 'pricepilot']
};

interface ToolCrossLinksProps {
  currentTool: string;
  title?: string;
  subtitle?: string;
}

const ToolCrossLinks = ({ currentTool, title, subtitle }: ToolCrossLinksProps) => {
  const relatedToolIds = toolFlows[currentTool] || [];
  const relatedTools = relatedToolIds.map(id => allTools.find(t => t.id === id)).filter(Boolean) as Tool[];

  if (relatedTools.length === 0) return null;

  return (
    <section className="py-12 bg-muted/30">
      <div className="container">
        <div className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-bold mb-2">
            {title || 'Related Tools'}
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            {subtitle || 'Continue building your food truck business with these tools.'}
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
          {relatedTools.map((tool) => (
            <Link key={tool.id} to={tool.path}>
              <Card className="h-full border hover:border-primary/30 transition-all hover:shadow-md group cursor-pointer">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-3 text-white group-hover:scale-110 transition-transform`}>
                    {tool.icon}
                  </div>
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {tool.tagline}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        <div className="text-center mt-6">
          <Link to="/tools" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← View all Host Tools
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ToolCrossLinks;
