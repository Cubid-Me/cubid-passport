insert into public.webhook_types (name, action_type)
values
  ('wallet.created', 'siwc'),
  ('wallet.policy.denied', 'siwc'),
  ('wallet.signature.completed', 'siwc'),
  ('wallet.signature.failed', 'siwc'),
  ('wallet.signing_request.approved', 'siwc'),
  ('wallet.signing_request.cancelled', 'siwc'),
  ('wallet.signing_request.created', 'siwc'),
  ('wallet.signing_request.rejected', 'siwc'),
  ('wallet.signing_request.step_up_failed', 'siwc')
on conflict (name) do update
set action_type = excluded.action_type;
