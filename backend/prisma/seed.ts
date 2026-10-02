/**
 * Prisma Seed Script
 * Run with: npm run db:seed
 *
 * All users share the password "Password1!"
 * Hashes are bcrypt cost-12 — for development only.
 */

import { PrismaClient, AppointmentStatus, MessageRole } from "@prisma/client";

const prisma = new PrismaClient();

// bcrypt hash of "Password1!" — cost factor 12
// Generated offline, suitable for dev seeding only
const DEV_PASSWORD_HASH =
  "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oVoLNa6";

async function main(): Promise<void> {
  console.log("🌱 Starting seed...");

  // ── Clean existing data (order matters for FK constraints) ──
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ──────────────────────────────────────────────────
  const alice = await prisma.user.create({
    data: {
      name: "Alice Johnson",
      email: "alice@example.com",
      passwordHash: DEV_PASSWORD_HASH,
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: "Bob Smith",
      email: "bob@example.com",
      passwordHash: DEV_PASSWORD_HASH,
    },
  });

  const carol = await prisma.user.create({
    data: {
      name: "Carol White",
      email: "carol@example.com",
      passwordHash: DEV_PASSWORD_HASH,
    },
  });

  console.log(`✅ Created 3 users: alice, bob, carol`);

  // ── Appointments ───────────────────────────────────────────
  const now = new Date();

  const future3 = new Date(now);
  future3.setDate(future3.getDate() + 3);

  const future10 = new Date(now);
  future10.setDate(future10.getDate() + 10);

  const future5 = new Date(now);
  future5.setDate(future5.getDate() + 5);

  const past7 = new Date(now);
  past7.setDate(past7.getDate() - 7);

  const past2 = new Date(now);
  past2.setDate(past2.getDate() - 2);

  await prisma.appointment.createMany({
    data: [
      {
        userId: alice.id,
        appointmentDate: future3,
        appointmentTime: "10:00",
        reason: "Annual physical health check-up",
        status: AppointmentStatus.SCHEDULED,
      },
      {
        userId: alice.id,
        appointmentDate: future10,
        appointmentTime: "14:30",
        reason: "Dental cleaning and examination",
        status: AppointmentStatus.SCHEDULED,
      },
      {
        userId: bob.id,
        appointmentDate: past7,
        appointmentTime: "09:00",
        reason: "Follow-up consultation after blood test",
        status: AppointmentStatus.COMPLETED,
      },
      {
        userId: bob.id,
        appointmentDate: future5,
        appointmentTime: "11:00",
        reason: "Eye examination and prescription update",
        status: AppointmentStatus.SCHEDULED,
      },
      {
        userId: carol.id,
        appointmentDate: past2,
        appointmentTime: "15:00",
        reason: "Back pain consultation",
        status: AppointmentStatus.CANCELLED,
      },
    ],
  });

  console.log(`✅ Created 5 appointments`);

  // ── Chat Sessions ──────────────────────────────────────────
  const session1 = await prisma.chatSession.create({
    data: {
      userId: alice.id,
      title: "Booking a health check-up",
    },
  });

  const session2 = await prisma.chatSession.create({
    data: {
      userId: bob.id,
      title: "Scheduling eye exam",
    },
  });

  console.log(`✅ Created 2 chat sessions`);

  // ── Chat Messages ──────────────────────────────────────────
  await prisma.chatMessage.createMany({
    data: [
      // Session 1 — Alice
      {
        sessionId: session1.id,
        role: MessageRole.USER,
        content: "Hi, I need to book a health check-up appointment for next week.",
      },
      {
        sessionId: session1.id,
        role: MessageRole.ASSISTANT,
        content:
          "Sure! I can help you with that. What date and time works best for you next week?",
      },
      {
        sessionId: session1.id,
        role: MessageRole.USER,
        content: "How about Tuesday at 10am?",
      },
      {
        sessionId: session1.id,
        role: MessageRole.ASSISTANT,
        content:
          "Perfect! I have booked your Annual Health Check for Tuesday at 10:00 AM. You will receive a confirmation shortly.",
      },
      // Session 2 — Bob
      {
        sessionId: session2.id,
        role: MessageRole.USER,
        content: "I need to schedule an eye exam.",
      },
      {
        sessionId: session2.id,
        role: MessageRole.ASSISTANT,
        content:
          "Of course! When would you like to schedule it? I have availability this week and next.",
      },
      {
        sessionId: session2.id,
        role: MessageRole.USER,
        content: "Next Monday at 11am please.",
      },
      {
        sessionId: session2.id,
        role: MessageRole.ASSISTANT,
        content:
          "Done! Your eye examination is booked for Monday at 11:00 AM. Is there anything else I can help you with?",
      },
    ],
  });

  console.log(`✅ Created 8 chat messages`);

  // ── Summary ────────────────────────────────────────────────
  console.log(`
✅ Seed complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Users        : 3
  Appointments : 5
  Chat Sessions: 2
  Chat Messages: 8
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Login with:
  alice@example.com  / Password1!
  bob@example.com    / Password1!
  carol@example.com  / Password1!
  `);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
