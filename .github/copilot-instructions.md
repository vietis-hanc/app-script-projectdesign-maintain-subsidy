# GitHub Copilot Instructions

## Project Overview
This is a Google Apps Script project that integrates Google Sheets with Redmine API for project task management. It's specifically designed for the "ProjectDesign.MaintainSubsidy" project (ID: 408) to automate task creation and closure workflows.

## Architecture & Components

### Core Integration Pattern
- **Google Sheets** → **Apps Script Menu** → **Redmine API** (https://redmine.vietis.com.vn:93/redmine)
- The script adds a custom menu "Redmine Menu" with operations to create/close tasks from selected spreadsheet rows
- Each row in the "tasks" sheet represents a task with columns mapped to Redmine fields

### Key Configuration (`globalConfig`)
```javascript
project_id: 408              // ProjectDesign.MaintainSubsidy
assigned_to_id: 118          // ha.ngocam
tracker_id: 8                // TASK type
priority_id: 2               // Normal priority
status_id: 11                // Default status for new tasks
```

### Sub-Project Mapping
Tasks are organized under two sub-projects:
- `"FinanceInJapan"` → parent_issue_id: 182973
- `"TossWorks"` → parent_issue_id: 182974

## Critical Workflows

### Creating Tasks (`selectedRowCreateRedmineTask`)
1. Validates selected row has no existing `RedmineID` and has valid `Task Id`
2. Creates parent task with subject format: `[TaskId] Description`
3. **Automatically creates 2 subtasks**:
   - `[TaskId] Coding` (3 hours estimated)
   - `[TaskId] Testing` (1 hour estimated)
4. Writes returned Redmine ID to column A of the selected row

### Closing Tasks (`selectedRowCloseRedmineTask`)
Implementation required (see [prompt-close.md](prompt-close.md)):
1. Fetch subtasks via GET `/issues.json?parent_id={id}`
2. Update each subtask to:
   - `done_ratio: 100`
   - `status: Completed`
   - Set dates if missing: `start_date`, `due_date`, custom fields `Act.Start` (id:10), `Act.Finish` (id:5)

### Date Handling Convention
- All dates convert from ISO strings to `YYYY-MM-DD` in `Asia/Bangkok` timezone (UTC+7)
- Use `convertToDatePlus7()` for all date transformations
- Custom fields for actual dates: `Act.Start` (field id:10), `Act.Finish` (field id:5)

## Redmine API Patterns

### Authentication
Always include header: `'X-Redmine-API-Key': globalConfig.token`

### Creating Issues
```javascript
POST /issues.json
{
  issue: {
    project_id, subject, description, assigned_to_id, tracker_id,
    priority_id, status_id, parent_issue_id, done_ratio,
    estimated_hours, start_date, due_date,
    custom_fields: [
      { id: 10, value: act_start },  // Act.Start
      { id: 5, value: act_finish }   // Act.Finish
    ]
  }
}
```

### Fetching Subtasks
```javascript
GET /issues.json?parent_id={parent_id}
// Returns array with: id, status, done_ratio, start_date, due_date, custom_fields
```

## Sheet Structure & Column Mapping
Headers from row 1 map to JSON keys. Critical columns:
- Column A: `RedmineID` (written after task creation)
- `Task Id`: Required identifier, used in task subject
- `Description`: Becomes task subject (with Task Id prefix)
- `Url`: Becomes task description (typically GitLab issue link)
- `sub_project`: Maps to parent_issue_id via `subProjects` object
- `Start date`, `Due date`, `Act.Start`, `Act.Finish`: Date fields

The `getSelectedRowJsonData()` function dynamically builds payload from headers and row values.

## Development Notes

### Code Organization Principles
- **Always divide and conquer**: Break down complex logic into smaller, manageable pieces
- **Modularize**: Organize code into logical modules/sections with clear responsibilities
- **Functionalize**: Extract reusable logic into separate functions rather than duplicating code
- **Maximize reusability**: Design functions to be generic and reusable across different contexts

### Error Handling Pattern
- Use `muteHttpExceptions: true` in `UrlFetchApp.fetch()` options
- Check response status codes explicitly (200-299 = success)
- Display user-friendly alerts via `SpreadsheetApp.getUi().alert()`

### Testing & Debugging
- Use `Logger.log()` for debugging (view via Execution log)
- Test API calls via Postman with sample requests in [get_subtask.md](get_subtask.md)
- API token in code is for ha.ngocam user (ID: 118)

### Active Development Tasks
- `selectedRowCloseRedmineTask()` function needs implementation (see [prompt-close.md](prompt-close.md))
- Legacy trigger function `checkAndCallAPI()` exists but appears unused

## Important Constraints
- All operations target the "tasks" sheet specifically
- Tasks require valid Task Id before creation
- Prevent duplicate task creation by checking existing RedmineID
- Subtasks inherit dates/custom fields from parent task data

## 