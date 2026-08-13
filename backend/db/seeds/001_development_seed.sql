-- SMS development seed data.
-- Apply only in a development/test Supabase project, after the base schema and migration 001.
-- Every seeded account uses the temporary password: ChangeMe123!
-- Change or delete these accounts before using any non-development environment.

INSERT INTO user_account (user_id, email, password_hash, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@example.com', crypt('ChangeMe123!', gen_salt('bf')), 'administrator'),
  ('00000000-0000-0000-0000-000000000002', 'teacher@example.com', crypt('ChangeMe123!', gen_salt('bf')), 'teacher'),
  ('00000000-0000-0000-0000-000000000003', 'student@example.com', crypt('ChangeMe123!', gen_salt('bf')), 'student'),
  ('00000000-0000-0000-0000-000000000004', 'guardian@example.com', crypt('ChangeMe123!', gen_salt('bf')), 'guardian')
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;

INSERT INTO administrator (administrator_id, user_id, full_name, department)
VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Amina Administrator', 'Academic Affairs')
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, department = EXCLUDED.department;

INSERT INTO teacher (teacher_id, user_id, full_name, email, department)
VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Thomas Teacher', 'teacher@example.com', 'Computer Science')
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, department = EXCLUDED.department;

INSERT INTO guardian (guardian_id, user_id, full_name, email, phone, relationship)
VALUES ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Grace Guardian', 'guardian@example.com', '+10000000004', 'Parent')
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, phone = EXCLUDED.phone, relationship = EXCLUDED.relationship;

INSERT INTO student (student_id, user_id, full_name, dob, phone, address)
VALUES ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Samuel Student', '2008-05-14', '+10000000003', '1 School Street')
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, dob = EXCLUDED.dob, phone = EXCLUDED.phone, address = EXCLUDED.address;

INSERT INTO student_guardian (student_guardian_id, student_id, guardian_id, primary_contact)
VALUES ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', true)
ON CONFLICT (student_id, guardian_id) DO UPDATE SET primary_contact = EXCLUDED.primary_contact;

INSERT INTO course (course_id, course_name, course_code, term, credit_units)
VALUES ('60000000-0000-0000-0000-000000000001', 'Introduction to Computing', 'CSC101', '2026 Term 1', 3)
ON CONFLICT (course_id) DO UPDATE SET course_name = EXCLUDED.course_name, term = EXCLUDED.term, credit_units = EXCLUDED.credit_units;

INSERT INTO room (room_id, room_name, location, capacity)
VALUES ('70000000-0000-0000-0000-000000000001', 'Computer Lab 1', 'Science Block', 30)
ON CONFLICT (room_id) DO UPDATE SET room_name = EXCLUDED.room_name, location = EXCLUDED.location, capacity = EXCLUDED.capacity;

INSERT INTO class_session (session_id, course_id, teacher_id, room_id, start_time, end_time, recurrence_pattern)
VALUES ('80000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '2026-08-17 09:00:00+00', '2026-08-17 11:00:00+00', 'Weekly')
ON CONFLICT (session_id) DO UPDATE SET course_id = EXCLUDED.course_id, teacher_id = EXCLUDED.teacher_id, room_id = EXCLUDED.room_id, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, recurrence_pattern = EXCLUDED.recurrence_pattern;

INSERT INTO assessment (assessment_id, course_id, title, assessment_type, max_score, weight, due_date)
VALUES ('90000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Computing Foundations Quiz', 'Quiz', 100, 20, '2026-08-24')
ON CONFLICT (assessment_id) DO UPDATE SET title = EXCLUDED.title, assessment_type = EXCLUDED.assessment_type, max_score = EXCLUDED.max_score, weight = EXCLUDED.weight, due_date = EXCLUDED.due_date;

INSERT INTO academic_record (record_id, student_id, assessment_id, score, grade)
VALUES ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 86, 'A')
ON CONFLICT (student_id, assessment_id) DO UPDATE SET score = EXCLUDED.score, grade = EXCLUDED.grade;

INSERT INTO final_grade (final_grade_id, student_id, course_id, computed_score, letter_grade, gpa)
VALUES ('b0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 86, 'A', 4.0)
ON CONFLICT (student_id, course_id) DO UPDATE SET computed_score = EXCLUDED.computed_score, letter_grade = EXCLUDED.letter_grade, gpa = EXCLUDED.gpa;

INSERT INTO attendance (attendance_id, student_id, session_id, session_date, status)
VALUES ('c0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '2026-08-17', 'Present')
ON CONFLICT (student_id, session_id, session_date) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO participation_log (participation_id, student_id, session_id, rating, notes)
VALUES ('d0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Active', 'Participated in the lab discussion.')
ON CONFLICT (participation_id) DO UPDATE SET rating = EXCLUDED.rating, notes = EXCLUDED.notes;

INSERT INTO financial_record (invoice_id, student_id, amount_due, amount_paid, payment_status, due_date)
VALUES ('e0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1200.00, 600.00, 'Pending', '2026-09-01')
ON CONFLICT (invoice_id) DO UPDATE SET amount_due = EXCLUDED.amount_due, amount_paid = EXCLUDED.amount_paid, payment_status = EXCLUDED.payment_status, due_date = EXCLUDED.due_date;
