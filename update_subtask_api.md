curl --location --request PUT 'https://redmine.vietis.com.vn:93/redmine/issues/189873.json' \
--header 'Content-Type: application/json' \
--header 'X-Redmine-API-Key: 1be2213e8a2f2054bcea2bdee527d71b0f3cfbe5' \
--data '{
    "issue": {
        "id": 216840,
        "parent_issue_id": 182973,
        "project": {
            "id": 408,
            "name": "ProjectDesign.MaintainSubsidy"
        },
        "tracker": {
            "id": 8,
            "name": "TASK"
        },
        "status": {
            "id": 11,
            "name": "Open"
        },
        "priority": {
            "id": 2,
            "name": "Normal"
        },
        "author": {
            "id": 118,
            "name": "ha.ngocam"
        },
        "assigned_to": {
            "id": 118,
            "name": "ha.ngocam"
        },
        "subject": "Test task from API 12",
        "description": "This task was created via Redmine API",
        "start_date": "2025-11-14",
        "due_date": "2025-11-15",
        "done_ratio": 0,
        "is_private": false,
        "estimated_hours": 0.0,
        "total_estimated_hours": 0.0,
        "custom_fields": [
            {
                "id": 1,
                "name": "RQ Code",
                "value": "-"
            },
            {
                "id": 10,
                "name": "Act.Start",
                "value": "2025-11-16"
            },
            {
                "id": 5,
                "name": "Act.Finish",
                "value": "2025-11-17"
            },
            {
                "id": 63,
                "name": "Target",
                "value": "(none)"
            }
        ],
        "created_on": "2025-11-13T07:20:43Z",
        "updated_on": "2025-11-13T07:20:43Z",
        "closed_on": null
    }
}'