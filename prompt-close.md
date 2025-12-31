viết hàm selectedRowCloseRedmineTask

1. xử lý lấy subtasks . Tham khảo get_subtask.md
2. Xử lý update từng subtask ( tham khảo update_subtask-api.md )
    2.1 Cập nhật các thông tin sau:
        - done_ratio: 100
         - status: Completed
          - set  nếu chưa có: -start_date, due_date,  "Act.Start","Act.Finish",

    2.2
        Sau khi run xong 2.1 mới run 2.2
        Cập nhật các thông tin sau:
             - status: Closed