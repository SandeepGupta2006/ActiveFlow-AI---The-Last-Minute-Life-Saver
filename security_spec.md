# ActiveFlow AI - Security Specification

This document outlines the security invariants, the "Dirty Dozen" rogue payloads, and the validation criteria that our security rules must satisfy to guarantee a Zero-Trust Firestore database configuration.

## 1. Data Invariants

1. **User Ownership (Strict Isolation)**: A user can only read and write their own profile (`/users/{userId}`), tasks (`/tasks/{taskId}`), plans (`/plans/{planId}`), and chat sessions (`/chats/{chatId}`). No user can ever see or modify another user's data.
2. **Identity Integrity**: The `userId` field inside any written document must strictly match the authenticated user's UID (`request.auth.uid`).
3. **Temporal Integrity**: Fields like `createdAt` must be immutable after creation, and `createdAt` / `updatedAt` must be verified using the true server-side timestamp (`request.time`).
4. **Data Type and Size Safety**: All fields must conform to their expected types, with string fields bounded by maximum lengths to prevent denial-of-wallet storage attacks.
5. **ID Path Variable Hardening**: All target document IDs must be verified using clean regex formats (`^[a-zA-Z0-9_\-]+$`) to block path poisoning or malicious string injections.

---

## 2. The "Dirty Dozen" Rogue Payloads

The following 12 payloads represent malicious attempts to bypass identity, structure, or state checks. Our security rules are designed to block all of them (`PERMISSION_DENIED`).

### Pillar 1: Identity Spoofing & Isolation Bypasses
1. **Payload 1: Impersonate Owner on Create (Task Collection)**
   - *Rogue Payload*: `{ "userId": "attacker_uid", "goal": "Malicious task", "status": "pending" }` sent by authenticated user `victim_uid`.
   - *Violation*: Attacker attempts to write a task claiming it belongs to someone else or to inject tasks into another user's queue.

2. **Payload 2: Read Another User's Task**
   - *Rogue Query*: Accessing `/tasks/victim_task_1` where `resource.data.userId == "victim_uid"` from authenticated user `attacker_uid`.
   - *Violation*: Unauthorized data harvesting.

3. **Payload 3: Session Hijacking (Chat Session)**
   - *Rogue Payload*: `{ "userId": "victim_uid", "messages": [] }` written to `/chats/hijacked_session` by `attacker_uid`.
   - *Violation*: Tampering with or reading another user's chat history.

### Pillar 2: Schema & Type Poisoning
4. **Payload 4: Denial-of-Wallet String Flooding**
   - *Rogue Payload*: `{ "userId": "user_uid", "goal": "[A 5MB string of junk characters]", "status": "pending" }`
   - *Violation*: Exhausts firestore storage resources and inflates user billing.
   - *Mitigation*: Strictly enforce `.size() <= 200` on text fields.

5. **Payload 5: Malicious Type Substitution**
   - *Rogue Payload*: `{ "userId": "user_uid", "goal": 12345, "status": "pending" }` (goal is a number instead of string).
   - *Violation*: System crash or backend script failure due to unexpected type.
   - *Mitigation*: `data.goal is string`.

6. **Payload 6: Ghost Field Injection (Shadow Update)**
   - *Rogue Payload*: `{ "userId": "user_uid", "goal": "My Goal", "status": "pending", "isAdmin": true, "vipStatus": "active" }`
   - *Violation*: Injecting unmodeled fields to bypass privilege logic or compromise backend processing.
   - *Mitigation*: Enforce exact keys via `data.keys().hasAll(...) && data.keys().size() == N` and `affectedKeys().hasOnly(...)`.

### Pillar 3: Temporal & Timestamp Tampering
7. **Payload 7: Spoofed Client Creation Time**
   - *Rogue Payload*: `{ "userId": "user_uid", "goal": "Task", "status": "pending", "createdAt": "2020-01-01T00:00:00Z" }`
   - *Violation*: Client forces a fake past timestamp to bypass deadline calculation or sorting.
   - *Mitigation*: Force `incoming().createdAt == request.time`.

8. **Payload 8: Retroactive Update Modification**
   - *Rogue Payload*: `{ "userId": "user_uid", "goal": "Task", "status": "pending", "createdAt": "2026-01-01T00:00:00Z", "updatedAt": "2021-01-01T00:00:00Z" }`
   - *Violation*: Client provides a custom `updatedAt` to confuse syncing layers.
   - *Mitigation*: Force `incoming().updatedAt == request.time`.

### Pillar 4: State Shortcutting & Immortality Bypasses
9. **Payload 9: Modifying Immutable Creation Fields**
   - *Rogue Payload*: Update payload attempting to change `createdAt` or `userId`.
   - *Violation*: Modifying foundational fields after document initialization.
   - *Mitigation*: `incoming().createdAt == existing().createdAt` and `incoming().userId == existing().userId`.

10. **Payload 10: Invalid State Leap**
    - *Rogue Payload*: Set a task status to a fake status: `{ "userId": "user_uid", "goal": "Task", "status": "critical_hack" }`.
    - *Violation*: Breaking finite state machine definitions.
    - *Mitigation*: Enforce `status in ['pending', 'completed']`.

### Pillar 5: Path Variable & ID Poisoning
11. **Payload 11: Path Variable Poisoning**
    - *Rogue Path*: Writing to `/tasks/task$$$malicious$$$percent20` or injecting special command characters in path.
    - *Violation*: Document ID injection or traversal.
    - *Mitigation*: Enforce `isValidId(taskId)` mapping `id.matches('^[a-zA-Z0-9_\\-]+$')`.

12. **Payload 12: Blanket List Query Bypass**
    - *Rogue Request*: Retrieving all tasks without a user filter: `db.collection('tasks').get()`.
    - *Violation*: Bypassing secure querying to download entire collection datasets.
    - *Mitigation*: Force `allow list: if resource.data.userId == request.auth.uid`.

---

## 3. Test Verification Plan

We will enforce these specifications through a complete, audited `firestore.rules` file which verifies these permissions.
All reads/writes must pass through the `request.auth != null` gating, the static schema size checks, and the direct UID checking.
