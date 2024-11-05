import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://cggycnbvljcdptzyjpju.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ3ljbmJ2bGpjZHB0enlqcGp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4MDQ2MjQ3MCwiZXhwIjoxOTk2MDM4NDcwfQ.LncxIJhT0HgOG5Kzoa9i57uIQL3jqOzXaDOnErbB_7M'
);
