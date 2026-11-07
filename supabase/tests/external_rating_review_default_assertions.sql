do $$
declare
  existing_status text;
  inserted_status text;
  default_expression text;
begin
  select verification_status
    into existing_status
    from public.external_rating_results
   where id = 1;

  if existing_status is distinct from 'verified' then
    raise exception 'Existing row changed unexpectedly: %', existing_status;
  end if;

  insert into public.external_rating_results default values
  returning verification_status into inserted_status;

  if inserted_status is distinct from 'needs_review' then
    raise exception 'New row default must be needs_review, got %', inserted_status;
  end if;

  select column_default
    into default_expression
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'external_rating_results'
     and column_name = 'verification_status';

  if default_expression not like '%needs_review%' then
    raise exception 'Column default was not updated: %', default_expression;
  end if;
end;
$$;
