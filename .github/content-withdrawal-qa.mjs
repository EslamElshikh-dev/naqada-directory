// Extend the isolated ISR race test to withdrawal of a foundation listing.
process.env.NAQADA_QA_WITHDRAWAL_COVERAGE = '1';
await import('./withdrawal-qa.mjs');
