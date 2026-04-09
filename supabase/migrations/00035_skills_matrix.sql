-- ============================================================
-- FILE 35: 00035_skills_matrix.sql
-- Skills matrix: definitions, membership, and competencies
-- ============================================================

-- Skill column definitions (the headers of the matrix)
CREATE TABLE skill_definitions (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  sort_order SMALLINT     NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Which users appear as rows in the matrix
CREATE TABLE skill_matrix_members (
  id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  added_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  added_by  UUID         REFERENCES users(id)
);

-- The matrix cells: user × skill competency
CREATE TABLE skill_competencies (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id        UUID        NOT NULL REFERENCES skill_definitions(id) ON DELETE CASCADE,
  is_competent    BOOLEAN     NOT NULL DEFAULT false,
  certificate_url TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID        REFERENCES users(id),
  UNIQUE(user_id, skill_id)
);

CREATE INDEX idx_skill_comp_user  ON skill_competencies(user_id);
CREATE INDEX idx_skill_comp_skill ON skill_competencies(skill_id);
