import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, DollarSign, FileCheck, Wrench, FileText, Lightbulb, Search, Megaphone, Rocket, Scale } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  tagline: string;
  path: string;
  icon: React.ReactNode;
  gradient: string;
}

const allTools: Tool[] = [
  { id: 'pricepilot', name: 'PricePilot', tagline: 'Set competitive pricing', path: '/tools/pricepilot', icon: <DollarSign className="h-5 w-5" />, gradient: 'from-yellow-500 to-amber-500' },
  { id: 'permitpath', name: 'PermitPath', tagline: 'Find permits & licenses', path: '/tools/permitpath', icon: <FileCheck className="h-5 w-5" />, gradient: 'from-amber-500 to-orange-500' },
  { id: 'buildkit', name: 'BuildKit', tagline: 'Get equipment guides', path: '/tools/buildkit', icon: <Wrench className="h-5 w-5" />, gradient: 'from-orange-500 to-red-500' },
  { id: 'listing-studio', name: 'Listing Studio', tagline: 'Write compelling listings', path: '/tools/listing-studio', icon: <FileText className="h-5 w-5" />, gradient: 'from-red-500 to-orange-500' },
  { id: 'concept-lab', name: 'Concept Lab', tagline: 'Generate business ideas', path: '/tools/concept-lab', icon: <Lightbulb className="h-5 w-5" />, gradient: 'from-orange-500 to-amber-500' },
  { id: 'market-radar', name: 'Market Radar', tagline: 'Research your market', path: '/tools/market-radar', icon: <Search className="h-5 w-5" />, gradient: 'from-amber-500 to-yellow-500' },
  { id: 'marketing-studio', name: 'Marketing Studio', tagline: 'Create marketing materials', path: '/tools/marketing-studio', icon: <Megaphone className="h-5 w-5" />, gradient: 'from-pink-500 to-purple-600' },
  { id: 'startup-guide', name: 'Startup Guide', tagline: 'Complete launch checklist', path: '/tools/startup-guide', icon: <Rocket className="h-5 w-5" />, gradient: 'from-emerald-500 to-teal-500' },
  { id: 'regulations-hub', name: 'Regulations Hub', tagline: 'Permits & compliance by state', path: '/tools/regulations-hub', icon: <Scale className="h-5 w-5" />, gradient: 'from-blue-500 to-purple-600' }
];

const toolFlows: Record<string, string[]> = {
  'concept-lab': ['buildkit', 'permitpath', 'startup-guide'],
  'buildkit': ['permitpath', 'pricepilot', 'startup-guide'],
  'permitpath': ['buildkit', 'regulations-hub', 'startup-guide'],
  'pricepilot': ['listing-studio', 'market-radar', 'marketing-studio'],
  'listing-studio': ['pricepilot', 'market-radar', 'marketing-studio'],
  'market-radar': ['concept-lab', 'pricepilot', 'startup-guide'],
  'marketing-studio': ['listing-studio', 'concept-lab', 'market-radar'],
  'startup-guide': ['permitpath', 'regulations-hub', 'pricepilot'],
  'regulations-hub': ['permitpath', 'startup-guide', 'buildkit']
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
