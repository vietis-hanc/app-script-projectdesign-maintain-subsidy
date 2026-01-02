function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Redmine Menu')  // Tên menu xuất hiện trên thanh công cụ
    .addItem('Create Task by selected row', 'selectedRowCreateRedmineTask') 
    .addItem('Close Tasks by selected row', 'selectedRowCloseRedmineTasks') 
    .addToUi();
}

const globalConfig = {
  baseRedmineUrl: 'https://redmine.vietis.com.vn:93/redmine',
  project_id: 408,
  assigned_to_id: 118,
  tracker_id: 8,
  priority_id: 2,
  status_id: 11, // OPEN - sẽ được thay bằng REDMINE_STATUS.OPEN sau khi khai báo constants
  token: '1be2213e8a2f2054bcea2bdee527d71b0f3cfbe5'
};

/*
  REQ #182973: FinanceInJapan
  REQ #182974: TossWorks
*/
const subProjects = {
  "FinanceInJapan": 182973,
 "TossWorks": 182974,
}

// Redmine Status IDs
const REDMINE_STATUS = {
  OPEN: 11,
  COMPLETED: 7,
  CLOSED: 5
};

const COLUMN_INDEXS = {
  REDMINE_ID: 1,
  RM_STATUS: 3,
}

const TEXT_RM_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
}

function convertToDatePlus7(isoString) {
  // Tạo đối tượng Date từ chuỗi ISO (UTC)
  const date = new Date(isoString);
  
  // Chuyển sang múi giờ +7 (Asia/Bangkok)
  const formatted = Utilities.formatDate(date, "Asia/Bangkok", "yyyy-MM-dd");
  
  return formatted;
}

/**
 * Tạo issue mới trên Redmine
 * @param {Object} input
 * @param {string} input.subject - Tiêu đề task
 * @param {string} input.description - Mô tả task
 * @param {number} [input.parent_issue_id] - ID task cha (nếu có)
 * @param {string} [input.start_date] - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} [input.due_date] - Ngày kết thúc (YYYY-MM-DD)
 * @param {string} [input.act_start] - Custom field #10
 * @param {string} [input.act_finish] - Custom field #5
 * @param {number} [input.done_ratio] - % hoàn thành (0–100)
 * @param {number} [input.estimated_hours] - Số giờ ước lượng
 */
function createRedmineIssue(input) {
  const url = `${globalConfig.baseRedmineUrl}/issues.json`;

  // Cấu trúc issue JSON theo Redmine API
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
 * Ghi status vào sheet
 * @param {Sheet} sheet - Sheet object
 * @param {number} row - Số hàng
 * @param {string} status - Status text cần ghi
 */
function writeTaskStatusToSheet(sheet, row, status) {
  const column = COLUMN_INDEXS.RM_STATUS; // RM Status column
  sheet.getRange(row, column).setValue(status);
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

// Hàm cho menu 'Create Task by selected row'
function selectedRowCreateRedmineTask() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange(); // Lấy ô được chọn
  if (!range) {
    SpreadsheetApp.getUi().alert("Vui lòng chọn một ô trong hàng muốn ghi.");
    return;
  }

  const row = range.getRow(); // Lấy số hàng
  const column = 1; //  Cột Đầu tiên
  const content = getSelectedRowJsonData();
  console.log('content', content);
  
  // check đã có task rồi thì thôi
  if (content && content.RedmineID) {
    SpreadsheetApp.getUi().alert("Hàng được chọn đã có Redmine task");
    return;
  }
  
  const taskId = content["Task Id"];
  if (undefined === taskId || taskId === "") {
    SpreadsheetApp.getUi().alert("Lỗi khi tạo task ở Redmine: taskId is empty");
    return;
  }
  
  const newTaskSubject = `[${taskId}] ${content.Description}`;
  const parseInputCreate = {
    subject: newTaskSubject,
    description: content.Url,
    parent_issue_id: subProjects[content.sub_project],
    start_date: convertToDatePlus7(content["Start date"]),
    due_date: convertToDatePlus7(content["Due date"]),
    act_start  : convertToDatePlus7(content["Act.Start"]),
    act_finish : convertToDatePlus7(content["Act.Finish"]),
    done_ratio: 0,
    estimated_hours:  0.0,
  };
  console.log('parseInputCreate', parseInputCreate);
  const redmineTask = createRedmineIssue(parseInputCreate);

  if (redmineTask && redmineTask?.issue && redmineTask?.issue?.id) {
    const newTaskId  = redmineTask?.issue?.id;
    sheet.getRange(row, column).setValue(newTaskId);

    // create sub Tasks
    
    const subTaskCodeInput = {
      subject: `[${taskId}] Coding`,
      description: content.Url,
      parent_issue_id: newTaskId,
      start_date: convertToDatePlus7(content["Start date"]),
      due_date: convertToDatePlus7(content["Due date"]),
      act_start  : convertToDatePlus7(content["Act.Start"]),
      act_finish : convertToDatePlus7(content["Act.Finish"]),
      done_ratio: 0,
      estimated_hours:  3,
    };
    createRedmineIssue(subTaskCodeInput);

    const subTaskTestInput = {
      subject: `[${taskId}] Testing`,
      description: content.Url,
      parent_issue_id: newTaskId,
      start_date: convertToDatePlus7(content["Start date"]),
      due_date: convertToDatePlus7(content["Due date"]),
      act_start  : convertToDatePlus7(content["Act.Start"]),
      act_finish : convertToDatePlus7(content["Act.Finish"]),
      done_ratio: 0,
      estimated_hours:  1,
    };
    createRedmineIssue(subTaskTestInput);
    SpreadsheetApp.getUi().alert("Đã tạo task thành công");
  } else {
    SpreadsheetApp.getUi().alert("Lỗi khi tạo task ở Redmine");
  }
}

// Hàm cho menu 'Close Task by selected row'
function selectedRowCloseRedmineTasks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rangeList = sheet.getActiveRangeList();
  
  if (!rangeList) {
    SpreadsheetApp.getUi().alert("Vui lòng chọn ít nhất một hàng muốn đóng task.");
    return;
  }

  const ranges = rangeList.getRanges();
  if (ranges.length === 0) {
    SpreadsheetApp.getUi().alert("Vui lòng chọn ít nhất một hàng muốn đóng task.");
    return;
  }

  // Kiểm tra tất cả các ranges phải chọn toàn bộ hàng
  const maxColumns = sheet.getMaxColumns();
  for (let i = 0; i < ranges.length; i++) {
    if (ranges[i].getNumColumns() !== maxColumns) {
      SpreadsheetApp.getUi().alert("Vui lòng chọn toàn bộ hàng (click vào số hàng bên trái).");
      return;
    }
  }

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Tìm index của cột RedmineID
  const redmineIdIndex = headers.indexOf('RedmineID');
  if (redmineIdIndex === -1) {
    SpreadsheetApp.getUi().alert("Không tìm thấy cột 'RedmineID' trong sheet");
    return;
  }

  // Thu thập thông tin các tasks cần đóng từ tất cả các ranges
  const tasksToClose = [];
  for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
    const range = ranges[rangeIndex];
    const tasksFromRange = extractTasksFromRange(sheet, range, headers, redmineIdIndex);
    tasksToClose.push(...tasksFromRange);
  }

  // Kiểm tra có task nào để đóng không
  if (tasksToClose.length === 0) {
    SpreadsheetApp.getUi().alert("Không có hàng nào có RedmineID để đóng task");
    return;
  }

  // Xác nhận trước khi đóng nhiều tasks
  const confirmMessage = tasksToClose.length === 1 
    ? `Xác nhận đóng task #${tasksToClose[0].redmineId}?`
    : `Xác nhận đóng ${tasksToClose.length} tasks?`;
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Xác nhận', confirmMessage, ui.ButtonSet.YES_NO);
  
  if (response !== ui.Button.YES) {
    return;
  }

  // Đóng từng task và thu thập kết quả
  const results = [];
  for (let i = 0; i < tasksToClose.length; i++) {
    const task = tasksToClose[i];
    Logger.log(`Đang xử lý task #${task.redmineId} ở hàng ${task.row}`);
    
    const result = closeRedmineTask(task.redmineId, task.data);
    results.push({ row: task.row, redmineId: task.redmineId, ...result });
    
    // Ghi status vào sheet
    if (result.success) {
      writeTaskStatusToSheet(sheet, task.row, TEXT_RM_STATUS.CLOSED);
    } else {
      // Ghi lỗi vào cột RM Status
      writeTaskStatusToSheet(sheet, task.row, result.message);
    }
  }

  // Hiển thị kết quả tổng hợp
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  let message = `Kết quả:\n- Thành công: ${successCount}\n- Thất bại: ${failCount}`;
  
  if (failCount > 0) {
    message += "\n\nCác task thất bại:\n";
    results.filter(r => !r.success).forEach(r => {
      message += `- Task #${r.redmineId} (hàng ${r.row}): ${r.message}\n`;
    });
  }
  
  SpreadsheetApp.getUi().alert(message);
}

/*
  GET JSON data from selected row
*/
function getSelectedRowJsonData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange(); // Lấy ô được chọn
  if (!range) {
    SpreadsheetApp.getUi().alert("Vui lòng chọn một ô trong hàng muốn ghi.");
    return;
  }

  const row = range.getRow(); // Lấy số hàng
  
  // Lấy tất cả tiêu đề (header) từ hàng 1
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  // Lấy toàn bộ dữ liệu của hàng hiện tại
  const rowData = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
  
  // Tạo JSON payload: Dùng tên cột (header) làm key
  let payload = {};
  for (let i = 0; i < headers.length; i++) {
    payload[headers[i]] = rowData[i];
  }

  return payload;
}

// ============================================================================
// CÁC HÀM THAM KHẢO (Reference functions for debugging/development)
// ============================================================================

// Ghi JSON của hàng được chọn vào cột A (dùng để debug/kiểm tra dữ liệu)
function writeJsonToSelectedRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveRange(); // Lấy ô được chọn
  if (!range) {
    SpreadsheetApp.getUi().alert("Vui lòng chọn một ô trong hàng muốn ghi.");
    return;
  }

  const row = range.getRow(); // Lấy số hàng
  const column = 1; // Cột A
  
  const content = JSON.stringify(getSelectedRowJsonData());
  Logger.log('Content: ' + content); 

  sheet.getRange(row, column).setValue(content);
  SpreadsheetApp.getUi().alert("Đã ghi vào hàng " + row + ", cột " + column);
}

// Ghi text vào ô bất kỳ theo địa chỉ (ví dụ: "B2")
function writeText(addressCell, content) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(addressCell).setValue(content);
}
