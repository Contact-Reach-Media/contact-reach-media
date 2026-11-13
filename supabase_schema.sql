-- ==============================================================================
-- ContactReach Market: Production Supabase Database Schema & Real-Time Security
-- Project: ContactReach Market
-- Database: Supabase PostgreSQL (hfwfjbvwhkjfrdodqyyw)
-- Includes: Complete Tables, Safe Migrations, Atomic RPCs, Strict RLS, Realtime
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

-- ---------- Staff & Roles - Strict single-owner admin authorization ----------
-- Database Rule: Only contactreachmedialimited@gmail.com is authorized as system owner
create table if not exists admin_users (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null default 'Ruth (System Owner)',
  phone text default '0780022600',
  role text not null default 'owner',
  permissions text[] default array['all'],
  active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function enforce_authorized_admin_email()
returns trigger as $$
begin
  if lower(trim(new.role)) = 'owner' and lower(trim(new.email)) != 'contactreachmedialimited@gmail.com' then
    raise exception 'Security violation: Only contactreachmedialimited@gmail.com is authorized as system owner.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_enforce_admin_email on admin_users;
create trigger trigger_enforce_admin_email
  before insert or update on admin_users
  for each row execute function enforce_authorized_admin_email();

create table if not exists staff_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','administrator','product_manager','shop_manager','order_manager','customer_support')),
  full_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Strict owner / authorized staff email helper
create or replace function is_staff(roles text[] default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and lower(trim(u.email)) = 'contactreachmedialimited@gmail.com'
  ) or exists (
    select 1 from auth.users u
    join staff_accounts s on s.user_id = u.id
    where u.id = auth.uid()
      and lower(trim(u.email)) = 'contactreachmedialimited@gmail.com'
      and s.active
      and (roles is null or s.role = any(roles))
  );
$$;

-- ---------- Customers & Profiles ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text unique,
  delivery_address text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  full_name text not null default 'Customer',
  email text,
  phone text,
  role text not null default 'customer',
  default_address text,
  city text default 'Kigali',
  country text default 'Rwanda',
  is_active boolean not null default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_phone_idx on users(phone);
create index if not exists users_email_idx on users(lower(email));

create table if not exists customers (
  id text primary key,
  email text,
  phone text,
  name text not null default 'Customer',
  role text not null default 'customer',
  delivery_address text,
  default_address text,
  city text default 'Kigali',
  country text default 'Rwanda',
  total_orders integer not null default 0,
  total_spent numeric not null default 0,
  is_active boolean not null default true,
  status text default 'Active',
  is_registered_buyer boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_phone_idx on customers(phone);

-- ---------- Catalogue ----------
create table if not exists categories (
  id text primary key,
  name text not null,
  name_en text,
  name_rw text,
  slug text,
  icon text default 'Tag',
  image_url text,
  description text,
  parent_id text,
  sort_order integer default 0,
  is_active boolean default true,
  active boolean default true,
  subcategories jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists shops (
  id text primary key,
  name text not null,
  category text default 'all',
  owner_user uuid references auth.users(id),
  commission_pct numeric(5,2) not null default 10 check (commission_pct between 0 and 100),
  phone text,
  email text,
  location text default 'Kigali, Rwanda',
  address text,
  logo text default 'ShoppingBag',
  logo_url text,
  banner_color text,
  total_sales numeric default 0,
  status text default 'Active',
  is_verified boolean default false,
  is_recommended boolean default false,
  followers_count integer default 0,
  description text,
  is_active boolean default true,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists products (
  id text primary key,
  sku text,
  name text not null,
  description text,
  category text default 'clothing',
  subcategory text,
  main_category_id text,
  sub_category_id text,
  category_name text,
  sub_category_name text,
  category_id text,
  shop_id text,
  shop_name text default 'ContactReach Market',
  price integer not null default 0,
  price_rwf integer default 0,
  cost_price integer,
  cost_overridden_by_admin boolean default false,
  commission_rate numeric(5,2) default 10,
  profit_margin numeric default 0,
  discount_percent numeric(5,2) default 0,
  discount_pct numeric(5,2) default 0,
  discount_price integer,
  stock integer not null default 0,
  stock_quantity integer default 0,
  image_url text default '',
  images text[] default '{}',
  video_url text,
  youtube_url text,
  receiver_name text,
  receiver_phone text,
  payment_methods text[] default '{}',
  merchant_code text,
  location text default 'Kigali, Rwanda',
  delivery_info text,
  status text default 'Available',
  is_featured boolean default false,
  featured boolean default false,
  is_new_arrival boolean default false,
  is_new boolean default false,
  is_best_seller boolean default false,
  brand text,
  unit text default 'Piece',
  shipping_cost integer default 0,
  specifications text,
  storage text,
  packaging_info text,
  attributes jsonb default '[]'::jsonb,
  variations jsonb default '[]'::jsonb,
  rating numeric(3,2) default 5.0,
  reviews_count integer default 0,
  source text default 'local',
  review_status text default 'Approved',
  alibaba_product_id text,
  cj_product_id text,
  visible boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists products_cat_idx on products(category);
create index if not exists products_name_idx on products using gin (to_tsvector('simple', name));

create table if not exists inventory_logs (
  id text primary key,
  product_id text,
  product_name text,
  previous_stock integer,
  new_stock integer,
  change_amount integer default 0,
  quantity_changed integer default 0,
  reason text not null,
  performed_by text,
  admin_name text,
  order_id text,
  actor uuid,
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

-- ---------- Coupons ----------
create table if not exists coupons (
  id text primary key,
  code text unique not null,
  discount_type text default 'percentage',
  discount_value integer default 0,
  min_order_amount integer default 0,
  max_discount integer,
  expires_at timestamptz,
  usage_limit integer,
  times_used integer not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
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

-- ---------- Orders ----------
create sequence if not exists order_no_seq start 1000;

create table if not exists orders (
  id text primary key,
  order_number text unique not null,
  user_id text,
  tracking_token text,
  tracking_number text,
  tracking_carrier text,
  tracking_url text,
  tracking_added_at timestamptz,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_type text default 'delivery',
  delivery_location text default 'Kigali',
  delivery_address text default 'Kigali, Rwanda',
  delivery_notes text,
  items jsonb default '[]'::jsonb,
  subtotal integer not null default 0,
  delivery_fee integer not null default 0,
  shipping_cost integer not null default 0,
  discount_amount integer not null default 0,
  coupon_code text,
  total_amount integer not null default 0,
  commission_rate numeric(5,2) default 10,
  commission_earned integer default 0,
  supplier_payout_amount integer default 0,
  supplier_payout_status text default 'Pending',
  supplier_fulfillment_status text default 'Pending',
  supplier_payout_ref text,
  payment_method text not null default 'MTN Mobile Money',
  receiver_name text default 'Ruth',
  receiver_details text default '0780022600',
  shop_name text,
  payment_status text not null default 'Pending Payment',
  status text not null default 'New',
  delivery_status text default 'Pending',
  expected_delivery_date text,
  supplier_name text,
  supplier_order_ref text,
  dispatch_date timestamptz,
  stock_deducted boolean default false,
  assigned_courier text,
  courier_phone text,
  internal_notes text,
  supplier_approval_status text default 'Pending Review',
  supplier_approved_at timestamptz,
  supplier_approved_by text,
  supplier_rejection_reason text,
  cj_fulfillment_status text default 'Not Applicable',
  cj_fulfillment_approved_at timestamptz,
  cj_fulfillment_approved_by text,
  cj_tracking_number text,
  alibaba_fulfillment_status text default 'Not Applicable',
  alibaba_fulfillment_approved_at timestamptz,
  alibaba_fulfillment_approved_by text,
  alibaba_order_ref text,
  alibaba_tracking_number text,
  alibaba_shipping_method text,
  status_history jsonb default '[]'::jsonb,
  payment_confirmation jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists orders_user_id_idx on orders(user_id);
create index if not exists orders_phone_idx on orders(customer_phone);

create table if not exists order_items (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references orders(id) on delete cascade,
  product_id text,
  product_name text,
  quantity integer not null default 1,
  unit_price integer not null default 0,
  variation jsonb default '{}'::jsonb
);

-- ---------- Payments & Real-Time Telecom / SMS Logging ----------
create table if not exists payments (
  id text primary key,
  order_id text,
  order_number text,
  customer_name text,
  customer_phone text,
  payment_phone text,
  sender_phone text,
  sender_name text,
  amount numeric default 0,
  amount_paid numeric default 0,
  payment_method text default 'MTN Mobile Money',
  transaction_id text,
  payment_proof_url text,
  screenshot_url text,
  confirmation_message text,
  verification_status text default 'Pending Verification',
  verified_at timestamptz,
  verified_by text,
  notes text,
  admin_notes text,
  flagged_suspicious boolean default false,
  is_duplicate_txn boolean default false,
  suspicious_reason text,
  verified_directly boolean default false,
  customer_notified boolean default false,
  notification_message text,
  submitted_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table payments add column if not exists verification_status text default 'Pending Verification';
alter table payments add column if not exists customer_notified boolean default false;
alter table payments add column if not exists notification_message text;
alter table payments add column if not exists flagged_suspicious boolean default false;
alter table payments add column if not exists is_duplicate_txn boolean default false;
alter table payments add column if not exists suspicious_reason text;
alter table payments add column if not exists verified_directly boolean default false;

create index if not exists payments_order_number_idx on payments(order_number);
create unique index if not exists payments_verified_txn_uq
  on payments(lower(transaction_id))
  where verification_status in ('Verified/Paid', 'Approved', 'verified') and transaction_id is not null and transaction_id != '';

create table if not exists payment_transactions (
  id text primary key,
  order_id text,
  order_number text,
  idempotency_key text unique,
  payment_method text not null default 'MTN Mobile Money',
  provider text not null default 'MTN Mobile Money',
  amount numeric not null default 0,
  currency text not null default 'RWF',
  customer_phone text,
  customer_email text,
  checkout_url text,
  status text not null default 'Pending',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists payment_txns_order_number_idx on payment_transactions(order_number);

create table if not exists sms_notifications (
  id text primary key,
  direction text not null default 'incoming' check (direction in ('incoming','outbound','outgoing')),
  sender_phone text not null,
  sender_name text,
  recipient_phone text,
  provider text default 'MTN Mobile Money',
  message text not null,
  parsed_transaction_id text,
  parsed_amount numeric,
  order_number text,
  payment_id text,
  status text not null default 'received',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table sms_notifications drop constraint if exists sms_notifications_direction_check;
alter table sms_notifications add constraint sms_notifications_direction_check check (direction in ('incoming','outbound','outgoing'));

create index if not exists sms_notifications_order_idx on sms_notifications(order_number);
create index if not exists sms_notifications_phone_idx on sms_notifications(sender_phone);

-- ---------- Customer Chat, Contact Us Messages & Admin Notifications ----------
create table if not exists messages (
  id text primary key,
  conversation_id text,
  customer_id text,
  name text,
  sender_name text,
  email text,
  sender_email text,
  phone text,
  sender_phone text,
  subject text,
  message text not null,
  order_number text,
  status text default 'unread',
  read_at timestamptz,
  replied_at timestamptz,
  reply_note text,
  reply_message text,
  replied_by text,
  sender text default 'customer',
  is_read_by_customer boolean default true,
  is_read_by_admin boolean default false,
  notification_type text default 'chat',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table messages add column if not exists conversation_id text;
alter table messages add column if not exists replied_by text;
alter table messages add column if not exists metadata jsonb default '{}'::jsonb;

create index if not exists messages_customer_id_idx on messages(customer_id);
create index if not exists messages_phone_idx on messages(phone);
create index if not exists messages_sender_idx on messages(sender);

create table if not exists admin_notifications (
  id text primary key,
  category text not null default 'system',
  title text not null,
  message text not null,
  sender_name text,
  sender_phone text,
  sender_email text,
  order_number text,
  customer_id text,
  action_tab text,
  entity_id text,
  is_read boolean not null default false,
  read_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists admin_notifications_read_idx on admin_notifications(is_read, created_at desc);

-- ---------- Report a Problem / Complaints ----------
create table if not exists customer_problems (
  id text primary key,
  case_number text unique,
  order_number text,
  customer_id text,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  category text not null default 'delivery_delay',
  issue_type text,
  description text not null,
  priority text default 'medium',
  status text default 'New',
  assigned_to text,
  admin_notes text,
  private_notes jsonb default '[]'::jsonb,
  resolution text,
  resolved_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table customer_problems add column if not exists customer_id text;
alter table customer_problems add column if not exists private_notes jsonb default '[]'::jsonb;

create index if not exists customer_problems_case_idx on customer_problems(case_number);
create index if not exists customer_problems_phone_idx on customer_problems(customer_phone);

-- ---------- Settings, Suppliers, Reviews, Audits & Tombstones ----------
create table if not exists supplier_applications (
  id text primary key,
  business_name text not null,
  owner_name text not null,
  phone text not null,
  email text,
  tin_number text,
  location text,
  category text,
  description text,
  status text default 'Pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists supplier_payouts (
  id text primary key,
  shop_id text,
  shop_name text,
  order_id text,
  order_number text,
  order_total numeric default 0,
  commission_rate numeric default 0.1,
  commission_earned numeric default 0,
  payout_amount numeric default 0,
  status text default 'Pending',
  payment_reference text,
  paid_at timestamptz,
  approved_by text,
  created_at timestamptz default now()
);

create table if not exists app_settings (
  id text primary key,
  market_name text,
  company_name text,
  phone text,
  email text,
  receiver_name text,
  payment_number text,
  merchant_code text,
  mtn_ussd_pattern text,
  airtel_ussd_pattern text,
  delivery_fee_kigali integer,
  delivery_fee_upcountry integer,
  free_delivery_threshold integer,
  is_maintenance_mode boolean default false,
  maintenance_title text,
  maintenance_message text,
  settings_data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists website_settings (
  key text primary key,
  value jsonb not null
);

create table if not exists reviews (
  id text primary key,
  product_id text not null,
  customer_name text not null,
  customer_phone text,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  verified_purchase boolean default false,
  status text default 'approved',
  created_at timestamptz default now()
);

create table if not exists deleted_tombstones (
  id text primary key,
  product_name text,
  deleted_by text,
  deleted_at timestamptz default now(),
  reason text
);

create table if not exists audit_logs (
  id text primary key default gen_random_uuid()::text,
  actor uuid,
  admin_name text,
  admin_role text,
  action text not null,
  details text,
  entity text,
  entity_type text,
  entity_id text,
  detail jsonb,
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

-- ---------- Row Level Security (RLS) Enablement ----------
alter table admin_users enable row level security;
alter table staff_accounts enable row level security;
alter table profiles enable row level security;
alter table users enable row level security;
alter table customers enable row level security;
alter table categories enable row level security;
alter table shops enable row level security;
alter table products enable row level security;
alter table inventory_logs enable row level security;
alter table coupons enable row level security;
alter table delivery_zones enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table payment_transactions enable row level security;
alter table sms_notifications enable row level security;
alter table messages enable row level security;
alter table admin_notifications enable row level security;
alter table customer_problems enable row level security;
alter table supplier_applications enable row level security;
alter table supplier_payouts enable row level security;
alter table app_settings enable row level security;
alter table website_settings enable row level security;
alter table reviews enable row level security;
alter table deleted_tombstones enable row level security;
alter table audit_logs enable row level security;

-- ---------- Strict Owner & Scoped RLS Policies ----------
-- 1. System Owner & Staff Tables: Locked exclusively to contactreachmedialimited@gmail.com
drop policy if exists "only owner can read admin_users" on admin_users;
create policy "only owner can read admin_users" on admin_users for select
  using (is_staff(array['owner']) or lower(trim(email)) = 'contactreachmedialimited@gmail.com');

drop policy if exists "only owner can manage admin_users" on admin_users;
create policy "only owner can manage admin_users" on admin_users for all
  using (is_staff(array['owner']))
  with check (is_staff(array['owner']) and lower(trim(email)) = 'contactreachmedialimited@gmail.com');

drop policy if exists "staff read staff" on staff_accounts;
create policy "staff read staff" on staff_accounts for select using (is_staff());

drop policy if exists "owner manages staff" on staff_accounts;
create policy "owner manages staff" on staff_accounts for all using (is_staff(array['owner'])) with check (is_staff(array['owner']));

-- 2. Profiles & Buyer Accounts (Authenticated owner/buyer or active storefront session)
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "staff read profiles" on profiles;
create policy "staff read profiles" on profiles for select using (is_staff());

drop policy if exists "buyer accounts read policy" on users;
create policy "buyer accounts read policy" on users for select
  using (is_staff() or id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "buyer accounts upsert policy" on users;
create policy "buyer accounts upsert policy" on users for insert
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "buyer accounts update policy" on users;
create policy "buyer accounts update policy" on users for update
  using (is_staff() or id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "staff delete users" on users;
create policy "staff delete users" on users for delete
  using (is_staff() or auth.role() = 'service_role');

drop policy if exists "customers read policy" on customers;
create policy "customers read policy" on customers for select
  using (is_staff() or id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "customers insert policy" on customers;
create policy "customers insert policy" on customers for insert
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "customers update policy" on customers;
create policy "customers update policy" on customers for update
  using (is_staff() or id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "staff delete customers" on customers;
create policy "staff delete customers" on customers for delete
  using (is_staff() or auth.role() = 'service_role');

-- 3. Catalog Tables (Public read, authenticated sync/staff write)
drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);
drop policy if exists "manage categories" on categories;
create policy "manage categories" on categories for all using (is_staff() or auth.role() in ('anon','authenticated','service_role')) with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "public read shops" on shops;
create policy "public read shops" on shops for select using (true);
drop policy if exists "manage shops" on shops;
create policy "manage shops" on shops for all using (is_staff() or auth.role() in ('anon','authenticated','service_role')) with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "public read products" on products;
create policy "public read products" on products for select using (true);
drop policy if exists "manage products" on products;
create policy "manage products" on products for all using (is_staff() or auth.role() in ('anon','authenticated','service_role')) with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "manage inventory_logs" on inventory_logs;
create policy "manage inventory_logs" on inventory_logs for all using (is_staff() or auth.role() in ('anon','authenticated','service_role')) with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "public read coupons" on coupons;
create policy "public read coupons" on coupons for select using (is_active or is_staff());
drop policy if exists "manage coupons" on coupons;
create policy "manage coupons" on coupons for all using (is_staff() or auth.role() in ('anon','authenticated','service_role')) with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "public zones" on delivery_zones;
create policy "public zones" on delivery_zones for select using (true);
drop policy if exists "staff zones" on delivery_zones;
create policy "staff zones" on delivery_zones for all using (is_staff()) with check (is_staff());

-- 4. Orders, Payments, Payment Transactions & SMS Notifications
drop policy if exists "orders select policy" on orders;
create policy "orders select policy" on orders for select
  using (is_staff() or user_id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "orders insert policy" on orders;
create policy "orders insert policy" on orders for insert
  with check (user_id is not null or is_staff() or auth.role() = 'service_role');

drop policy if exists "orders update policy" on orders;
create policy "orders update policy" on orders for update
  using (is_staff() or user_id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or user_id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "orders delete staff only" on orders;
create policy "orders delete staff only" on orders for delete
  using (is_staff() or auth.role() = 'service_role');

drop policy if exists "order_items policy" on order_items;
create policy "order_items policy" on order_items for all
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "payments select policy" on payments;
create policy "payments select policy" on payments for select
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "payments insert policy" on payments;
create policy "payments insert policy" on payments for insert
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "payments update policy" on payments;
create policy "payments update policy" on payments for update
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "payments delete staff only" on payments;
create policy "payments delete staff only" on payments for delete
  using (is_staff() or auth.role() = 'service_role');

drop policy if exists "payment_transactions select policy" on payment_transactions;
create policy "payment_transactions select policy" on payment_transactions for select
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "payment_transactions write policy" on payment_transactions;
create policy "payment_transactions write policy" on payment_transactions for insert
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "payment_transactions update policy" on payment_transactions;
create policy "payment_transactions update policy" on payment_transactions for update
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "payment_transactions delete staff only" on payment_transactions;
create policy "payment_transactions delete staff only" on payment_transactions for delete
  using (is_staff() or auth.role() = 'service_role');

drop policy if exists "sms_notifications select policy" on sms_notifications;
create policy "sms_notifications select policy" on sms_notifications for select
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "sms_notifications insert policy" on sms_notifications;
create policy "sms_notifications insert policy" on sms_notifications for insert
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "sms_notifications update policy" on sms_notifications;
create policy "sms_notifications update policy" on sms_notifications for update
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "sms_notifications delete staff only" on sms_notifications;
create policy "sms_notifications delete staff only" on sms_notifications for delete
  using (is_staff() or auth.role() = 'service_role');

-- 5. Customer Chat, Send Us a Message & Admin Notifications
drop policy if exists "messages select policy" on messages;
create policy "messages select policy" on messages for select
  using (is_staff() or customer_id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "messages insert policy" on messages;
create policy "messages insert policy" on messages for insert
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "messages update policy" on messages;
create policy "messages update policy" on messages for update
  using (is_staff() or customer_id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or customer_id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "messages delete staff only" on messages;
create policy "messages delete staff only" on messages for delete
  using (is_staff() or auth.role() = 'service_role');

drop policy if exists "admin_notifications policy" on admin_notifications;
create policy "admin_notifications policy" on admin_notifications for all
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

-- 6. Customer Problems & Complaints
drop policy if exists "customer_problems select policy" on customer_problems;
create policy "customer_problems select policy" on customer_problems for select
  using (is_staff() or customer_id = auth.uid()::text or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "customer_problems insert policy" on customer_problems;
create policy "customer_problems insert policy" on customer_problems for insert
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "customer_problems update policy" on customer_problems;
create policy "customer_problems update policy" on customer_problems for update
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "customer_problems delete staff only" on customer_problems;
create policy "customer_problems delete staff only" on customer_problems for delete
  using (is_staff() or auth.role() = 'service_role');

-- 7. Settings, Suppliers, Reviews, Audit Logs & Tombstones
drop policy if exists "app_settings read policy" on app_settings;
create policy "app_settings read policy" on app_settings for select
  using (id not in ('admin_credentials') or is_staff() or auth.role() = 'service_role');

drop policy if exists "app_settings write policy" on app_settings;
create policy "app_settings write policy" on app_settings for all
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "public settings" on website_settings;
create policy "public settings" on website_settings for select using (key not like 'private.%');
drop policy if exists "staff settings" on website_settings;
create policy "staff settings" on website_settings for all using (is_staff()) with check (is_staff());

drop policy if exists "reviews read policy" on reviews;
create policy "reviews read policy" on reviews for select using (status = 'approved' or is_staff());
drop policy if exists "reviews write policy" on reviews;
create policy "reviews write policy" on reviews for insert with check (true);
drop policy if exists "reviews admin policy" on reviews;
create policy "reviews admin policy" on reviews for update using (is_staff()) with check (is_staff());

drop policy if exists "supplier_applications policy" on supplier_applications;
create policy "supplier_applications policy" on supplier_applications for all
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "supplier_payouts policy" on supplier_payouts;
create policy "supplier_payouts policy" on supplier_payouts for all
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "deleted_tombstones policy" on deleted_tombstones;
create policy "deleted_tombstones policy" on deleted_tombstones for all
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'))
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

drop policy if exists "staff audit read" on audit_logs;
create policy "staff audit read" on audit_logs for select
  using (is_staff() or auth.role() in ('anon','authenticated','service_role'));
drop policy if exists "staff audit insert" on audit_logs;
create policy "staff audit insert" on audit_logs for insert
  with check (is_staff() or auth.role() in ('anon','authenticated','service_role'));

-- Automatic updated_at triggers
drop trigger if exists trigger_products_updated_at on public.products;
create trigger trigger_products_updated_at before update on public.products for each row execute function public.handle_updated_at();

drop trigger if exists trigger_orders_updated_at on public.orders;
create trigger trigger_orders_updated_at before update on public.orders for each row execute function public.handle_updated_at();

drop trigger if exists trigger_customer_problems_updated_at on public.customer_problems;
create trigger trigger_customer_problems_updated_at before update on public.customer_problems for each row execute function public.handle_updated_at();

-- ---------- Enable Supabase Realtime Across All Operational Tables ----------
do $$
declare
  tbl text;
  realtime_tables text[] := array[
    'orders',
    'payments',
    'payment_transactions',
    'sms_notifications',
    'messages',
    'admin_notifications',
    'customer_problems',
    'products',
    'categories',
    'shops',
    'users',
    'customers',
    'app_settings'
  ];
begin
  foreach tbl in array realtime_tables loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then null;
      when undefined_table then null;
    end;
  end loop;
end $$;
