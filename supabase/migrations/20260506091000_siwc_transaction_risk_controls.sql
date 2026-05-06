alter table public.siwc_signing_requests
  add column if not exists risk_level text,
  add column if not exists risk_reasons text[] not null default '{}'::text[],
  add column if not exists policy_decision text,
  add column if not exists step_up_required boolean not null default false,
  add column if not exists transaction_operation_type text,
  add column if not exists transaction_recipient text,
  add column if not exists transaction_contract_address text,
  add column if not exists transaction_declared_value_usd numeric(18, 2);

alter table public.siwc_signing_requests
  drop constraint if exists siwc_signing_requests_risk_level_check,
  add constraint siwc_signing_requests_risk_level_check
    check (risk_level is null or risk_level in ('low', 'medium', 'high'));

alter table public.siwc_signing_requests
  drop constraint if exists siwc_signing_requests_policy_decision_check,
  add constraint siwc_signing_requests_policy_decision_check
    check (policy_decision is null or policy_decision in ('allowed', 'denied'));

alter table public.siwc_signing_requests
  drop constraint if exists siwc_signing_requests_transaction_value_check,
  add constraint siwc_signing_requests_transaction_value_check
    check (
      transaction_declared_value_usd is null
      or transaction_declared_value_usd >= 0
    );

create index if not exists siwc_signing_requests_risk_idx
  on public.siwc_signing_requests(risk_level, created_at desc);
