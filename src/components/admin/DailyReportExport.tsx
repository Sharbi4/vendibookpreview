import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2, Calendar, TrendingUp, Users, Mail, FileText, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAdminDailyReport, DailyReportData } from '@/hooks/useAdminDailyReport';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const DailyReportExport = () => {
  const startDate = new Date('2025-01-15');
  const { data, isLoading, error } = useAdminDailyReport(startDate);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (!data) return;
    
    setIsExporting(true);
    
    try {
      // Prepare data for Excel
      const excelData = data.rows.map(row => ({
        'Date': row.date,
        'Page Views': row.pageViews,
        'Unique Visitors': row.uniqueVisitors,
        'Bounce Rate (%)': row.bounceRate,
        'New Signups': row.newSignups,
        'New User Details (Name & Role)': row.newSignupDetails,
        'Newsletter Signups': row.newsletterSignups,
        'Drafts Created': row.draftsCreated,
        'Draft Details (Title, Category, Mode)': row.draftDetails,
        'Listings Published': row.listingsPublished,
        'Published Listing Details (Title, Category, Mode)': row.listingDetails,
      }));

      // Add totals row
      excelData.push({
        'Date': 'TOTALS',
        'Page Views': data.totals.pageViews,
        'Unique Visitors': data.totals.uniqueVisitors,
        'Bounce Rate (%)': data.totals.avgBounceRate,
        'New Signups': data.totals.newSignups,
        'New User Details (Name & Role)': '-',
        'Newsletter Signups': data.totals.newsletterSignups,
        'Drafts Created': data.totals.draftsCreated,
        'Draft Details (Title, Category, Mode)': '-',
        'Listings Published': data.totals.listingsPublished,
        'Published Listing Details (Title, Category, Mode)': '-',
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 15 },  // Date
        { wch: 12 },  // Page Views
        { wch: 15 },  // Unique Visitors
        { wch: 15 },  // Bounce Rate
        { wch: 12 },  // New Signups
        { wch: 50 },  // New User Details
        { wch: 18 },  // Newsletter Signups
        { wch: 15 },  // Drafts Created
        { wch: 50 },  // Draft Details
        { wch: 18 },  // Listings Published
        { wch: 50 },  // Published Details
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Daily Report');

      // Generate filename with date range
      const filename = `vendibook-daily-report-${format(startDate, 'MMM-dd-yyyy')}-to-${format(new Date(), 'MMM-dd-yyyy')}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
    } finally {
      setIsExporting(false);
    }
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading report: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Daily Analytics Report</CardTitle>
              <CardDescription>
                Data from Jan 15, 2025 to present (excluding test accounts)
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={handleExport} 
            disabled={isLoading || !data || isExporting}
            className="gap-2"
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
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Eye className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                <p className="text-xl font-bold">{data.totals.pageViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Page Views</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Users className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                <p className="text-xl font-bold">{data.totals.uniqueVisitors.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Visitors</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                <p className="text-xl font-bold">{data.totals.avgBounceRate}%</p>
                <p className="text-xs text-muted-foreground">Avg Bounce</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Users className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                <p className="text-xl font-bold">{data.totals.newSignups}</p>
                <p className="text-xs text-muted-foreground">New Users</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Mail className="h-4 w-4 mx-auto mb-1 text-pink-500" />
                <p className="text-xl font-bold">{data.totals.newsletterSignups}</p>
                <p className="text-xs text-muted-foreground">Newsletter</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <FileText className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                <p className="text-xl font-bold">{data.totals.draftsCreated}</p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Calendar className="h-4 w-4 mx-auto mb-1 text-primary" />
                <p className="text-xl font-bold">{data.totals.listingsPublished}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>

            {/* Data Table */}
            <ScrollArea className="h-[400px] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
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
                  {data.rows.map((row, idx) => (
                    <TableRow key={idx} className={row.newSignups > 0 || row.listingsPublished > 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}>
                      <TableCell className="font-medium whitespace-nowrap">{row.date}</TableCell>
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
                      <TableCell className="max-w-[200px] truncate text-xs" title={row.newSignupDetails}>
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
                      <TableCell className="max-w-[200px] truncate text-xs" title={row.draftDetails}>
                        {row.draftDetails}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.listingsPublished > 0 ? (
                          <Badge className="bg-primary">{row.listingsPublished}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs" title={row.listingDetails}>
                        {row.listingDetails}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default DailyReportExport;
