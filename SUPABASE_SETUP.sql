-- ============================================================
-- RUN THIS ENTIRE FILE IN YOUR SUPABASE SQL EDITOR
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- 1. Students table (stores registration info)
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  college_name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  interested_subject TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Attempts table (stores each test attempt separately)
CREATE TABLE IF NOT EXISTS attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,  -- 1 or 2
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  time_taken_seconds INTEGER,       -- how long they took
  answers JSONB,                    -- stores {questionIndex: selectedOption}
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_attempts_student_id ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone_number);

-- 4. View for admin: see all students with both attempt scores side by side
CREATE OR REPLACE VIEW student_results AS
SELECT 
  s.id,
  s.full_name,
  s.college_name,
  s.phone_number,
  s.email,
  s.interested_subject,
  s.attempt_count,
  s.created_at AS registered_at,
  a1.score AS attempt1_score,
  a1.percentage AS attempt1_percentage,
  a1.time_taken_seconds AS attempt1_time_seconds,
  a1.submitted_at AS attempt1_submitted_at,
  a2.score AS attempt2_score,
  a2.percentage AS attempt2_percentage,
  a2.time_taken_seconds AS attempt2_time_seconds,
  a2.submitted_at AS attempt2_submitted_at,
  GREATEST(COALESCE(a1.score, 0), COALESCE(a2.score, 0)) AS best_score
FROM students s
LEFT JOIN attempts a1 ON a1.student_id = s.id AND a1.attempt_number = 1
LEFT JOIN attempts a2 ON a2.student_id = s.id AND a2.attempt_number = 2
ORDER BY best_score DESC;

-- 5. View for top 3 leaderboard
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY GREATEST(COALESCE(a1.score, 0), COALESCE(a2.score, 0)) DESC) AS rank,
  s.full_name,
  s.college_name,
  s.interested_subject,
  GREATEST(COALESCE(a1.score, 0), COALESCE(a2.score, 0)) AS best_score,
  GREATEST(COALESCE(a1.percentage, 0), COALESCE(a2.percentage, 0)) AS best_percentage
FROM students s
LEFT JOIN attempts a1 ON a1.student_id = s.id AND a1.attempt_number = 1
LEFT JOIN attempts a2 ON a2.student_id = s.id AND a2.attempt_number = 2
WHERE s.attempt_count > 0
ORDER BY best_score DESC
LIMIT 3;

-- 6. Disable Row Level Security for simplicity (enable + configure if you want auth)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE attempts DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- DONE! Your database is ready.
-- ============================================================
