# Thư mục bài hát

Mỗi folder con được tự động nhận diện thành một bài hát. Không cần sửa `data/songs.ts`:

```text
public/songs/
└── con-mua-thang-5/
    ├── info.txt
    ├── audio.mp3
    └── lyrics.txt
```

Nội dung `info.txt`:

```text
Tên bài hát: Cơn mưa tháng 5
Người sáng tác: Bức Tường
```

Tên ba file bên trong luôn là `info.txt`, `audio.mp3` và `lyrics.txt`. Có thể thêm `Thứ tự: 1` vào `info.txt` nếu muốn tự sắp xếp; nếu không, danh sách được xếp theo tên bài hát.

Sau khi thêm/xóa folder, hãy khởi động lại `npm run dev`. Khi deploy Vercel, catalog được quét lại tự động ở bước build.

`lyrics.txt` chấp nhận hai định dạng:

```text
00:18.66
Nội dung dòng lyric

00:26.30
Nội dung dòng tiếp theo
```

hoặc:

```text
[00:18.66]Nội dung dòng lyric
[00:26.30]Nội dung dòng tiếp theo
```
