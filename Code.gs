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


// Hàm chính: ghi nội dung vào cột của hàng đang chọn
function writeTextToSelectedRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = sheet.getActiveRange(); // Lấy ô được chọn
  if (!range) {
    SpreadsheetApp.getUi().alert("Vui lòng chọn một ô trong hàng muốn ghi.");
    return;
  }

  var row = range.getRow(); // Lấy số hàng
  var column = 1; // Ví dụ: ghi vào cột B, bạn có thể thay bằng số cột mong muốn
  var content = "redmine id hâha";

  sheet.getRange(row, column).setValue(content);
  SpreadsheetApp.getUi().alert("Đã ghi vào hàng " + row + ", cột " + column);
}

// Hàm cho menu 'Create Task by selected row'
function selectedRowCreateRedmineTask() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = sheet.getActiveRange(); // Lấy ô được chọn
  if (!range) {
    SpreadsheetApp.getUi().alert("Vui lòng chọn một ô trong hàng muốn ghi.");
    return;
  }

  var row = range.getRow(); // Lấy số hàng
  var column = 1; //  Cột Đầu tiên
  var content = getSelectedRowJsonData();
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
  var parseInputCreate = {
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
    var newTaskId  = redmineTask?.issue?.id;
    sheet.getRange(row, column).setValue(newTaskId);

    // create sub Tasks
    
    var subTaskCodeInput = {
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

    var subTaskTestInput = {
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


function writeJsonToSelectedRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = sheet.getActiveRange(); // Lấy ô được chọn
  if (!range) {
    SpreadsheetApp.getUi().alert("Vui lòng chọn một ô trong hàng muốn ghi.");
    return;
  }

  var row = range.getRow(); // Lấy số hàng
  var column = 1; // Ví dụ: ghi vào cột B, bạn có thể thay bằng số cột mong muốn
  
  var content = JSON.stringify(getSelectedRowJsonData());

    Logger.log('Payload prepared: ' + JSON.stringify(payload)); 

  sheet.getRange(row, column).setValue(content);
  SpreadsheetApp.getUi().alert("Đã ghi vào hàng " + row + ", cột " + column);
}

/*
  GET JSON data from selected row
*/
function getSelectedRowJsonData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = sheet.getActiveRange(); // Lấy ô được chọn
  if (!range) {
    SpreadsheetApp.getUi().alert("Vui lòng chọn một ô trong hàng muốn ghi.");
    return;
  }

  var row = range.getRow(); // Lấy số hàng
  

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



// Hàm chính ghi text vào ô
function writeText(addressCell, content) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(addressCell).setValue(content);
}

// Hàm wrapper cho menu
function writeTextButton() {
  writeText("B2", "Hello from Menu!");
}

/*
index start from 1
*/
function getColumnIndex(letter) {
  const alphabetArray = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
  return alphabetArray.indexOf(letter.toUpperCase()) + 1;
}

// function writeText(addressCell, content) {
//   // Lấy sheet hiện tại (hoặc thay bằng tên sheet)
//   var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
//   // Ghi content vào ô addressCell (ví dụ "A1")
//   sheet.getRange(addressCell).setValue(content);
// }
// function writeTextButton() {
//   // Lấy sheet hiện tại
//   var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
//   // Xác định ô cần ghi (ví dụ B2)
//   var addressCell = "B2";
  
//   // Nội dung muốn ghi
//   var content = "Hello from Button!";
  
//   // Ghi vào ô
//   sheet.getRange(addressCell).setValue(content);
// }

/**
 * Chức năng Installable OnEdit Trigger.
 * Được kích hoạt khi người dùng chỉnh sửa dữ liệu trong bảng tính.
 * CẦN được cài đặt thủ công trong mục Triggers (Bộ kích hoạt).
 * * @param {object} e Đối tượng sự kiện (Event Object) chứa thông tin về lần chỉnh sửa.
 */


function checkAndCallAPI(e) {
  // --- 1. KHAI BÁO HẰNG SỐ VÀ CẤU HÌNH ---
  const TARGET_SHEET = 'tasks';

  const TRIGGER_1_COLUMN_INDEX = getColumnIndex('E'); 
  const TRIGGER_2_COLUMN_INDEX = getColumnIndex('F'); ; // Cột O (A=1, B=2, ..., O=15)
  const ID_RESULT_COLUMN_INDEX = getColumnIndex('A'); 
  
  // THAY THẾ bằng URL API thực tế của hệ thống của bạn
  const API_URL = 'https://api.your-system.com/create-data'; 
  
  // Lấy thông tin từ sự kiện
  const range = e.range;
  const sheet = range.getSheet();
  const row = range.getRow();
  
  // Ghi log thời gian và các keys của đối tượng sự kiện
  Logger.log('Execution Time: ' + new Date());
  Logger.log('Event Keys: ' + Object.keys(e).join(', '));
  Logger.log('Row: ' + row + ', Column: ' + range.getColumn() + ', New Value: ' + e.value);

  // --- 2. KIỂM TRA ĐIỀU KIỆN KÍCH HOẠT ---

  // Kiểm tra tên Sheet
  if (sheet.getName() !== TARGET_SHEET) {
    Logger.log('Skipping: Not the target sheet (' + TARGET_SHEET + ')');
    return;
  }
  
  // Kiểm tra cột kích hoạt (Cột O)
  if (!(range.getColumn() === TRIGGER_2_COLUMN_INDEX && e.value % 2 === 1 && e.value - e.oldValue == 1)) {
    Logger.log('Skipping: Condition not met' + JSON.stringify({value: e.value, oldValue: e.oldValue, column: range.getColumn()}))
    return;
  }
  
  const lastCol = sheet.getLastColumn();
  // Lấy toàn bộ dữ liệu của hàng hiện tại
  const rowData = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
  const ver1Value = rowData[TRIGGER_1_COLUMN_INDEX-1];
  const ver2Value = rowData[TRIGGER_2_COLUMN_INDEX-1];
  Logger.log('ver1Value: '+ ver1Value+ ' '+ 'ver2Value: '+ ver2Value, rowData);
  if (ver1Value !== ver2Value) {
    Logger.log('Skipping: Condition ver1Value != ver2Value');
    return 1;
  }
 
  // --- 3. LẤY DỮ LIỆU, GỌI API VÀ GHI KẾT QUẢ ---
  
  try {
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



    Logger.log('Payload prepared: ' + JSON.stringify(payload)); 
    return 0;
    // Cấu hình tham số gọi API
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      // Quan trọng: Truyền dữ liệu dưới dạng chuỗi JSON
      'payload': JSON.stringify(payload), 
      // Bật tùy chọn này để script không crash khi API trả về lỗi (4xx, 5xx)
      'muteHttpExceptions': true 
    };
    console.log('options', options);
    /*
    // GỌI API
    const response = UrlFetchApp.fetch(API_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    // Xử lý lỗi HTTP
    if (responseCode !== 200 && responseCode !== 201) {
      Logger.log('API Call Failed. Code: ' + responseCode + ', Response: ' + responseText);
      sheet.getRange(row, ID_RESULT_COLUMN_INDEX).setValue('API_ERROR ' + responseCode + ': ' + responseText.substring(0, 50));
      return;
    }
    
    // Xử lý thành công
    const responseJson = JSON.parse(responseText);
    
    // Giả định API trả về ID trong trường 'id'. Thay thế 'id' nếu key khác
    const newId = responseJson.id || responseJson.ID || 'ID_NOT_FOUND';
    
    // Ghi ID vào cột P (ID_RESULT_COLUMN_INDEX)
    sheet.getRange(row, ID_RESULT_COLUMN_INDEX).setValue(newId);
    */
    // Logger.log('API call successful. New ID written to P: ' + newId);
    
  } catch (error) {
    Logger.log('An unexpected error occurred during execution: ' + error.toString());
    sheet.getRange(row, ID_RESULT_COLUMN_INDEX).setValue('SCRIPT_ERROR: ' + error.toString());
  }
}
