-- =====================================================================
-- Migración 0010: endurecimiento de permisos de ejecución (Supabase Advisors)
-- * Funciones de trigger: nadie las invoca por API (los triggers siguen funcionando:
--   PostgreSQL verifica EXECUTE solo al crear el trigger).
-- * Funciones auxiliares de autorización: solo usuarios autenticados (las usan
--   las políticas RLS); nunca anónimos.
-- * RPC clínicas: solo autenticados (ya validan rol/sector internamente).
-- =====================================================================
do $$
declare f text;
begin
  foreach f in array array[
    'handle_new_user()', 'trg_ai_model_validated()', 'trg_assessment_after()', 'trg_assessment_rules()',
    'trg_audit()', 'trg_fill_admission()', 'trg_fill_patient_from_wound()', 'trg_patient_fictitious_guard()',
    'trg_set_updated_at()', 'trg_block_mutation()', 'trg_assessment_update_guard()', 'trg_wound_guard()',
    'trg_profile_guard()', 'seed_hospital_structure()']
  loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;

  foreach f in array array[
    'app_current_role()', 'app_is_admin()', 'app_is_active_user()', 'app_has_sector(uuid)',
    'app_can_access_patient(uuid)', 'app_can_write_clinical()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
