-- ============================================================
-- Seed data — development / testing only
-- Passwords: all accounts use "Password1!" 
-- Hash below is a bcrypt hash (cost 12) of "Password1!"
-- DO NOT use these hashes in production
-- ============================================================

-- ── Users ─────────────────────────────────────────────────────

INSERT INTO users (id, name, email, password_hash) VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Alice Johnson',
    'alice@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oVoLNa6'
  ),
  (
    'b1ffcd00-0d1c-5fg9-cc7e-7cc0ce491b22',
    'Bob Smith',
    'bob@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oVoLNa6'
  ),
  (
    'c2ggde11-1e2d-6gh0-dd8f-8dd1df502c33',
    'Carol White',
    'carol@example.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oVoLNa6'
  )
ON CONFLICT (email) DO NOTHING;

-- ── Appointments ──────────────────────────────────────────────

INSERT INTO appointments (user_id, appointment_date, appointment_time, reason, status) VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    CURRENT_DATE + INTERVAL '3 days',
    '10:00',
    'Annual physical health check-up',
    'SCHEDULED'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    CURRENT_DATE + INTERVAL '10 days',
    '14:30',
    'Dental cleaning and examination',
    'SCHEDULED'
  ),
  (
    'b1ffcd00-0d1c-5fg9-cc7e-7cc0ce491b22',
    CURRENT_DATE - INTERVAL '7 days',
    '09:00',
    'Follow-up consultation after blood test',
    'COMPLETED'
  ),
  (
    'b1ffcd00-0d1c-5fg9-cc7e-7cc0ce491b22',
    CURRENT_DATE + INTERVAL '5 days',
    '11:00',
    'Eye examination and prescription update',
    'SCHEDULED'
  ),
  (
    'c2ggde11-1e2d-6gh0-dd8f-8dd1df502c33',
    CURRENT_DATE - INTERVAL '2 days',
    '15:00',
    'Back pain consultation',
    'CANCELLED'
  );

-- ── Chat Sessions ─────────────────────────────────────────────

INSERT INTO chat_sessions (id, user_id, title) VALUES
  (
    'd3hhef22-2f3e-7hi1-ee9g-9ee2eg613d44',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Booking a health check-up'
  ),
  (
    'e4iifg33-3g4f-8ij2-ff0h-0ff3fh724e55',
    'b1ffcd00-0d1c-5fg9-cc7e-7cc0ce491b22',
    'Scheduling eye exam'
  );

-- ── Chat Messages ─────────────────────────────────────────────

INSERT INTO chat_messages (session_id, role, content) VALUES
  -- Session 1: Alice booking a health check
  (
    'd3hhef22-2f3e-7hi1-ee9g-9ee2eg613d44',
    'USER',
    'Hi, I need to book a health check-up appointment for next week.'
  ),
  (
    'd3hhef22-2f3e-7hi1-ee9g-9ee2eg613d44',
    'ASSISTANT',
    'Sure! I can help you book that. What date and time works best for you next week?'
  ),
  (
    'd3hhef22-2f3e-7hi1-ee9g-9ee2eg613d44',
    'USER',
    'How about Tuesday at 10am?'
  ),
  (
    'd3hhef22-2f3e-7hi1-ee9g-9ee2eg613d44',
    'ASSISTANT',
    'Perfect! I have booked your Annual Health Check for Tuesday at 10:00 AM. You will receive a confirmation shortly.'
  ),
  -- Session 2: Bob scheduling eye exam
  (
    'e4iifg33-3g4f-8ij2-ff0h-0ff3fh724e55',
    'USER',
    'I need to schedule an eye exam.'
  ),
  (
    'e4iifg33-3g4f-8ij2-ff0h-0ff3fh724e55',
    'ASSISTANT',
    'Of course! When would you like to schedule it? I have availability this week and next.'
  ),
  (
    'e4iifg33-3g4f-8ij2-ff0h-0ff3fh724e55',
    'USER',
    'Next Monday at 11am please.'
  ),
  (
    'e4iifg33-3g4f-8ij2-ff0h-0ff3fh724e55',
    'ASSISTANT',
    'Done! Your eye examination is booked for Monday at 11:00 AM. Is there anything else I can help you with?'
  );
