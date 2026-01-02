// ============================================================================
// PUBLIC LIBRARY API
// ============================================================================
// File này expose các functions và constants để sử dụng như library
// Identifier: AppScriptProjectDesignMaintainSubsidy

/**
 * CÁCH SỬ DỤNG LIBRARY:
 * 
 * 1. Trong Google Sheet mới, mở Apps Script Editor
 * 2. Thêm library với Script ID: 12k1phNibJ6cAESKI3fpAMMHsr4j5Wv5spu1tljnJvgwiikAouA
 * 3. Đặt Identifier: AppScriptProjectDesignMaintainSubsidy
 * 
 * 4. Gọi functions trong code:
 *    var lib = AppScriptProjectDesignMaintainSubsidy;
 *    lib.setupRedmineMenu();
 *    var config = lib.getConfig();
 */

// ============================================================================
// EXPOSED FUNCTIONS
// ============================================================================

/**
 * Setup Redmine menu trong sheet mới
 * Gọi function này trong onOpen() của sheet mới
 */
function setupRedmineMenu() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Redmine Menu')
    .addItem('Create Task by selected row', 'AppScriptProjectDesignMaintainSubsidy.createTaskFromSelection') 
    .addItem('Close Tasks by selected row', 'AppScriptProjectDesignMaintainSubsidy.closeTasksFromSelection') 
    .addToUi();
}

/**
 * Tạo Redmine task từ hàng được chọn
 * Wrapper function để gọi từ menu
 */
function createTaskFromSelection() {
  selectedRowCreateRedmineTask();
}

/**
 * Đóng Redmine tasks từ các hàng được chọn
 * Wrapper function để gọi từ menu
 */
function closeTasksFromSelection() {
  selectedRowCloseRedmineTasks();
}

/**
 * Get config object - cho phép override config
 * @returns {Object} Config object
 */
function getConfig() {
  return {
    globalConfig: globalConfig,
    subProjects: subProjects,
    REDMINE_STATUS: REDMINE_STATUS,
    COLUMN_INDEXS: COLUMN_INDEXS,
    TEXT_RM_STATUS: TEXT_RM_STATUS
  };
}

/**
 * Set custom config - cho phép override config từ sheet khác
 * @param {Object} customConfig - Custom configuration
 */
function setCustomConfig(customConfig) {
  if (customConfig.baseRedmineUrl) globalConfig.baseRedmineUrl = customConfig.baseRedmineUrl;
  if (customConfig.project_id) globalConfig.project_id = customConfig.project_id;
  if (customConfig.assigned_to_id) globalConfig.assigned_to_id = customConfig.assigned_to_id;
  if (customConfig.tracker_id) globalConfig.tracker_id = customConfig.tracker_id;
  if (customConfig.priority_id) globalConfig.priority_id = customConfig.priority_id;
  if (customConfig.status_id) globalConfig.status_id = customConfig.status_id;
  if (customConfig.token) globalConfig.token = customConfig.token;
}

// ============================================================================
// EXPOSED UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert date to Plus7 timezone
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date
 */
function convertDate(isoString) {
  return convertToDatePlus7(isoString);
}

/**
 * Tạo Redmine issue với custom input
 * @param {Object} input - Issue input object
 * @returns {Object} Created issue response
 */
function createIssue(input) {
  return createRedmineIssue(input);
}

/**
 * Lấy subtasks của một issue
 * @param {number} parentIssueId - Parent issue ID
 * @returns {Array} Array of subtasks
 */
function getIssueSubtasks(parentIssueId) {
  return getSubtasks(parentIssueId);
}

/**
 * Update một issue
 * @param {number} issueId - Issue ID to update
 * @param {Object} updateData - Update data
 * @returns {boolean} Success status
 */
function updateIssue(issueId, updateData) {
  return updateRedmineIssue(issueId, updateData);
}

/**
 * Đóng một task hoàn chỉnh (parent + subtasks)
 * @param {number} redmineId - Redmine issue ID
 * @param {Object} rowData - Row data from sheet
 * @returns {Object} Result object with success and message
 */
function closeTask(redmineId, rowData) {
  return closeRedmineTask(redmineId, rowData);
}

/**
 * Get row data as JSON
 * @returns {Object} Row data object
 */
function getRowData() {
  return getSelectedRowJsonData();
}
