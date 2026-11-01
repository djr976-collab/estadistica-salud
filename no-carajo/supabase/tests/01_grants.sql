-- Supabase otorga estos permisos por defecto a "authenticated"
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
