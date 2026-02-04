import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useHostBookings } from '@/hooks/useHostBookings';
import BookingRequestCard from '@/components/dashboard/BookingRequestCard';

const HostBookings = () => {
  const { bookings, isLoading, approveBooking, declineBooking, cancelBooking, processDepositRefund } = useHostBookings();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookings = bookings.filter(b => 
    b.shopper?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.listing?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pending = filteredBookings.filter(b => b.status === 'pending');
  const confirmed = filteredBookings.filter(b => b.status === 'approved');
  const past = filteredBookings.filter(b => b.status === 'completed');
  const cancelled = filteredBookings.filter(b => ['cancelled', 'declined'].includes(b.status));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-6xl py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" asChild className="-ml-2">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
            <p className="text-muted-foreground">Manage all your incoming and active bookings.</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search guest or listing..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-6 w-full md:w-auto overflow-x-auto justify-start">
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pending.length > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 h-5 px-1.5 min-w-[20px]">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="gap-2">
              Confirmed
              {confirmed.length > 0 && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 h-5 px-1.5 min-w-[20px]">
                  {confirmed.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoading ? (
              <LoadingState />
            ) : pending.length === 0 ? (
              <EmptyState type="pending" />
            ) : (
              pending.map(b => (
                <BookingRequestCard 
                  key={b.id} 
                  booking={b} 
                  onApprove={approveBooking} 
                  onDecline={declineBooking}
                  onCancel={cancelBooking}
                  onDepositAction={processDepositRefund}
                />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="confirmed" className="space-y-4">
            {isLoading ? (
              <LoadingState />
            ) : confirmed.length === 0 ? (
              <EmptyState type="confirmed" />
            ) : (
              confirmed.map(b => (
                <BookingRequestCard 
                  key={b.id} 
                  booking={b} 
                  onApprove={approveBooking} 
                  onDecline={declineBooking}
                  onCancel={cancelBooking}
                  onDepositAction={processDepositRefund}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {isLoading ? (
              <LoadingState />
            ) : past.length === 0 ? (
              <EmptyState type="completed" />
            ) : (
              past.map(b => (
                <BookingListRow key={b.id} booking={b} status="completed" />
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {isLoading ? (
              <LoadingState />
            ) : cancelled.length === 0 ? (
              <EmptyState type="cancelled" />
            ) : (
              cancelled.map(b => (
                <BookingListRow key={b.id} booking={b} status="cancelled" />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

const BookingListRow = ({ booking, status }: { booking: any, status: string }) => (
  <Card className="hover:border-primary/50 transition-colors">
    <CardContent className="p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {/* Status Icon */}
        <div className={`p-2 rounded-full ${
          status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' :
          status === 'cancelled' ? 'bg-red-100 text-red-600' :
          'bg-gray-100 text-gray-600'
        }`}>
          {status === 'confirmed' ? <CheckCircle2 className="h-5 w-5" /> :
           status === 'cancelled' ? <XCircle className="h-5 w-5" /> :
           <Clock className="h-5 w-5" />}
        </div>
        
        <div>
          <h4 className="font-semibold">{booking.shopper?.full_name || 'Guest'}</h4>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {booking.listing?.title}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Calendar className="h-3 w-3" />
            {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="font-bold">${booking.total_price}</p>
          <p className="text-xs text-muted-foreground capitalize">{status}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Message Guest</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({ type }: { type: string }) => (
  <div className="text-center py-12 border-2 border-dashed rounded-xl">
    <p className="text-muted-foreground">No {type} reservations found.</p>
  </div>
);

const LoadingState = () => (
  <div className="text-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
    <p className="text-muted-foreground">Loading reservations...</p>
  </div>
);

export default HostBookings;
