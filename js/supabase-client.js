// js/supabase-client.js

const SUPABASE_URL = 'https://yjmyhhwmrzanpvnobdmg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqbXloaHdtcnphbnB2bm9iZG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjk0MTEsImV4cCI6MjA4MjYwNTQxMX0.BqPp0axzL4kzbhjZHLCWhAZI_h-LjDtqd78Lemh0YjY';

// Use 'supabase.createClient' (no 'const' before the word supabase) 
// because the library defines it for us globally.
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// We attach it to the window so all your other files (app.js, admin.js) can use it
window.supabaseClient = _supabase;

console.log("Supabase Connection Initialized!");