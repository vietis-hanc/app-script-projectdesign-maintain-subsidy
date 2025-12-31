postman request 'https://redmine.vietis.com.vn:93/redmine/issues.json?parent_id=222795' \
  --header 'Content-Type: application/json' \
  --header 'X-Redmine-API-Key: 1be2213e8a2f2054bcea2bdee527d71b0f3cfbe5'

Lấy danh sách sub tasks
 - id
 - status object
 - done_ratio
 - start_date
-  due_date

- custom fields
 {
"id": 10,
"name": "Act.Start",
"value": "2025-12-31"
},
{
"id": 5,
"name": "Act.Finish",
"value": "2025-12-31"
},



api Response:
{
    "issues": [
        {
            "id": 222797,
            "project": {
                "id": 408,
                "name": "ProjectDesign.MaintainSubsidy"
            },
            "tracker": {
                "id": 8,
                "name": "TASK"
            },
            "status": {
                "id": 7,
                "name": "Completed"
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
            "parent": {
                "id": 222795
            },
            "subject": "[F-473] Testing",
            "description": "https://gitlab.com/projkevin/finance-in-japan/-/issues/473",
            "start_date": "2025-12-31",
            "due_date": "2025-12-31",
            "done_ratio": 0,
            "is_private": false,
            "estimated_hours": 1.0,
            "custom_fields": [
                {
                    "id": 1,
                    "name": "RQ Code",
                    "value": "-"
                },
                {
                    "id": 10,
                    "name": "Act.Start",
                    "value": "2025-12-31"
                },
                {
                    "id": 5,
                    "name": "Act.Finish",
                    "value": "2025-12-31"
                },
                {
                    "id": 63,
                    "name": "Target",
                    "value": "(none)"
                }
            ],
            "created_on": "2025-12-31T09:06:56Z",
            "updated_on": "2025-12-31T09:15:43Z",
            "closed_on": null
        },
        {
            "id": 222796,
            "project": {
                "id": 408,
                "name": "ProjectDesign.MaintainSubsidy"
            },
            "tracker": {
                "id": 8,
                "name": "TASK"
            },
            "status": {
                "id": 7,
                "name": "Completed"
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
            "parent": {
                "id": 222795
            },
            "subject": "[F-473] Coding",
            "description": "https://gitlab.com/projkevin/finance-in-japan/-/issues/473",
            "start_date": "2025-12-31",
            "due_date": "2025-12-31",
            "done_ratio": 30,
            "is_private": false,
            "estimated_hours": 3.0,
            "custom_fields": [
                {
                    "id": 1,
                    "name": "RQ Code",
                    "value": "-"
                },
                {
                    "id": 10,
                    "name": "Act.Start",
                    "value": "2025-12-31"
                },
                {
                    "id": 5,
                    "name": "Act.Finish",
                    "value": "2025-12-31"
                },
                {
                    "id": 63,
                    "name": "Target",
                    "value": "(none)"
                }
            ],
            "created_on": "2025-12-31T09:06:56Z",
            "updated_on": "2025-12-31T09:23:40Z",
            "closed_on": null
        }
    ],
    "total_count": 2,
    "offset": 0,
    "limit": 25
}