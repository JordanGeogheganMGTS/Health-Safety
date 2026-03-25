-- ============================================================
-- FILE 18: 00018_seed.sql
-- Seed all initial reference / configuration data
-- ============================================================

-- ---------------------------------------------------------------
-- ROLES
-- ---------------------------------------------------------------
INSERT INTO roles (name, description, sort_order) VALUES
  ('System Admin',  'Full system access including configuration and user management', 1),
  ('H&S Manager',   'Full operational access across all sites',                        2),
  ('Site Manager',  'Full access scoped to their own site',                            3),
  ('TDA / Staff',   'Limited access — own records, incident reporting, fire alarm tests', 4),
  ('Read-Only',     'View-only access across permitted modules',                       5)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------
-- SITES
-- ---------------------------------------------------------------
INSERT INTO sites (name) VALUES
  ('Coventry'),
  ('Redditch')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- SYSTEM_SETTINGS
-- ---------------------------------------------------------------
INSERT INTO system_settings (key, value, data_type, label, description) VALUES
  ('upcoming_days_warning',          '30',       'integer', 'Upcoming Warning Days',           'Number of days before expiry to show "upcoming" warnings on the dashboard'),
  ('document_review_alert_days',     '60',       'integer', 'Document Review Alert Days',      'Number of days before review due date to trigger a document review alert'),
  ('overdue_email_digest_enabled',   'true',     'boolean', 'Overdue Email Digest Enabled',    'Whether to send a weekly email digest of overdue items'),
  ('overdue_email_digest_day',       'Monday',   'string',  'Overdue Email Digest Day',        'Day of the week on which the overdue email digest is sent'),
  ('max_dashboard_ca_rows',          '10',       'integer', 'Max Dashboard CA Rows',           'Maximum number of corrective action rows to display on the dashboard'),
  ('site_filter_default',            'all',      'string',  'Site Filter Default',             'Default site filter on list views: "all" or a specific site id'),
  ('session_timeout_minutes',        '60',       'integer', 'Session Timeout (Minutes)',       'Number of idle minutes before a user session is automatically expired'),
  ('fire_drill_interval_months',     '6',        'integer', 'Fire Drill Interval (Months)',    'Expected interval in months between fire drills'),
  ('dse_review_interval_months',     '12',       'integer', 'DSE Review Interval (Months)',    'Expected interval in months between DSE assessments')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------
-- LOOKUP CATEGORIES  (key must be unique)
-- ---------------------------------------------------------------
INSERT INTO lookup_categories (key, label, description) VALUES
  ('document_category',     'Document Category',            'Categories for the document library'),
  ('ra_category',           'Risk Assessment Category',     'Categories for risk assessments'),
  ('ms_category',           'Method Statement Category',    'Categories for method statements'),
  ('contractor_type',       'Contractor Type',              'Types of contractor'),
  ('contractor_doc_type',   'Contractor Document Type',     'Document types for contractor compliance packs'),
  ('equipment_category',    'Equipment Category',           'Categories for plant and equipment'),
  ('equipment_status',      'Equipment Status',             'Operational status values for equipment'),
  ('service_type',          'Service / Inspection Type',    'Types of equipment service or inspection'),
  ('service_outcome',       'Service Outcome',              'Outcomes for equipment service records'),
  ('extinguisher_type',     'Fire Extinguisher Type',       'Types of fire extinguisher'),
  ('extinguisher_status',   'Fire Extinguisher Status',     'Status values for fire extinguishers'),
  ('extinguisher_outcome',  'Extinguisher Inspection Outcome', 'Outcomes for fire extinguisher inspections'),
  ('alarm_test_type',       'Alarm Test Type',              'Types of fire alarm test'),
  ('alarm_outcome',         'Alarm Test Outcome',           'Outcomes for fire alarm tests'),
  ('inspection_type',       'Inspection Type',              'Types of workplace inspection'),
  ('inspection_outcome',    'Inspection Outcome',           'Overall outcomes for inspections'),
  ('finding_severity',      'Finding Severity',             'Severity levels for inspection findings'),
  ('incident_type',         'Incident Type',                'Types of incident / accident'),
  ('ca_priority',           'Corrective Action Priority',   'Priority levels for corrective actions'),
  ('ppe_size_footwear',     'PPE Size — Footwear',          'UK shoe sizes for safety boots'),
  ('ppe_size_clothing',     'PPE Size — Clothing',          'Clothing sizes for overalls, hi-vis, etc.'),
  ('ppe_size_gloves',       'PPE Size — Gloves',            'Glove sizes'),
  ('ppe_size_head',         'PPE Size — Head Protection',   'Hard hat sizes')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------
-- LOOKUP VALUES
-- Helper: reference categories by key using a sub-select
-- ---------------------------------------------------------------

-- document_category
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'document_category'), 'policy',            'Policy',            1),
  ((SELECT id FROM lookup_categories WHERE key = 'document_category'), 'procedure',         'Procedure',         2),
  ((SELECT id FROM lookup_categories WHERE key = 'document_category'), 'risk_assessment',   'Risk Assessment',   3),
  ((SELECT id FROM lookup_categories WHERE key = 'document_category'), 'method_statement',  'Method Statement',  4),
  ((SELECT id FROM lookup_categories WHERE key = 'document_category'), 'coshh',             'COSHH',             5),
  ((SELECT id FROM lookup_categories WHERE key = 'document_category'), 'training_record',   'Training Record',   6),
  ((SELECT id FROM lookup_categories WHERE key = 'document_category'), 'other',             'Other',             7)
ON CONFLICT DO NOTHING;

-- ra_category
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'ra_category'), 'workshop',        'Workshop',        1),
  ((SELECT id FROM lookup_categories WHERE key = 'ra_category'), 'office',          'Office',          2),
  ((SELECT id FROM lookup_categories WHERE key = 'ra_category'), 'site_work',       'Site Work',       3),
  ((SELECT id FROM lookup_categories WHERE key = 'ra_category'), 'loler',           'LOLER',           4),
  ((SELECT id FROM lookup_categories WHERE key = 'ra_category'), 'manual_handling', 'Manual Handling', 5),
  ((SELECT id FROM lookup_categories WHERE key = 'ra_category'), 'fire',            'Fire',            6),
  ((SELECT id FROM lookup_categories WHERE key = 'ra_category'), 'electrical',      'Electrical',      7),
  ((SELECT id FROM lookup_categories WHERE key = 'ra_category'), 'chemical',        'Chemical',        8),
  ((SELECT id FROM lookup_categories WHERE key = 'ra_category'), 'other',           'Other',           9)
ON CONFLICT DO NOTHING;

-- ms_category
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'ms_category'), 'mechanical',  'Mechanical',  1),
  ((SELECT id FROM lookup_categories WHERE key = 'ms_category'), 'electrical',  'Electrical',  2),
  ((SELECT id FROM lookup_categories WHERE key = 'ms_category'), 'civil',       'Civil',       3),
  ((SELECT id FROM lookup_categories WHERE key = 'ms_category'), 'general',     'General',     4),
  ((SELECT id FROM lookup_categories WHERE key = 'ms_category'), 'other',       'Other',       5)
ON CONFLICT DO NOTHING;

-- contractor_type
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_type'), 'electrical',  'Electrical',  1),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_type'), 'mechanical',  'Mechanical',  2),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_type'), 'cleaning',    'Cleaning',    3),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_type'), 'grounds',     'Grounds',     4),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_type'), 'security',    'Security',    5),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_type'), 'it',          'IT',          6),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_type'), 'other',       'Other',       7)
ON CONFLICT DO NOTHING;

-- contractor_doc_type
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_doc_type'), 'public_liability',     'Public Liability Insurance',     1),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_doc_type'), 'employers_liability',  'Employers Liability Insurance',  2),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_doc_type'), 'method_statement',     'Method Statement',               3),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_doc_type'), 'risk_assessment',      'Risk Assessment',                4),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_doc_type'), 'coshh',                'COSHH',                          5),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_doc_type'), 'accreditation',        'Accreditation',                  6),
  ((SELECT id FROM lookup_categories WHERE key = 'contractor_doc_type'), 'other',                'Other',                          7)
ON CONFLICT DO NOTHING;

-- equipment_category
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_category'), 'lifting_equipment',   'Lifting Equipment',   1),
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_category'), 'pressure_equipment',  'Pressure Equipment',  2),
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_category'), 'electrical',          'Electrical',          3),
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_category'), 'hand_tools',          'Hand Tools',          4),
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_category'), 'power_tools',         'Power Tools',         5),
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_category'), 'vehicles',            'Vehicles',            6),
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_category'), 'other',               'Other',               7)
ON CONFLICT DO NOTHING;

-- equipment_status
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_status'), 'in_service',          'In Service',          1),
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_status'), 'out_of_service',      'Out of Service',      2),
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_status'), 'under_repair',        'Under Repair',        3),
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_status'), 'decommissioned',      'Decommissioned',      4),
  ((SELECT id FROM lookup_categories WHERE key = 'equipment_status'), 'awaiting_inspection', 'Awaiting Inspection', 5)
ON CONFLICT DO NOTHING;

-- service_type
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'service_type'), 'planned_maintenance',  'Planned Maintenance',  1),
  ((SELECT id FROM lookup_categories WHERE key = 'service_type'), 'breakdown_repair',     'Breakdown Repair',     2),
  ((SELECT id FROM lookup_categories WHERE key = 'service_type'), 'annual_inspection',    'Annual Inspection',    3),
  ((SELECT id FROM lookup_categories WHERE key = 'service_type'), 'loler_inspection',     'LOLER Inspection',     4),
  ((SELECT id FROM lookup_categories WHERE key = 'service_type'), 'pat_test',             'PAT Test',             5),
  ((SELECT id FROM lookup_categories WHERE key = 'service_type'), 'other',                'Other',                6)
ON CONFLICT DO NOTHING;

-- service_outcome
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'service_outcome'), 'pass',                    'Pass',                    1),
  ((SELECT id FROM lookup_categories WHERE key = 'service_outcome'), 'pass_with_recommendations','Pass with Recommendations',2),
  ((SELECT id FROM lookup_categories WHERE key = 'service_outcome'), 'fail',                    'Fail',                    3),
  ((SELECT id FROM lookup_categories WHERE key = 'service_outcome'), 'refer_to_specialist',     'Refer to Specialist',     4)
ON CONFLICT DO NOTHING;

-- extinguisher_type
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_type'), 'water',       'Water',       1),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_type'), 'co2',         'CO2',         2),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_type'), 'foam',        'Foam',        3),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_type'), 'dry_powder',  'Dry Powder',  4),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_type'), 'wet_chemical','Wet Chemical', 5),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_type'), 'halon',       'Halon',       6)
ON CONFLICT DO NOTHING;

-- extinguisher_status
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_status'), 'serviceable',       'Serviceable',        1),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_status'), 'requires_attention','Requires Attention',  2),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_status'), 'out_of_service',    'Out of Service',      3),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_status'), 'due_inspection',    'Due Inspection',      4)
ON CONFLICT DO NOTHING;

-- extinguisher_outcome
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_outcome'), 'pass',                     'Pass',                     1),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_outcome'), 'pass_with_recommendations', 'Pass with Recommendations', 2),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_outcome'), 'fail',                     'Fail',                     3),
  ((SELECT id FROM lookup_categories WHERE key = 'extinguisher_outcome'), 'replaced',                 'Replaced',                 4)
ON CONFLICT DO NOTHING;

-- alarm_test_type
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'alarm_test_type'), 'weekly_call_point',    'Weekly Call Point Test',   1),
  ((SELECT id FROM lookup_categories WHERE key = 'alarm_test_type'), 'monthly_check',        'Monthly Check',            2),
  ((SELECT id FROM lookup_categories WHERE key = 'alarm_test_type'), 'annual_service',       'Annual Service',           3),
  ((SELECT id FROM lookup_categories WHERE key = 'alarm_test_type'), 'quarterly_inspection', 'Quarterly Inspection',     4)
ON CONFLICT DO NOTHING;

-- alarm_outcome
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'alarm_outcome'), 'pass',                 'Pass',                  1),
  ((SELECT id FROM lookup_categories WHERE key = 'alarm_outcome'), 'minor_fault_noted',    'Minor Fault Noted',     2),
  ((SELECT id FROM lookup_categories WHERE key = 'alarm_outcome'), 'fail',                 'Fail',                  3),
  ((SELECT id FROM lookup_categories WHERE key = 'alarm_outcome'), 'under_investigation',  'Under Investigation',   4)
ON CONFLICT DO NOTHING;

-- inspection_type
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'inspection_type'), 'monthly_workplace',        'Monthly Workplace Inspection',  1),
  ((SELECT id FROM lookup_categories WHERE key = 'inspection_type'), 'annual_fire_risk',         'Annual Fire Risk Assessment',   2),
  ((SELECT id FROM lookup_categories WHERE key = 'inspection_type'), 'coshh_inspection',         'COSHH Inspection',              3),
  ((SELECT id FROM lookup_categories WHERE key = 'inspection_type'), 'equipment_audit',          'Equipment Audit',               4),
  ((SELECT id FROM lookup_categories WHERE key = 'inspection_type'), 'site_walkthrough',         'Site Walkthrough',              5),
  ((SELECT id FROM lookup_categories WHERE key = 'inspection_type'), 'external_audit',           'External Audit',                6),
  ((SELECT id FROM lookup_categories WHERE key = 'inspection_type'), 'other',                    'Other',                         7)
ON CONFLICT DO NOTHING;

-- inspection_outcome
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'inspection_outcome'), 'satisfactory',              'Satisfactory',              1),
  ((SELECT id FROM lookup_categories WHERE key = 'inspection_outcome'), 'satisfactory_with_actions', 'Satisfactory with Actions', 2),
  ((SELECT id FROM lookup_categories WHERE key = 'inspection_outcome'), 'unsatisfactory',            'Unsatisfactory',            3),
  ((SELECT id FROM lookup_categories WHERE key = 'inspection_outcome'), 'incomplete',                'Incomplete',                4)
ON CONFLICT DO NOTHING;

-- finding_severity
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'finding_severity'), 'low',      'Low',      1),
  ((SELECT id FROM lookup_categories WHERE key = 'finding_severity'), 'medium',   'Medium',   2),
  ((SELECT id FROM lookup_categories WHERE key = 'finding_severity'), 'high',     'High',     3),
  ((SELECT id FROM lookup_categories WHERE key = 'finding_severity'), 'critical', 'Critical', 4)
ON CONFLICT DO NOTHING;

-- incident_type
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'incident_type'), 'near_miss',              'Near Miss',               1),
  ((SELECT id FROM lookup_categories WHERE key = 'incident_type'), 'first_aid',              'First Aid',               2),
  ((SELECT id FROM lookup_categories WHERE key = 'incident_type'), 'riddor_reportable',      'RIDDOR Reportable',       3),
  ((SELECT id FROM lookup_categories WHERE key = 'incident_type'), 'dangerous_occurrence',   'Dangerous Occurrence',    4),
  ((SELECT id FROM lookup_categories WHERE key = 'incident_type'), 'property_damage',        'Property Damage',         5),
  ((SELECT id FROM lookup_categories WHERE key = 'incident_type'), 'environmental',          'Environmental',           6),
  ((SELECT id FROM lookup_categories WHERE key = 'incident_type'), 'vehicle',                'Vehicle',                 7),
  ((SELECT id FROM lookup_categories WHERE key = 'incident_type'), 'occupational_ill_health','Occupational Ill Health',  8),
  ((SELECT id FROM lookup_categories WHERE key = 'incident_type'), 'other',                  'Other',                   9)
ON CONFLICT DO NOTHING;

-- ca_priority
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'ca_priority'), 'critical', 'Critical (1 day)',   1),
  ((SELECT id FROM lookup_categories WHERE key = 'ca_priority'), 'high',     'High (7 days)',       2),
  ((SELECT id FROM lookup_categories WHERE key = 'ca_priority'), 'medium',   'Medium (28 days)',    3),
  ((SELECT id FROM lookup_categories WHERE key = 'ca_priority'), 'low',      'Low (90 days)',       4)
ON CONFLICT DO NOTHING;

-- ppe_size_footwear (UK shoe sizes 3–14)
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '3',  '3',  1),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '4',  '4',  2),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '5',  '5',  3),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '6',  '6',  4),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '7',  '7',  5),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '8',  '8',  6),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '9',  '9',  7),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '10', '10', 8),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '11', '11', 9),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '12', '12', 10),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '13', '13', 11),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_footwear'), '14', '14', 12)
ON CONFLICT DO NOTHING;

-- ppe_size_clothing
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_clothing'), 'XS',   'XS',   1),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_clothing'), 'S',    'S',    2),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_clothing'), 'M',    'M',    3),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_clothing'), 'L',    'L',    4),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_clothing'), 'XL',   'XL',   5),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_clothing'), 'XXL',  'XXL',  6),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_clothing'), 'XXXL', 'XXXL', 7)
ON CONFLICT DO NOTHING;

-- ppe_size_gloves
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_gloves'), 'XS', 'XS', 1),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_gloves'), 'S',  'S',  2),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_gloves'), 'M',  'M',  3),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_gloves'), 'L',  'L',  4),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_gloves'), 'XL', 'XL', 5)
ON CONFLICT DO NOTHING;

-- ppe_size_head
INSERT INTO lookup_values (category_id, value, label, sort_order) VALUES
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_head'), 'S_M',        'S/M',       1),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_head'), 'L_XL',       'L/XL',      2),
  ((SELECT id FROM lookup_categories WHERE key = 'ppe_size_head'), 'adjustable', 'Adjustable', 3)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- PPE_ITEMS (8 rows)
-- ---------------------------------------------------------------
INSERT INTO ppe_items (name, has_sizes, size_category_key, replacement_months, is_active) VALUES
  ('Safety Boots',       TRUE,  'ppe_size_footwear', 24,   TRUE),
  ('Overalls',           TRUE,  'ppe_size_clothing', 12,   TRUE),
  ('Hi-Vis Vest',        TRUE,  'ppe_size_clothing', 12,   TRUE),
  ('Hard Hat',           TRUE,  'ppe_size_head',     36,   TRUE),
  ('Safety Glasses',     FALSE, NULL,                24,   TRUE),
  ('Hearing Protection', FALSE, NULL,                12,   TRUE),
  ('Gloves',             TRUE,  'ppe_size_gloves',   6,    TRUE),
  ('Dust Mask / RPE',    FALSE, NULL,                NULL, TRUE)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- DSE_QUESTION_TEMPLATES
-- Static HSE workstation checklist — 26 questions total
-- ---------------------------------------------------------------

-- Create the table (static reference, not editable via UI, no RLS user policies needed)
CREATE TABLE IF NOT EXISTS dse_question_templates (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  section_number SMALLINT     NOT NULL,
  section_label  VARCHAR(100) NOT NULL,
  item_key       VARCHAR(100) NOT NULL UNIQUE,
  item_text      TEXT         NOT NULL,
  sort_order     SMALLINT     NOT NULL
);

-- Enable RLS (read-only for all authenticated users; no write policies)
ALTER TABLE dse_question_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY dse_question_templates_select ON dse_question_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Section 1 — Keyboards (4 questions)
INSERT INTO dse_question_templates (section_number, section_label, item_key, item_text, sort_order) VALUES
  (1, 'Keyboards', 'keyboard_separate',    'Is the keyboard separate from the screen?',                                                   1),
  (1, 'Keyboards', 'keyboard_tilt',        'Can the keyboard tilt?',                                                                       2),
  (1, 'Keyboards', 'keyboard_posture',     'Is there space in front of the keyboard to rest hands and wrists when not keying?',             3),
  (1, 'Keyboards', 'keyboard_legibility',  'Are the characters on the keys easy to see?',                                                  4)
ON CONFLICT (item_key) DO NOTHING;

-- Section 2 — Mouse, trackball etc (4 questions)
INSERT INTO dse_question_templates (section_number, section_label, item_key, item_text, sort_order) VALUES
  (2, 'Mouse, trackball etc', 'mouse_suitable',   'Is the mouse/trackball/other device suitable for the tasks it is used for?',            5),
  (2, 'Mouse, trackball etc', 'mouse_position',   'Can it be used close to the user?',                                                     6),
  (2, 'Mouse, trackball etc', 'mouse_support',    'Is there a wrist/palm support available?',                                              7),
  (2, 'Mouse, trackball etc', 'mouse_smooth',     'Does the mouse/trackball move smoothly on a suitable surface?',                         8)
ON CONFLICT (item_key) DO NOTHING;

-- Section 3 — Display screens (5 questions)
INSERT INTO dse_question_templates (section_number, section_label, item_key, item_text, sort_order) VALUES
  (3, 'Display screens', 'screen_clarity',        'Are the characters clear and readable?',                                                9),
  (3, 'Display screens', 'screen_stable',         'Is the image stable — no flicker or movement?',                                        10),
  (3, 'Display screens', 'screen_brightness',     'Can the brightness and contrast be adjusted?',                                         11),
  (3, 'Display screens', 'screen_swivel',         'Can the screen swivel and tilt?',                                                      12),
  (3, 'Display screens', 'screen_glare_free',     'Is the screen free from glare and reflections?',                                       13)
ON CONFLICT (item_key) DO NOTHING;

-- Section 4 — Software (1 question)
INSERT INTO dse_question_templates (section_number, section_label, item_key, item_text, sort_order) VALUES
  (4, 'Software', 'software_suitable', 'Is the software suitable for the task?',                                                          14)
ON CONFLICT (item_key) DO NOTHING;

-- Section 5 — Furniture (6 questions)
INSERT INTO dse_question_templates (section_number, section_label, item_key, item_text, sort_order) VALUES
  (5, 'Furniture', 'furniture_surface',   'Is the work surface large enough for all the equipment, papers, etc.?',                        15),
  (5, 'Furniture', 'furniture_reach',     'Can the user comfortably reach everything they need without stretching?',                      16),
  (5, 'Furniture', 'chair_stable',        'Is the chair stable?',                                                                         17),
  (5, 'Furniture', 'chair_adjustable',    'Can the seat back be adjusted for height, tilt and back angle?',                               18),
  (5, 'Furniture', 'chair_lumbar',        'Does the chair provide good back support?',                                                    19),
  (5, 'Furniture', 'footrest_available',  'Is a footrest available if required?',                                                         20)
ON CONFLICT (item_key) DO NOTHING;

-- Section 6 — Environment (4 questions)
INSERT INTO dse_question_templates (section_number, section_label, item_key, item_text, sort_order) VALUES
  (6, 'Environment', 'env_space',    'Is there enough space around the workstation to change position and vary movement?',                 21),
  (6, 'Environment', 'env_lighting', 'Is the lighting suitable — not too bright or dark, and does it avoid reflections?',                 22),
  (6, 'Environment', 'env_air',      'Does the air feel comfortable — not too hot, cold, or dry?',                                        23),
  (6, 'Environment', 'env_noise',    'Is the workstation area reasonably free from distracting noise?',                                   24)
ON CONFLICT (item_key) DO NOTHING;

-- Section 7 — Final questions (2 questions — total = 26)
INSERT INTO dse_question_templates (section_number, section_label, item_key, item_text, sort_order) VALUES
  (7, 'Final questions', 'final_discomfort',  'Has the user experienced any discomfort or health issues that might be caused by using DSE?', 25),
  (7, 'Final questions', 'final_breaks',      'Does the user take regular breaks away from DSE work?',                                       26)
ON CONFLICT (item_key) DO NOTHING;
