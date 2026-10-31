-- Habilita al PRIMER administrador (ejecutar una sola vez en Supabase > SQL Editor,
-- después de crear el usuario en Authentication > Users). Reemplace el correo.
update public.profiles
set role = 'admin', active = true, full_name = coalesce(nullif(full_name, ''), 'Administración')
where id = (select id from auth.users where email = 'CORREO-DEL-ADMIN@institucion.gob.ar');
