// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

/**
 * Global configuration cho Redmine API
 */
const globalConfig = {
  baseRedmineUrl: 'https://redmine.vietis.com.vn:93/redmine',
  project_id: 408,              // ProjectDesign.MaintainSubsidy
  assigned_to_id: 118,          // ha.ngocam
  tracker_id: 8,                // TASK type
  priority_id: 2,               // Normal priority
  status_id: 11,                // Default OPEN status
  token: '1be2213e8a2f2054bcea2bdee527d71b0f3cfbe5'
};

/**
 * Sub-project mapping
 * REQ #182973: FinanceInJapan
 * REQ #182974: TossWorks
 */
const subProjects = {
  "FinanceInJapan": 182973,
  "TossWorks": 182974,
};

/**
 * Redmine Status IDs
 */
const REDMINE_STATUS = {
  OPEN: 11,
  COMPLETED: 7,
  CLOSED: 5
};

/**
 * Sheet column indexes
 */
const COLUMN_INDEXS = {
  REDMINE_ID: 1,
  RM_STATUS: 3,
};

/**
 * Text values for RM Status column
 */
const TEXT_RM_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
};
