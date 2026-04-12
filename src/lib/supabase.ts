import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrnjdsrzmtejhgjvzzwc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impybmpkc3J6bXRlamhnanZ6endjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDczNjcsImV4cCI6MjA5MTA4MzM2N30.0aN1x3m1wj36PgENd2FVF6OlDTfCJiqNuZNk5I8nHzE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);