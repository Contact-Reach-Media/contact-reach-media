-- ==============================================================================
-- ContactReach Market: Production Supabase Database Schema
-- Project: ContactReach Market
-- Database: Supabase PostgreSQL (hfwfjbvwhkjfrdodqyyw)
-- Includes: Core Schema, Atomic Order & Payment Functions, Idempotent RLS Policies
-- ==============================================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Helper function to automatically update updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- ---------- Staff & roles ----------
create table if not exists staff_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','administrator','product_manager','shop_manager','order_manager','customer_support')),
  full_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function is_staff(roles text[] default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff_accounts s
    where s.user_id = auth.uid() and s.active
      and (roles is null or s.role = any(roles)));
$$;

-- ---------- Customers & Profiles ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text unique,
  delivery_address text,
  created_at timestamptz not null default now()
);

-- ---------- Catalogue ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  parent_id uuid references categories(id),
  active boolean default true
);

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user uuid references auth.users(id),
  commission_pct numeric(5,2) not null default 10 check (commission_pct between 0 and 100),
  active boolean default true
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  description text,
  category_id uuid references categories(id),
  shop_id uuid references shops(id),
  price_rwf integer not null check (price_rwf >= 0),
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 100),
  stock integer not null default 0 check (stock >= 0),
  images text[] default '{}',
  variations jsonb default '{}',
  featured boolean default false,
  is_new boolean default false,
  visible boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists products_cat_idx on products(category_id);
create index if not exists products_name_idx on products using gin (to_tsvector('simple', name));

create table if not exists inventory_logs (
  id bigserial primary key,
  product_id uuid not null references products(id),
  change integer not null,
  reason text not null,
  order_id uuid,
  actor uuid,
  created_at timestamptz default now()
);

-- ---------- Coupons ----------
create table if not exists coupons (
  code text primary key,
  kind text not null check (kind in ('percent','fixed')),
  value integer not null check (value > 0),
  min_purchase_rwf integer default 0,
  expires_at timestamptz,
  usage_limit integer,
  used_count integer not null default 0,
  active boolean default true
);

-- ---------- Delivery zones ----------
create table if not exists delivery_zones (
  name text primary key,
  fee_rwf integer not null check (fee_rwf >= 0),
  eta text,
  active boolean default true
);

insert into delivery_zones(name, fee_rwf, eta) values
 ('Gasabo', 1500, 'Same Day / Next Day'),
 ('Nyarugenge', 1500, 'Same Day / Next Day'),
 ('Kicukiro', 1500, 'Same Day / Next Day'),
 ('Kigali Express', 2500, '2-4 Hours'),
 ('Outside Kigali', 3500, '1-2 Days'),
 ('Store Pickup', 0, 'Instant at Office')
on conflict (name) do nothing;

-- ---------- Orders & payments ----------
create sequence if not exists order_no_seq start 1000;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null default ('CR-' || nextval('order_no_seq')),
  user_id uuid references auth.users(id),
  customer_name text not null,
  phone text not null,
  email text,
  zone text references delivery_zones(name),
  address text,
  instructions text,
  subtotal_rwf integer not null,
  discount_rwf integer not null default 0,
  delivery_fee_rwf integer not null default 0,
  total_rwf integer not null,
  coupon_code text,
  payment_method text not null,
  payment_status text not null default 'awaiting_payment' check (payment_status in
    ('awaiting_payment','submitted','under_verification','verified','rejected','failed','refunded','partially_refunded')),
  status text not null default 'new' check (status in
    ('new','awaiting_payment','payment_submitted','payment_verified','confirmed','preparing',
     'ready_for_delivery','dispatched','out_for_delivery','delivered','completed','cancelled','returned','refunded')),
  tracking_ref text,
  idempotency_key text unique,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  qty integer not null check (qty > 0),
  unit_price_rwf integer not null,
  variation jsonb default '{}'
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  transaction_id text,
  payer_phone text,
  amount_rwf integer,
  paid_on date,
  sms_text text,
  evidence_paths text[] default '{}',
  status text not null default 'submitted' check (status in ('submitted','under_verification','verified','rejected')),
  reject_reason text,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- Unique index: A transaction reference can only ever be verified once
create unique index if not exists payments_verified_txn_uq
  on payments(lower(transaction_id)) where status = 'verified' and transaction_id is not null;

create table if not exists website_settings (
  key text primary key,
  value jsonb not null
);

create table if not exists audit_logs (
  id bigserial primary key,
  actor uuid,
  action text not null,
  entity text,
  entity_id text,
  detail jsonb,
  created_at timestamptz default now()
);

-- ---------- Server-side order placement (prices never come from the browser) ----------
create or replace function place_order(
  p_items jsonb,            -- [{"product_id":"...","qty":2}]
  p_name text,
  p_phone text,
  p_email text,
  p_zone text,
  p_address text,
  p_instructions text,
  p_method text,
  p_coupon text default null,
  p_idem text default null
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  it jsonb;
  prod products;
  sub int := 0;
  disc int := 0;
  fee int := 0;
  c coupons;
  o orders;
begin
  if p_idem is not null then
    select * into o from orders where idempotency_key = p_idem;
    if found then return o; end if;
  end if;

  select fee_rwf into fee from delivery_zones where name = p_zone and active;
  if fee is null then
    fee := 1500; -- default Kigali delivery fee fallback
  end if;

  insert into orders(user_id, customer_name, phone, email, zone, address, instructions,
    subtotal_rwf, total_rwf, payment_method, idempotency_key, status)
  values (auth.uid(), p_name, p_phone, p_email, p_zone, p_address, p_instructions,
    0, 0, p_method, p_idem, 'awaiting_payment') returning * into o;

  for it in select * from jsonb_array_elements(p_items) loop
    if (it->>'qty')::int <= 0 then raise exception 'Invalid quantity'; end if;
    -- atomic stock decrement: fails if not enough stock (no overselling)
    update products set stock = stock - (it->>'qty')::int, updated_at = now()
      where id = (it->>'product_id')::uuid and visible and stock >= (it->>'qty')::int
      returning * into prod;
    if not found then raise exception 'Product unavailable or insufficient stock'; end if;

    insert into order_items(order_id, product_id, qty, unit_price_rwf)
      values (o.id, prod.id, (it->>'qty')::int,
              round(prod.price_rwf * (1 - prod.discount_pct/100)));

    insert into inventory_logs(product_id, change, reason, order_id, actor)
      values (prod.id, -(it->>'qty')::int, 'order', o.id, auth.uid());

    sub := sub + round(prod.price_rwf * (1 - prod.discount_pct/100))::int * (it->>'qty')::int;
  end loop;

  if p_coupon is not null then
    select * into c from coupons where code = upper(p_coupon) and active
      and (expires_at is null or expires_at > now())
      and (usage_limit is null or used_count < usage_limit)
      and sub >= coalesce(min_purchase_rwf,0) for update;
    if found then
      disc := case c.kind when 'percent' then sub * c.value / 100 else least(c.value, sub) end;
      update coupons set used_count = used_count + 1 where code = c.code;
      update orders set coupon_code = c.code where id = o.id;
    end if;
  end if;

  update orders set subtotal_rwf = sub, discount_rwf = disc, delivery_fee_rwf = fee,
    total_rwf = sub - disc + fee where id = o.id returning * into o;
  return o;
end $$;

-- ---------- Customer submits payment evidence (does NOT verify) ----------
create or replace function submit_payment(
  p_order uuid,
  p_txn text,
  p_phone text,
  p_amount int,
  p_date date,
  p_sms text,
  p_paths text[] default '{}'
) returns payments
language plpgsql security definer set search_path = public as $$
declare
  pay payments;
begin
  if not exists (select 1 from orders where id = p_order and (user_id = auth.uid() or auth.uid() is null or user_id is null)) then
    raise exception 'Not your order';
  end if;

  insert into payments(order_id, transaction_id, payer_phone, amount_rwf, paid_on, sms_text, evidence_paths)
    values (p_order, p_txn, p_phone, p_amount, p_date, p_sms, coalesce(p_paths,'{}')) returning * into pay;

  update orders set payment_status = 'submitted', status = 'payment_submitted' where id = p_order;
  return pay;
end $$;

-- ---------- Staff verify / reject payment ----------
create or replace function review_payment(
  p_payment uuid,
  p_approve boolean,
  p_reason text default null
) returns payments
language plpgsql security definer set search_path = public as $$
declare
  pay payments;
begin
  if not is_staff(array['owner','administrator','order_manager']) then
    raise exception 'Not authorised';
  end if;

  update payments set status = case when p_approve then 'verified' else 'rejected' end,
    reject_reason = p_reason, verified_by = auth.uid(), verified_at = now()
    where id = p_payment returning * into pay;

  update orders set
    payment_status = case when p_approve then 'verified' else 'rejected' end,
    status = case when p_approve then 'payment_verified' else 'awaiting_payment' end
    where id = pay.order_id;

  insert into audit_logs(actor, action, entity, entity_id, detail)
    values (auth.uid(), case when p_approve then 'payment_verified' else 'payment_rejected' end,
            'payment', p_payment::text, jsonb_build_object('reason', p_reason));

  return pay;
end $$;

-- ---------- Row Level Security Configuration ----------
alter table staff_accounts enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table shops enable row level security;
alter table products enable row level security;
alter table inventory_logs enable row level security;
alter table coupons enable row level security;
alter table delivery_zones enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table website_settings enable row level security;
alter table audit_logs enable row level security;

-- Idempotent RLS Policies (Safe to run repeatedly)
drop policy if exists "staff read staff" on staff_accounts;
create policy "staff read staff" on staff_accounts for select using (is_staff(array['owner','administrator']));

drop policy if exists "owner manages staff" on staff_accounts;
create policy "owner manages staff" on staff_accounts for all using (is_staff(array['owner'])) with check (is_staff(array['owner']));

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "staff read profiles" on profiles;
create policy "staff read profiles" on profiles for select using (is_staff());

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (active or is_staff());

drop policy if exists "public read shops" on shops;
create policy "public read shops" on shops for select using (active or is_staff());

drop policy if exists "public read products" on products;
create policy "public read products" on products for select using (visible or is_staff());

drop policy if exists "staff write categories" on categories;
create policy "staff write categories" on categories for all using (is_staff(array['owner','administrator','product_manager'])) with check (is_staff(array['owner','administrator','product_manager']));

drop policy if exists "staff write shops" on shops;
create policy "staff write shops" on shops for all using (is_staff(array['owner','administrator','shop_manager'])) with check (is_staff(array['owner','administrator','shop_manager']));

drop policy if exists "staff write products" on products;
create policy "staff write products" on products for all using (is_staff(array['owner','administrator','product_manager','shop_manager'])) with check (is_staff(array['owner','administrator','product_manager','shop_manager']));

drop policy if exists "staff inventory logs" on inventory_logs;
create policy "staff inventory logs" on inventory_logs for select using (is_staff());

drop policy if exists "staff coupons" on coupons;
create policy "staff coupons" on coupons for all using (is_staff(array['owner','administrator'])) with check (is_staff(array['owner','administrator']));

drop policy if exists "public zones" on delivery_zones;
create policy "public zones" on delivery_zones for select using (true);

drop policy if exists "staff zones" on delivery_zones;
create policy "staff zones" on delivery_zones for all using (is_staff(array['owner','administrator'])) with check (is_staff(array['owner','administrator']));

drop policy if exists "own orders" on orders;
create policy "own orders" on orders for select using (user_id = auth.uid());

drop policy if exists "staff orders read" on orders;
create policy "staff orders read" on orders for select using (is_staff());

drop policy if exists "staff orders update" on orders;
create policy "staff orders update" on orders for update using (is_staff(array['owner','administrator','order_manager'])) with check (is_staff(array['owner','administrator','order_manager']));

drop policy if exists "own order items" on order_items;
create policy "own order items" on order_items for select using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "staff order items" on order_items;
create policy "staff order items" on order_items for select using (is_staff());

drop policy if exists "own payments" on payments;
create policy "own payments" on payments for select using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "staff payments" on payments;
create policy "staff payments" on payments for select using (is_staff());

drop policy if exists "public settings" on website_settings;
create policy "public settings" on website_settings for select using (key not like 'private.%');

drop policy if exists "staff settings" on website_settings;
create policy "staff settings" on website_settings for all using (is_staff(array['owner','administrator'])) with check (is_staff(array['owner','administrator']));

drop policy if exists "staff audit read" on audit_logs;
create policy "staff audit read" on audit_logs for select using (is_staff(array['owner','administrator']));

-- Grant execute on place_order to allow customer and guest order placement
grant execute on function place_order to anon, authenticated;
grant execute on function submit_payment to anon, authenticated;
revoke execute on function review_payment from anon;

-- Automatic updated_at trigger on products
drop trigger if exists trigger_products_updated_at on public.products;
create trigger trigger_products_updated_at before update on public.products for each row execute function public.handle_updated_at();
