function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Redmine Menu')  // Tên menu xuất hiện trên thanh công cụ
    .addItem('Create Task by selected row', 'selectedRowCreateRedmineTask') 
    .addItem('Close Task by selected row', 'selectedRowCloseRedmineTask') 
    .addToUi();
}

const globalConfig = {
  baseRedmineUrl: 'https://redmine.vietis.com.vn:93/redmine',
  project_id: 408,
  assigned_to_id: 118,
  tracker_id: 8,
  priority_id: 2,
  status_id: 11,
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
      status_id: globalConfig.status_id,
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
    SpreadsheetApp.getUi().alert("Đã selected row đã có Redmine task");
    return 0;
  }
  const taskId = content["Task Id"];
  if (undefined === taskId || taskId === "") {
    SpreadsheetApp.getUi().alert("Lỗi khi tạo task ở Redmine: taskId is empty");
    return 1;
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
// TODO: Cần implement theo hướng dẫn trong prompt-close.md
function selectedRowCloseRedmineTask() {}

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
