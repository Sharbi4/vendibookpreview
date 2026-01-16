import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, DollarSign, FileCheck, Wrench, FileText, Lightbulb, Search } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  tagline: string;
  path: string;
  icon: React.ReactNode;
  gradient: string;
}

const allTools: Tool[] = [
  {
    id: 'pricepilot',
    name: 'PricePilot',
    tagline: 'Set competitive pricing',
    path: '/tools/pricepilot',
    icon: <DollarSign className="h-5 w-5" />,
    gradient: 'from-yellow-500 to-amber-500'
  },
  {
    id: 'permitpath',
    name: 'PermitPath',
    tagline: 'Find permits & licenses',
    path: '/tools/permitpath',
    icon: <FileCheck className="h-5 w-5" />,
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    id: 'buildkit',
    name: 'BuildKit',
    tagline: 'Get equipment guides',
    path: '/tools/buildkit',
    icon: <Wrench className="h-5 w-5" />,
    gradient: 'from-orange-500 to-red-500'
  },
  {
    id: 'listing-studio',
    name: 'Listing Studio',
    tagline: 'Write compelling listings',
    path: '/tools/listing-studio',
    icon: <FileText className="h-5 w-5" />,
    gradient: 'from-red-500 to-orange-500'
  },
  {
    id: 'concept-lab',
    name: 'Concept Lab',
    tagline: 'Generate business ideas',
    path: '/tools/concept-lab',
    icon: <Lightbulb className="h-5 w-5" />,
    gradient: 'from-orange-500 to-amber-500'
  },
  {
    id: 'market-radar',
    name: 'Market Radar',
    tagline: 'Research your market',
    path: '/tools/market-radar',
    icon: <Search className="h-5 w-5" />,
    gradient: 'from-amber-500 to-yellow-500'
  }
];

// Define logical workflow connections between tools
const toolFlows: Record<string, string[]> = {
  'concept-lab': ['buildkit', 'permitpath', 'pricepilot'],
  'buildkit': ['permitpath', 'pricepilot', 'listing-studio'],
  'permitpath': ['buildkit', 'pricepilot', 'listing-studio'],
  'pricepilot': ['listing-studio', 'market-radar', 'permitpath'],
  'listing-studio': ['pricepilot', 'market-radar', 'concept-lab'],
  'market-radar': ['concept-lab', 'pricepilot', 'permitpath']
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
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-3">Continue Your Journey</Badge>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            {title || 'Next Steps in Your Workflow'}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {subtitle || 'These tools work great together. Continue building your food truck business.'}
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
          {relatedTools.map((tool) => (
            <Link key={tool.id} to={tool.path}>
              <Card className="h-full border-2 border-transparent hover:border-primary/20 transition-all hover:shadow-lg group cursor-pointer">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform`}>
                    {tool.icon}
                  </div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {tool.tagline}
                  </p>
                  <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                    Try it now <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link to="/ai-tools" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Command Center
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ToolCrossLinks;
