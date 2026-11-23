CREATE TYPE booking_status AS ENUM ('confirmed', 'pending', 'cancelled');
CREATE TYPE message_channel AS ENUM ('email', 'whatsapp', 'phone', 'review');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_status AS ENUM ('new', 'answered', 'pending_review');
CREATE TYPE task_source AS ENUM ('message', 'review', 'manual');
CREATE TYPE task_status AS ENUM ('open', 'done');
CREATE TYPE review_platform AS ENUM ('google', 'booking', 'other');
CREATE TYPE review_status AS ENUM ('new', 'replied');
CREATE TYPE ai_recommendation_type AS ENUM ('pattern', 'guest_context', 'upsell', 'alert');
CREATE TYPE ai_priority AS ENUM ('low', 'medium', 'high');

create table hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

-- Tabelle: guests
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  vip_notes TEXT,
  created_at timestamp with time zone default now()
);

-- Tabelle: bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  room_type TEXT NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending'
);

-- Tabelle: messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  channel message_channel NOT NULL,
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  status message_status NOT NULL DEFAULT 'new',
  created_at timestamp with time zone default now()
);

-- Tabelle: tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source task_source NOT NULL,
  status task_status NOT NULL DEFAULT 'open',
  created_at timestamp with time zone default now()
);

-- Tabelle: reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  platform review_platform NOT NULL,
  ai_reply_draft TEXT,
  status review_status NOT NULL DEFAULT 'new',
  created_at timestamp with time zone default now()
);

-- Tabelle: ai_recommendations
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  type ai_recommendation_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority ai_priority NOT NULL,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at timestamp with time zone default now()
);