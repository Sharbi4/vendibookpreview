import { useState, useMemo } from 'react';
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { FileCheck, FileClock, FileX, Filter, Calendar, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useAdminAllDocuments, AdminBookingDocument } from '@/hooks/useAdminDocumentReview';
import AdminDocumentReviewCard from './AdminDocumentReviewCard';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

const AdminDocumentHistorySection = () => {
  const { data: allDocuments, isLoading } = useAdminAllDocuments();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'week':
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case 'month':
        return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
      case 'custom':
        return { 
          from: customDateFrom ? startOfDay(customDateFrom) : undefined, 
          to: customDateTo ? endOfDay(customDateTo) : undefined 
        };
      default:
        return { from: undefined, to: undefined };
    }
  }, [datePreset, customDateFrom, customDateTo]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    if (!allDocuments) return [];

    return allDocuments.filter((doc) => {
      // Status filter
      if (statusFilter !== 'all' && doc.status !== statusFilter) return false;

      // Date filter
      const docDate = new Date(doc.uploaded_at);
      if (dateRange.from && isBefore(docDate, dateRange.from)) return false;
      if (dateRange.to && isAfter(docDate, dateRange.to)) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesListing = doc.booking?.listing?.title?.toLowerCase().includes(query);
        const matchesShopper = doc.booking?.shopper?.full_name?.toLowerCase().includes(query);
        const matchesEmail = doc.booking?.shopper?.email?.toLowerCase().includes(query);
        const matchesType = doc.document_type.toLowerCase().includes(query);
        if (!matchesListing && !matchesShopper && !matchesEmail && !matchesType) return false;
      }

      return true;
    });
  }, [allDocuments, statusFilter, dateRange, searchQuery]);

  // Stats for filtered results
  const stats = useMemo(() => {
    const pending = filteredDocuments.filter(d => d.status === 'pending').length;
    const approved = filteredDocuments.filter(d => d.status === 'approved').length;
    const rejected = filteredDocuments.filter(d => d.status === 'rejected').length;
    return { pending, approved, rejected, total: filteredDocuments.length };
  }, [filteredDocuments]);

  const clearFilters = () => {
    setStatusFilter('all');
    setDatePreset('all');
    setCustomDateFrom(undefined);
    setCustomDateTo(undefined);
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || datePreset !== 'all' || searchQuery !== '';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, listing, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">
                  <span className="flex items-center gap-2">
                    <FileClock className="h-4 w-4 text-amber-500" />
                    Pending
                  </span>
                </SelectItem>
                <SelectItem value="approved">
                  <span className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-emerald-500" />
                    Approved
                  </span>
                </SelectItem>
                <SelectItem value="rejected">
                  <span className="flex items-center gap-2">
                    <FileX className="h-4 w-4 text-destructive" />
                    Rejected
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Date Preset */}
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            {datePreset === 'custom' && (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {customDateFrom ? format(customDateFrom, 'MMM d') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customDateFrom}
                      onSelect={setCustomDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {customDateTo ? format(customDateTo, 'MMM d') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customDateTo}
                      onSelect={setCustomDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileClock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Approved</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileX className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Rejected</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Showing</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Document List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Documents Found</h3>
            <p className="text-muted-foreground">
              {hasActiveFilters 
                ? 'Try adjusting your filters to see more results.' 
                : 'No document submissions have been recorded yet.'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((doc) => (
            <AdminDocumentReviewCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDocumentHistorySection;
