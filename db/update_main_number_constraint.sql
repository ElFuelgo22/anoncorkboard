-- SQL to update the check constraint on main_number column in pins table to allow 'Council' value

-- Drop the existing check constraint
ALTER TABLE pins DROP CONSTRAINT IF EXISTS main_number_check;

-- Add a new check constraint allowing 1, 2, 3, 4, or 'Council'
ALTER TABLE pins ADD CONSTRAINT main_number_check CHECK (
    main_number IN (1, 2, 3, 4) OR main_number = 'Council'
);
