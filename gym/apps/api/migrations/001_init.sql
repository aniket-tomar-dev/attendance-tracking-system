create extension if not exists pgcrypto;
create table if not exists gyms(
  id uuid primary key default gen_random_uuid(), name text not null, gym_code text unique not null,
  timezone text not null default 'Asia/Kolkata', default_country_code text not null default '+91',
  whatsapp_number text not null, created_at timestamptz not null default now());
create table if not exists owners(
  id uuid primary key default gen_random_uuid(), gym_id uuid not null references gyms(id) on delete cascade,
  name text not null, email text unique not null, phone text unique not null,
  password_hash text not null, created_at timestamptz not null default now());
create table if not exists customers(
  id uuid primary key default gen_random_uuid(), gym_id uuid not null references gyms(id) on delete cascade,
  name text not null, phone text not null, status text not null default 'active' check (status in ('active','inactive')),
  progress_token text unique not null, joined_on date not null default current_date,
  created_at timestamptz not null default now(), unique(gym_id, phone));
create table if not exists attendance(
  id uuid primary key default gen_random_uuid(), gym_id uuid not null references gyms(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade, date date not null,
  checked_in_at timestamptz not null default now(),
  source text not null default 'whatsapp' check (source in ('whatsapp','manual')), unique(customer_id, date));
create table if not exists processed_messages(whatsapp_message_id text primary key, received_at timestamptz not null default now());
create index if not exists attendance_gym_date on attendance(gym_id, date);
create index if not exists attendance_cust_date on attendance(customer_id, date);
create index if not exists customers_gym_status on customers(gym_id, status);
