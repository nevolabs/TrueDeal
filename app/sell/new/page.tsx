import RequireAuth from '@/components/RequireAuth';
import ListingForm from '@/components/ListingForm';

export default function SellNewPage() {
  return <RequireAuth><ListingForm /></RequireAuth>;
}
