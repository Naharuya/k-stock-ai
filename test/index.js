// test/index.js
// This is the entry point for running all tests.

// Import and run all test files
require('./analysis.test.js');
require('./android_external.test.js');
require('./data_freshness.test.js');
require('./data_paths.test.js');
require('./data_quality.test.js');
require('./external_access.test.js');
require('./gabia_deploy_config.test.js');
require('./integration_secret.test.js');
require('./launchd_schedule.test.js');
require('./leader_disclosures.test.js');
// src/index.js is already loaded through other test files. Remove this line if it's causing issues.
require('./token_retry.test.js');
require('./v2_agents.test.js');
require('./v2_scoring.test.js');
require('./watchlist.test.js');
require('./watchlist_reports.test.js');