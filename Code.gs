// ============================================================================
// MAIN MENU HANDLERS
// ============================================================================
// Dependencies: config.gs, common.gs

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Redmine Menu')
    .addItem('Create Task by selected row', 'selectedRowCreateRedmineTask') 
    .addItem('Close Tasks by selected row', 'selectedRowCloseRedmineTasks') 
    .addToUi();
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

// ============================================================================
// DEBUG & REFERENCE FUNCTIONS
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
