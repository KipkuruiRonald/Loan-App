-- Reset stuck loans from PROCESSING back to PENDING
-- Run this to fix loans that got stuck during approval

UPDATE loans 
SET status = 'PENDING' 
WHERE status = 'PROCESSING';

-- Show the result
SELECT id, loan_id, status, principal, borrower_id 
FROM loans 
WHERE status = 'PENDING';
