import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Calendar, TrendingUp, Users, Mail, FileText, Eye, Timer, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAdminDailyReport, DailyReportData } from '@/hooks/useAdminDailyReport';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// --- Sub-components for mobile responsiveness ---

const SummaryStats = ({ totals }: { totals: DailyReportData['totals'] }) => {
  const stats = [
    { icon: Eye, value: totals.pageViews.toLocaleString(), label: 'Page Views', color: 'text-blue-500' },
    { icon: Users, value: totals.uniqueVisitors.toLocaleString(), label: 'Visitors', color: 'text-purple-500' },
    { icon: TrendingUp, value: `${totals.avgBounceRate}%`, label: 'Avg Bounce', color: 'text-amber-500' },
    { icon: Users, value: totals.newSignups, label: 'New Users', color: 'text-emerald-500' },
    { icon: Mail, value: totals.newsletterSignups, label: 'Newsletter', color: 'text-pink-500' },
    { icon: FileText, value: totals.draftsCreated, label: 'Drafts', color: 'text-orange-500' },
    { icon: Calendar, value: totals.listingsPublished, label: 'Published', color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm p-2.5 sm:p-3 text-center">
          <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
          <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

const CadenceStats = ({ cadence }: { cadence: DailyReportData['cadence'] }) => (
  <div className="rounded-2xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10 shadow-lg p-4 sm:p-5">
    <div className="flex items-center gap-2 mb-3">
      <Zap className="h-4 w-4 text-primary" />
      <h3 className="font-semibold text-sm">Growth Cadence</h3>
      <span className="text-xs text-muted-foreground">({cadence.totalDays} days)</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {[
        { icon: Users, label: 'Users', perWeek: cadence.usersPerWeek, avg: cadence.avgDaysBetweenUsers, color: 'text-emerald-600' },
        { icon: Calendar, label: 'Listings', perWeek: cadence.listingsPerWeek, avg: cadence.avgDaysBetweenListings, color: 'text-primary' },
        { icon: Mail, label: 'Newsletter', perWeek: cadence.newslettersPerWeek, avg: cadence.avgDaysBetweenNewsletters, color: 'text-pink-600' },
      ].map((item, i) => (
        <div key={i} className={`text-center p-3 rounded-xl bg-card/40 backdrop-blur-sm ${i === 1 ? 'sm:border-x sm:border-border/50 sm:rounded-none sm:bg-transparent' : ''}`}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <item.icon className={`h-3 w-3 ${item.color}`} />
            <span className="text-xs font-medium">{item.label}</span>
          </div>
          <p className={`text-lg font-bold ${item.color}`}>{item.perWeek}/week</p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Timer className="h-3 w-3" />
            Avg {item.avg} days between
          </p>
        </div>
      ))}
    </div>
  </div>
);

const ReportTable = ({ rows }: { rows: DailyReportData['rows'] }) => (
  <ScrollArea className="h-[400px] rounded-xl border shadow-sm">
    <div className="min-w-[900px]">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-[90px]">Date</TableHead>
            <TableHead className="text-right">Views</TableHead>
            <TableHead className="text-right">Visitors</TableHead>
            <TableHead className="text-right">Bounce %</TableHead>
            <TableHead className="text-right">Signups</TableHead>
            <TableHead>New Users & Roles</TableHead>
            <TableHead className="text-right">Newsletter</TableHead>
            <TableHead className="text-right">Drafts</TableHead>
            <TableHead>Draft Types</TableHead>
            <TableHead className="text-right">Published</TableHead>
            <TableHead>Published Types</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx} className={row.newSignups > 0 || row.listingsPublished > 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}>
              <TableCell className="font-medium whitespace-nowrap text-xs sm:text-sm">{row.date}</TableCell>
              <TableCell className="text-right">{row.pageViews}</TableCell>
              <TableCell className="text-right">{row.uniqueVisitors}</TableCell>
              <TableCell className="text-right">
                <Badge variant={row.bounceRate > 70 ? 'destructive' : row.bounceRate > 50 ? 'secondary' : 'default'} className="font-mono">
                  {row.bounceRate}%
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {row.newSignups > 0 ? (
                  <Badge className="bg-emerald-500">{row.newSignups}</Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="max-w-[180px] truncate text-xs" title={row.newSignupDetails}>
                {row.newSignupDetails}
              </TableCell>
              <TableCell className="text-right">
                {row.newsletterSignups > 0 ? (
                  <Badge variant="secondary" className="bg-pink-100 text-pink-700">{row.newsletterSignups}</Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {row.draftsCreated > 0 ? (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">{row.draftsCreated}</Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="max-w-[180px] truncate text-xs" title={row.draftDetails}>
                {row.draftDetails}
              </TableCell>
              <TableCell className="text-right">
                {row.listingsPublished > 0 ? (
                  <Badge className="bg-primary">{row.listingsPublished}</Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="max-w-[180px] truncate text-xs" title={row.listingDetails}>
                {row.listingDetails}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </ScrollArea>
);

// --- Main component ---

const DailyReportExport = () => {
  const startDate = new Date('2025-01-15');
  const { data, isLoading, error } = useAdminDailyReport(startDate);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (!data) return;
    
    setIsExporting(true);
    
    try {
      const excelData = data.rows.map(row => ({
        'Date': row.date,
        'Page Views': row.pageViews,
        'Unique Visitors': row.uniqueVisitors,
        'Bounce Rate (%)': row.bounceRate,
        'New Signups': row.newSignups,
        'Days Since Last Signup': row.daysSinceLastUser ?? '-',
        'New User Details (Name & Role)': row.newSignupDetails,
        'Newsletter Signups': row.newsletterSignups,
        'Days Since Last Newsletter': row.daysSinceLastNewsletter ?? '-',
        'Drafts Created': row.draftsCreated,
        'Draft Details (Title, Category, Mode)': row.draftDetails,
        'Listings Published': row.listingsPublished,
        'Days Since Last Listing': row.daysSinceLastListing ?? '-',
        'Published Listing Details (Title, Category, Mode)': row.listingDetails,
      }));

      excelData.push({
        'Date': 'TOTALS',
        'Page Views': data.totals.pageViews,
        'Unique Visitors': data.totals.uniqueVisitors,
        'Bounce Rate (%)': data.totals.avgBounceRate,
        'New Signups': data.totals.newSignups,
        'Days Since Last Signup': '-',
        'New User Details (Name & Role)': '-',
        'Newsletter Signups': data.totals.newsletterSignups,
        'Days Since Last Newsletter': '-',
        'Drafts Created': data.totals.draftsCreated,
        'Draft Details (Title, Category, Mode)': '-',
        'Listings Published': data.totals.listingsPublished,
        'Days Since Last Listing': '-',
        'Published Listing Details (Title, Category, Mode)': '-',
      });

      excelData.push({
        'Date': 'CADENCE STATS',
        'Page Views': 0,
        'Unique Visitors': 0,
        'Bounce Rate (%)': 0,
        'New Signups': 0,
        'Days Since Last Signup': `${data.cadence.usersPerWeek}/week, Avg ${data.cadence.avgDaysBetweenUsers} days between`,
        'New User Details (Name & Role)': '-',
        'Newsletter Signups': 0,
        'Days Since Last Newsletter': `${data.cadence.newslettersPerWeek}/week, Avg ${data.cadence.avgDaysBetweenNewsletters} days between`,
        'Drafts Created': 0,
        'Draft Details (Title, Category, Mode)': '-',
        'Listings Published': 0,
        'Days Since Last Listing': `${data.cadence.listingsPerWeek}/week, Avg ${data.cadence.avgDaysBetweenListings} days between`,
        'Published Listing Details (Title, Category, Mode)': '-',
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
        { wch: 12 }, { wch: 20 }, { wch: 50 }, { wch: 18 },
        { wch: 22 }, { wch: 15 }, { wch: 50 }, { wch: 18 },
        { wch: 20 }, { wch: 50 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Daily Report');
      const filename = `vendibook-daily-report-${format(startDate, 'MMM-dd-yyyy')}-to-${format(new Date(), 'MMM-dd-yyyy')}.xlsx`;
      XLSX.writeFile(wb, filename);
    } finally {
      setIsExporting(false);
    }
  };

  if (error) {
    return (
      <Card className="border-destructive shadow-lg">
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading report: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl shadow-sm">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Daily Analytics Report</CardTitle>
              <CardDescription className="text-xs sm:text-sm truncate">
                Jan 15, 2025 – present • ET • Excl. test accounts
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={handleExport} 
            disabled={isLoading || !data || isExporting}
            className="gap-2 w-full sm:w-auto shadow-md"
            variant="dark-shine"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export to Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 sm:space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <SummaryStats totals={data.totals} />
            <CadenceStats cadence={data.cadence} />
            <ReportTable rows={data.rows} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default DailyReportExport;
