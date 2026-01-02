# Sử dụng như Library

## Cách thêm Library vào Google Sheet mới

### Bước 1: Thêm Library
1. Mở Google Sheet mới
2. Mở **Extensions** > **Apps Script**
3. Click biểu tượng **+** bên cạnh **Libraries**
4. Nhập Script ID: `12k1phNibJ6cAESKI3fpAMMHsr4j5Wv5spu1tljnJvgwiikAouA`
5. Click **Look up**
6. Chọn phiên bản (thường là **HEAD** cho development)
7. Đặt Identifier: `AppScriptProjectDesignMaintainSubsidy`
8. Click **Add**

### Bước 2: Sử dụng trong Code

#### Ví dụ 1: Setup menu đơn giản
```javascript
function onOpen() {
  // Gọi trực tiếp function setup menu từ library
  AppScriptProjectDesignMaintainSubsidy.setupRedmineMenu();
}
```

#### Ví dụ 2: Sử dụng với custom config
```javascript
function onOpen() {
  var lib = AppScriptProjectDesignMaintainSubsidy;
  
  // Override config nếu cần (project khác, token khác)
  lib.setCustomConfig({
    project_id: 999,  // Project ID khác
    assigned_to_id: 123,  // User ID khác
    token: 'your-api-token-here'
  });
  
  // Setup menu
  lib.setupRedmineMenu();
}
```

#### Ví dụ 3: Gọi trực tiếp API functions
```javascript
function customCreateTask() {
  var lib = AppScriptProjectDesignMaintainSubsidy;
  
  // Lấy config
  var config = lib.getConfig();
  console.log('Current config:', config);
  
  // Tạo issue
  var issue = lib.createIssue({
    subject: '[TASK-001] Test task',
    description: 'Task description',
    parent_issue_id: 182973,
    start_date: '2026-01-01',
    due_date: '2026-01-31',
    done_ratio: 0,
    estimated_hours: 8
  });
  
  console.log('Created issue:', issue);
}
```

#### Ví dụ 4: Đóng task programmatically
```javascript
function customCloseTask() {
  var lib = AppScriptProjectDesignMaintainSubsidy;
  
  var rowData = {
    "RedmineID": 183000,
    "Start date": "2026-01-01T00:00:00Z",
    "Due date": "2026-01-31T00:00:00Z",
    "Act.Start": "2026-01-01T00:00:00Z",
    "Act.Finish": "2026-01-31T00:00:00Z"
  };
  
  var result = lib.closeTask(183000, rowData);
  
  if (result.success) {
    console.log('Task closed successfully');
  } else {
    console.error('Error:', result.message);
  }
}
```

#### Ví dụ 5: Lấy và xử lý subtasks
```javascript
function listSubtasks() {
  var lib = AppScriptProjectDesignMaintainSubsidy;
  var parentId = 183000;
  
  var subtasks = lib.getIssueSubtasks(parentId);
  
  subtasks.forEach(function(subtask) {
    console.log('Subtask ID:', subtask.id);
    console.log('Subject:', subtask.subject);
    console.log('Status:', subtask.status.name);
    console.log('Done ratio:', subtask.done_ratio);
    console.log('---');
  });
}
```

## Public API Functions

### Menu Functions
- `setupRedmineMenu()` - Setup menu trong sheet
- `createTaskFromSelection()` - Tạo task từ hàng chọn
- `closeTasksFromSelection()` - Đóng tasks từ hàng chọn

### Configuration
- `getConfig()` - Lấy config hiện tại
- `setCustomConfig(customConfig)` - Set custom config

### Core API Functions
- `createIssue(input)` - Tạo issue mới
- `getIssueSubtasks(parentId)` - Lấy subtasks
- `updateIssue(issueId, updateData)` - Update issue
- `closeTask(redmineId, rowData)` - Đóng task

### Utility Functions
- `convertDate(isoString)` - Convert date to +7 timezone
- `getRowData()` - Lấy data từ hàng được chọn

## Sheet Structure Requirements

Library này yêu cầu sheet phải có các cột sau:

| Column | Name | Description |
|--------|------|-------------|
| A | RedmineID | ID của task trên Redmine (tự động fill) |
| B | Task Id | ID task trong hệ thống nội bộ |
| C | RM Status | Status hiển thị (open/closed) |
| ... | Description | Mô tả task |
| ... | Url | URL GitLab hoặc link liên quan |
| ... | sub_project | FinanceInJapan hoặc TossWorks |
| ... | Start date | Ngày bắt đầu (ISO format) |
| ... | Due date | Ngày kết thúc (ISO format) |
| ... | Act.Start | Ngày bắt đầu thực tế |
| ... | Act.Finish | Ngày kết thúc thực tế |

## Notes

- Library sử dụng config mặc định từ `config.gs`
- Có thể override config bằng `setCustomConfig()`
- Tất cả functions đều log ra Logger, dùng `View > Logs` để debug
- Menu chỉ hoạt động khi reload sheet hoặc gọi `onOpen()` manually

## Troubleshooting

**Lỗi: "Cannot find function setupRedmineMenu"**
- Kiểm tra Identifier đã đúng: `AppScriptProjectDesignMaintainSubsidy`
- Kiểm tra library đã được add và enabled

**Lỗi: "Redmine API error"**
- Kiểm tra token còn hợp lệ không
- Kiểm tra project_id và user permissions

**Menu không xuất hiện**
- Reload sheet hoặc chạy `onOpen()` manually
- Authorize permissions khi được hỏi
