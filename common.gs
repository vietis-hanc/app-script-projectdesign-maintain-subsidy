// ============================================================================
// COMMON UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert ISO date string to YYYY-MM-DD format in Asia/Bangkok timezone (UTC+7)
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
function convertToDatePlus7(isoString) {
  const date = new Date(isoString);
  const formatted = Utilities.formatDate(date, "Asia/Bangkok", "yyyy-MM-dd");
  return formatted;
}

/**
 * Ghi status vào sheet
 * @param {Sheet} sheet - Sheet object
 * @param {number} row - Số hàng
 * @param {string} status - Status text cần ghi
 */
function writeTaskStatusToSheet(sheet, row, status) {
  const column = COLUMN_INDEXS.RM_STATUS;
  sheet.getRange(row, column).setValue(status);
}

/**
 * Lấy JSON data từ hàng được chọn
 * @returns {Object} Object với keys từ headers và values từ row data
 */
function getSelectedRowJsonData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange();
  
  if (!range) {
    SpreadsheetApp.getUi().alert("Vui lòng chọn một ô trong hàng muốn ghi.");
    return;
  }

  const row = range.getRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rowData = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
  
  // Tạo JSON payload: Dùng tên cột (header) làm key
  const payload = {};
  for (let i = 0; i < headers.length; i++) {
    payload[headers[i]] = rowData[i];
  }

  return payload;
}

// ============================================================================
// REDMINE API FUNCTIONS
// ============================================================================

/**
 * Tạo issue mới trên Redmine
 * @param {Object} input - Issue data
 * @returns {Object} Response object từ Redmine API
 */
function createRedmineIssue(input) {
  const url = `${globalConfig.baseRedmineUrl}/issues.json`;

  const issueData = {
    issue: {
      project_id: globalConfig.project_id,
      subject: input.subject,
      description: input.description || '',
      assigned_to_id: globalConfig.assigned_to_id,
      tracker_id: globalConfig.tracker_id,
      priority_id: globalConfig.priority_id,
      status_id: REDMINE_STATUS.OPEN,
      parent_issue_id: input.parent_issue_id || null,
      done_ratio: input.done_ratio ?? 0,
      estimated_hours: input.estimated_hours ?? 0,
      start_date: input.start_date || null,
      due_date: input.due_date || null,
      custom_fields: [
        { id: 10, value: input.act_start || '' },
        { id: 5, value: input.act_finish || '' }
      ]
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Redmine-API-Key': globalConfig.token },
    payload: JSON.stringify(issueData),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();
  const body = response.getContentText();

  Logger.log(`Status: ${status}`);
  Logger.log(body);

  if (status >= 200 && status < 300) {
    return JSON.parse(body);
  } else {
    throw new Error(`Redmine API error (${status}): ${body}`);
  }
}

/**
 * Lấy danh sách subtasks của một issue
 * @param {number} parentIssueId - ID của issue cha
 * @returns {Array} Mảng các subtasks
 */
function getSubtasks(parentIssueId) {
  const url = `${globalConfig.baseRedmineUrl}/issues.json?parent_id=${parentIssueId}`;

  const options = {
    method: 'get',
    contentType: 'application/json',
    headers: { 'X-Redmine-API-Key': globalConfig.token },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();
  const body = response.getContentText();

  Logger.log(`Get subtasks - Status: ${status}`);

  if (status >= 200 && status < 300) {
    const data = JSON.parse(body);
    return data.issues || [];
  } else {
    throw new Error(`Redmine API error khi lấy subtasks (${status}): ${body}`);
  }
}

/**
 * Update một issue trên Redmine
 * @param {number} issueId - ID của issue cần update
 * @param {Object} updateData - Dữ liệu cần update
 * @returns {boolean} True nếu thành công
 */
function updateRedmineIssue(issueId, updateData) {
  const url = `${globalConfig.baseRedmineUrl}/issues/${issueId}.json`;

  const issueData = {
    issue: updateData
  };

  const options = {
    method: 'put',
    contentType: 'application/json',
    headers: { 'X-Redmine-API-Key': globalConfig.token },
    payload: JSON.stringify(issueData),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();
  const body = response.getContentText();

  Logger.log(`Update issue ${issueId} - Status: ${status}`);

  if (status >= 200 && status < 300) {
    return true;
  } else {
    throw new Error(`Redmine API error khi update issue ${issueId} (${status}): ${body}`);
  }
}

// ============================================================================
// TASK CLOSE HELPER FUNCTIONS
// ============================================================================

/**
 * Tạo update data cho subtask với dates và custom fields
 * @param {Object} subtask - Subtask object từ Redmine API
 * @param {Object} rowData - Dữ liệu hàng từ sheet
 * @param {number} statusId - Status ID cần set
 * @returns {Object} Update data object
 */
function buildSubtaskUpdateData(subtask, rowData, statusId) {
  const actStartField = subtask.custom_fields.find(f => f.id === 10);
  const actFinishField = subtask.custom_fields.find(f => f.id === 5);
  
  const updateData = {
    status_id: statusId
  };

  // Chỉ set done_ratio và dates khi chuyển sang Completed
  if (statusId === REDMINE_STATUS.COMPLETED) {
    updateData.done_ratio = 100;
    updateData.start_date = subtask.start_date || convertToDatePlus7(rowData["Start date"]);
    updateData.due_date = subtask.due_date || convertToDatePlus7(rowData["Due date"]);
    updateData.custom_fields = [
      { id: 10, value: actStartField?.value || convertToDatePlus7(rowData["Act.Start"]) },
      { id: 5, value: actFinishField?.value || convertToDatePlus7(rowData["Act.Finish"]) }
    ];
  }

  return updateData;
}

/**
 * Update trạng thái của tất cả subtasks
 * @param {Array} subtasks - Mảng subtasks
 * @param {Object} rowData - Dữ liệu hàng từ sheet
 */
function updateAllSubtasks(subtasks, rowData) {
  // Bước 1: Set tất cả subtasks sang Completed
  for (let i = 0; i < subtasks.length; i++) {
    const subtask = subtasks[i];
    const updateData = buildSubtaskUpdateData(subtask, rowData, REDMINE_STATUS.COMPLETED);
    Logger.log(`Cập nhật subtask ${subtask.id} sang Completed`);
    updateRedmineIssue(subtask.id, updateData);
  }

  // Bước 2: Set tất cả subtasks sang Closed
  for (let i = 0; i < subtasks.length; i++) {
    const subtask = subtasks[i];
    const updateData = buildSubtaskUpdateData(subtask, rowData, REDMINE_STATUS.CLOSED);
    Logger.log(`Cập nhật subtask ${subtask.id} sang Closed`);
    updateRedmineIssue(subtask.id, updateData);
  }
}

/**
 * Tạo update data cho parent task
 * @param {Object} rowData - Dữ liệu hàng từ sheet
 * @returns {Object} Update data object
 */
function buildParentTaskUpdateData(rowData) {
  return {
    done_ratio: 100,
    status_id: REDMINE_STATUS.COMPLETED,
    start_date: rowData["Start date"] ? convertToDatePlus7(rowData["Start date"]) : null,
    due_date: rowData["Due date"] ? convertToDatePlus7(rowData["Due date"]) : null,
    custom_fields: [
      { id: 10, value: rowData["Act.Start"] ? convertToDatePlus7(rowData["Act.Start"]) : '' },
      { id: 5, value: rowData["Act.Finish"] ? convertToDatePlus7(rowData["Act.Finish"]) : '' }
    ]
  };
}

/**
 * Đóng một task Redmine (bao gồm subtasks và parent task)
 * @param {number} redmineId - ID của task cần đóng
 * @param {Object} rowData - Dữ liệu hàng từ sheet
 * @returns {Object} Kết quả với success và message
 */
function closeRedmineTask(redmineId, rowData) {
  try {
    // Bước 1: Lấy danh sách subtasks
    Logger.log(`Đang lấy subtasks của issue ${redmineId}`);
    const subtasks = getSubtasks(redmineId);
    
    if (subtasks.length === 0) {
      return { success: false, message: "Task không có subtasks để đóng" };
    }

    Logger.log(`Tìm thấy ${subtasks.length} subtasks`);

    // Bước 2: Update tất cả subtasks
    updateAllSubtasks(subtasks, rowData);

    // Bước 3: Update parent task
    Logger.log(`Cập nhật task cha ${redmineId} sang Completed`);
    const parentUpdateData = buildParentTaskUpdateData(rowData);
    updateRedmineIssue(redmineId, parentUpdateData);

    return { 
      success: true, 
      message: `Đã đóng thành công ${subtasks.length} subtasks và task #${redmineId}` 
    };
  } catch (error) {
    Logger.log('Lỗi khi đóng task: ' + error.toString());
    return { 
      success: false, 
      message: `Lỗi: ${error.toString()}` 
    };
  }
}

/**
 * Trích xuất thông tin tasks từ một range
 * @param {Sheet} sheet - Sheet object
 * @param {Range} range - Range object
 * @param {Array} headers - Mảng headers từ hàng 1
 * @param {number} redmineIdIndex - Index của cột RedmineID
 * @returns {Array} Mảng các task objects
 */
function extractTasksFromRange(sheet, range, headers, redmineIdIndex) {
  const tasks = [];
  const startRow = range.getRow();
  const numRows = range.getNumRows();
  const lastCol = sheet.getLastColumn();
  
  // Tìm index của cột RM Status
  const rmStatusIndex = headers.indexOf('RM Status');
  
  for (let i = 0; i < numRows; i++) {
    const currentRow = startRow + i;
    const rowData = sheet.getRange(currentRow, 1, 1, lastCol).getValues()[0];
    
    // Tạo object từ headers và rowData
    const rowObject = {};
    for (let j = 0; j < headers.length; j++) {
      rowObject[headers[j]] = rowData[j];
    }

    const redmineId = rowObject.RedmineID;
    const rmStatus = rmStatusIndex >= 0 ? rowData[rmStatusIndex] : '';
    
    // Bỏ qua các row đã được đóng
    if (rmStatus === TEXT_RM_STATUS.CLOSED) {
      Logger.log(`Bỏ qua hàng ${currentRow} - Task #${redmineId} đã được đóng`);
      continue;
    }
    
    if (redmineId) {
      tasks.push({ row: currentRow, redmineId: redmineId, data: rowObject });
    }
  }
  
  return tasks;
}
