# Roadmap - AppScript ProjectDesign MaintainSubsidy

## ✅ Completed Features

### Phase 1: Core Functionality (Completed)
- [x] Menu integration với Google Sheets
- [x] Tạo Redmine tasks từ selected rows
- [x] Tự động tạo 2 subtasks (Coding + Testing)
- [x] Đóng tasks với validation
- [x] Support multiple row selection
- [x] Bắt buộc chọn toàn bộ hàng
- [x] Filter out closed tasks
- [x] Write error messages to RM Status column

### Phase 2: Code Organization (Completed)
- [x] Module hóa code thành config.gs, common.gs, Code.gs
- [x] Chia nhỏ functions theo nguyên tắc single responsibility
- [x] Tạo reusable utility functions
- [x] Library API cho reuse ở sheets khác

## 🚀 Upcoming Features

### Phase 3: Timesheet Management
**Priority: HIGH**

#### Feature 1: Monthly Timesheet Entry
**Mục tiêu**: Khai timesheet cả tháng bằng 1 sheet riêng, tự động sync vào Redmine

**Requirements**:
- Sheet template cho timesheet tháng:
  - Cột: Date | Task ID | Hours | Activity Type | Comments
  - Support nhập cho 1 tháng (rows cho từng ngày)
- Functions:
  - `setupTimesheetMenu()` - Add menu "Timesheet" với các options
  - `importMonthlyTimesheet()` - Import timesheet từ sheet khác
  - `syncTimesheetToRedmine()` - Sync time entries lên Redmine
  - `validateTimesheetData()` - Validate trước khi sync
- Validation:
  - Check task ID tồn tại trên Redmine
  - Check hours hợp lệ (> 0, <= 24)
  - Check date format và trong khoảng cho phép
  - Tổng hours mỗi ngày <= 24 hours
- Error handling:
  - Hiển thị errors trực tiếp trên sheet
  - Rollback nếu có lỗi ở giữa
  - Log chi tiết trong Logger

**Technical Design**:
```javascript
// New file: timesheet.gs
function syncMonthlyTimesheet(sheetName) {
  // 1. Read timesheet data from specified sheet
  // 2. Validate all entries
  // 3. Group by task ID
  // 4. Call Redmine Time Entry API for each entry
  // 5. Update sync status on sheet
}

// Redmine Time Entry API
POST /time_entries.json
{
  "time_entry": {
    "issue_id": 123,
    "hours": 8,
    "activity_id": 9,
    "spent_on": "2026-01-15",
    "comments": "Working on feature X"
  }
}
```

**Dependencies**:
- Redmine Time Entry API
- New constants: ACTIVITY_TYPES mapping
- New sheet template: "Timesheet_Template"

**Estimated Effort**: 3-4 days

---

### Phase 4: Code Review Tasks
**Priority: MEDIUM**

#### Feature 2: Create Review Source Code Task
**Mục tiêu**: Tự động tạo task review source code với workflow đặc biệt

**Requirements**:
- Menu item mới: "Create Review Task by selected row"
- Function: `selectedRowCreateReviewTask()`
- Workflow khác với create task thường:
  - **Không** tạo subtasks Coding/Testing
  - Tạo 1 task chính với tracker_id = REVIEW (cần config)
  - Subject format: `[TaskId] Review: {Description}`
  - Estimated hours: 1-2 hours (configurable)
  - Activity type: Code Review
- Support:
  - Chọn multiple rows để tạo nhiều review tasks
  - Link review task với original task (parent_issue_id)
  - Auto assign cho reviewer (configurable)

**Technical Design**:
```javascript
// Add to config.gs
const TRACKER_TYPES = {
  TASK: 8,
  REVIEW: 10  // Cần check ID thực tế trên Redmine
};

// Add to Code.gs
function selectedRowCreateReviewTask() {
  // Similar to selectedRowCreateRedmineTask
  // BUT: No subtasks, different tracker_id
  // Subject: "[TaskId] Review: Description"
}
```

**Configuration Options**:
```javascript
const REVIEW_CONFIG = {
  tracker_id: 10,  // Code Review tracker
  estimated_hours: 1.5,
  default_reviewer_id: 118,  // ha.ngocam
  activity_id: 5  // Code Review activity
};
```

**Estimated Effort**: 1-2 days

---

## 🔮 Future Enhancements

### Phase 5: Advanced Features
- [ ] Bulk update task status
- [ ] Generate timesheet report từ Redmine
- [ ] Auto-calculate estimated hours based on description
- [ ] Integration với GitLab MR (link MR to task)
- [ ] Dashboard hiển thị task statistics
- [ ] Notification khi task gần deadline

### Phase 6: Optimization
- [ ] Cache Redmine API responses
- [ ] Batch API calls để giảm request
- [ ] Async processing cho large datasets
- [ ] Error retry mechanism với exponential backoff

---

## 📋 Implementation Order

1. **Monthly Timesheet Entry** (Phase 3) - HIGH priority
   - Create timesheet.gs module
   - Add Time Entry API functions to common.gs
   - Create sheet template
   - Test with real data

2. **Create Review Task** (Phase 4) - MEDIUM priority
   - Add TRACKER_TYPES to config.gs
   - Add selectedRowCreateReviewTask() to Code.gs
   - Update menu in onOpen()
   - Test review workflow

3. **Future Enhancements** (Phase 5-6) - As needed
   - Prioritize based on user feedback
   - Implement incrementally

---

## 🎯 Success Metrics

- ✅ Reduce time spent on manual task creation by 80%
- 🎯 Reduce timesheet entry time from hours to minutes
- 🎯 Zero timesheet entry errors
- 🎯 100% code review tasks tracked properly
- 🎯 Library reused in at least 2 other projects

---

## 📝 Notes

- All new features must follow modular design principles
- Maintain backward compatibility with existing sheets
- Document all public API functions
- Add error handling and user-friendly messages
- Test thoroughly before deployment