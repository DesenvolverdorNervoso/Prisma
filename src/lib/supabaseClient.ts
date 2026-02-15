import { createClient } from "@supabase/supabase-js";

const supabaseUrl ="https://baxhbjkvunmjqwablmzb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheGhiamt2dW5tanF3YWJsbXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTk3MTcsImV4cCI6MjA4NjY3NTcxN30._UfcqiRgX7DhXfFElpZ4AM0AOquUGbW6KQ8CLivu9T4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("Supabase URL carregada:", supabaseUrl);