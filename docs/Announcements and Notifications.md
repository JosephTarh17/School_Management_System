# Announcements and Notifications

## Purpose

The School Management System now provides a standard institutional communication workflow. Administrators publish school notices, while authenticated users receive role-scoped notices and event notifications in a compact in-app inbox.

## Announcements

Administrators use **Announcements** to create a title and message, select an audience, choose a priority, optionally set an expiry date, save a draft, publish a notice, or archive a published notice.

Supported audiences are:

| Audience | Recipients |
|---|---|
| Everyone | All active user accounts |
| Students | Student accounts |
| Teachers | Teacher accounts |
| Guardians | Guardian accounts |
| Administrators | Administrator accounts |

Non-administrator users see only published, non-expired notices targeted to Everyone or their own role. Administrators can view drafts, published notices, and archived notices from the announcement library.

## Notification inbox

The top navigation bell provides each authenticated user with a notification inbox. It displays the unread count, recent notifications, notification title and body, and the creation date. A user can open a linked destination, mark one notification as read, or mark all notifications as read.

The inbox is backed by the `user_notification` table. Each row belongs to one user. The optional `event_key` provides idempotency so repeated requests do not create duplicate notifications for the same event and user.

## Automatic event notifications

The backend creates in-app notifications for the following events:

| Event | Recipients | Link |
|---|---|---|
| Unexcused absence recorded | Student and linked guardians | Student Portal |
| New student course-registration request | Administrators | Registration Review |
| Course-registration request approved | Student and linked guardians | Course Registration |
| Course-registration request rejected | Student and linked guardians | Course Registration |
| Assessment published by administrator | Active students and linked guardians in the course and academic period | Student Portal |
| Administrator announcement published | Users matching the selected audience | Announcements |

Notification fanout is deliberately non-blocking. The attendance, registration, or grading operation remains successful if the notification inbox write fails; the backend records a diagnostic message for operational troubleshooting.

## API surface

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/announcements` | Authenticated | List visible notices; administrators can also see drafts and archived notices. |
| POST | `/announcements` | Administrator | Create a draft or publish an announcement. |
| PATCH | `/announcements/:announcementId` | Administrator | Update an announcement or change its publication state. |
| GET | `/notifications` | Authenticated | Load the current user’s recent notification inbox. |
| GET | `/notifications/unread-count` | Authenticated | Return the current unread count. |
| PATCH | `/notifications/:notificationId/read` | Notification owner | Mark one notification as read. |
| POST | `/notifications/read-all` | Authenticated | Mark every unread notification for the current user as read. |

## Database migration

Apply `backend/db/migrations/023_announcements_and_notifications.sql` after migrations 017, 019, 020, 021, and 022. Migration 018 remains independent and should be applied only when CinetPay is activated.

The migration creates `announcement` and `user_notification`, their indexes, constraints, comments, and row-level-security enablement. The backend continues to use the Supabase service-role connection, so no frontend database policies are required for this feature.
