# Live Lyrics · Hòa Âm Hỏa Ý

Web lyric realtime dành cho chương trình **Hòa Âm Hỏa Ý**. Admin phát MP3 trên một máy; người tham gia xem nhóm câu trước/hiện tại/câu sau trên điện thoại mà không cần tải lại trang. Câu đang hát được in đậm theo kiểu Spotify.

## Chạy thử ngay

```bash
npm install
npm run dev
```

Mở hai tab cùng trình duyệt:

- Người xem: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

Khi chưa có biến môi trường Supabase, web tự chạy ở **Demo mode** bằng `BroadcastChannel` và `localStorage`. Chế độ này chỉ dùng để xem thử giữa các tab trên cùng trình duyệt.

## Cấu hình realtime cho chương trình

1. Tạo project trên Supabase.
2. Mở SQL Editor và chạy toàn bộ file `supabase/schema.sql`.
3. Sao chép `.env.example` thành `.env.local` và điền đủ bốn giá trị.
4. Deploy lên Vercel và thêm bốn biến môi trường tương tự trong Project Settings.

Không bao giờ đưa `SUPABASE_SECRET_KEY` hoặc `ADMIN_CONTROL_KEY` vào biến bắt đầu bằng `NEXT_PUBLIC_`.

Nếu đã tạo bảng từ bản source cũ, hãy chạy lại `supabase/schema.sql` một lần để bổ sung cột `duration_ms`. Cột này giúp mọi thiết bị dừng bộ đếm đúng thời lượng MP3.

## Deploy lên Vercel

1. Đưa source lên một repository GitHub; không commit `.env.local`.
2. Trong Vercel, chọn **Add New → Project**, import repository và giữ Framework Preset là **Next.js**.
3. Tại **Environment Variables**, thêm đủ:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `ADMIN_CONTROL_KEY`
4. Áp dụng cho Production, Preview và Development, sau đó chọn **Deploy**.
5. Nếu thêm hoặc sửa biến sau lần deploy đầu, tạo một deployment mới để bản build nhận giá trị mới.

Sau khi deploy, mở URL gốc trên điện thoại và `/admin` trên laptop. Cả hai phải hiện `LIVE`; nếu hiện `DEMO`, kiểm tra lại hai biến `NEXT_PUBLIC_` rồi redeploy.

## Thêm bài hát và lyric

1. Tạo một folder cho bài hát trong `public/songs/`.
2. Đặt `info.txt`, `audio.mp3` và `lyrics.txt` chung trong folder đó.
3. Khởi động lại server local hoặc deploy lại Vercel. Danh sách bài hát tự sinh theo số folder, không cần sửa code.

```text
public/songs/ten-bai-hat/
├── info.txt
├── audio.mp3
└── lyrics.txt
```

`info.txt`:

```text
Tên bài hát: Tên hiển thị
Người sáng tác: Tên người sáng tác
Thứ tự: 1
```

`Thứ tự` là tùy chọn. Script cũng chấp nhận các khóa tiếng Anh `title`, `composer` và `order`, dùng dấu `:` hoặc `=`. Nếu thiếu `info.txt`, web vẫn nhận folder nhưng dùng tên folder làm tên bài và hiện cảnh báo khi build.

Web tự đọc timestamp từ TXT. Không cần chuyển lyric sang TypeScript hoặc tự tạo timestamp. File mẫu `Cơn Mưa Tháng 5` đã được đặt tại `public/songs/con-mua-thang-5/lyrics.txt`; chỉ cần thêm `audio.mp3` tương ứng.

## Cách đồng bộ

- Mỗi thiết bị ping `/api/time` 5 lần và chọn mẫu có RTT thấp nhất để ước lượng lệch đồng hồ.
- Lệnh Play/Seek/Pause được hẹn trước khoảng 1,2 giây bằng `effective_at_ms`.
- Client tính vị trí từ server-time thay vì chạy bộ đếm riêng, nên không tích lũy drift.
- `version` giúp bỏ qua event cũ đến muộn.
- Snapshot được tải lại mỗi 10 giây; người vào muộn hoặc vừa reconnect sẽ tự bắt đúng timeline.
- Realtime chỉ truyền trạng thái nhỏ; MP3 luôn chỉ chạy trên máy Admin.

## Trước giờ diễn

- Test bằng đúng đường truyền 4G/5G sẽ dùng tại địa điểm.
- Tắt tiết kiệm pin và giữ tab Admin ở foreground.
- Cắm sạc máy Admin, tắt thông báo và chuẩn bị một máy dự phòng.
- Không mở hai trang Admin cùng điều khiển trong lúc chương trình chạy.
