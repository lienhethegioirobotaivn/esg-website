# ESGstudio: Tài liệu kỹ thuật cho Backend

Tài liệu này mô tả hiện trạng frontend, mô hình dữ liệu, hợp đồng API và kế hoạch dựng `apps/api` (Express + Drizzle). Mục đánh dấu **(Đề xuất)** là quyết định tôi đề xuất để bạn xác nhận khi bắt đầu làm backend, không phải thứ frontend đã bắt buộc.

## 1. Tổng quan

ESGstudio là website khảo sát ESG nội bộ miễn phí cho doanh nghiệp.

- Người quản trị tạo bộ câu hỏi ở `/admin`.
- Người dùng điền thông tin doanh nghiệp và trả lời bộ câu hỏi ở trang chủ.
- Mỗi câu có ba đáp án: **Có**, **Chưa có**, **Không áp dụng**. Chọn **Có** thì kèm mô tả và bằng chứng (tối đa 10 tệp PDF hoặc ảnh).

Trạng thái hiện tại:

| Hạng mục | Trạng thái |
| --- | --- |
| Frontend (Next.js) | Hoàn thiện giao diện, dữ liệu mock trong `apps/web/src/data` |
| Lưu bộ câu hỏi | Chỉ trong bộ nhớ trình duyệt (zustand), mất khi tải lại trang |
| Lưu câu trả lời, thông tin doanh nghiệp, bằng chứng | Chỉ trong state của component, chưa gửi đi đâu |
| Đăng nhập `/admin` | Chưa có |
| Backend | Chưa bắt đầu |

## 2. Kiến trúc monorepo

```
esg-studio/
├── apps/
│   ├── web/              Next.js 16, Tailwind v4, lucide-react
│   └── api/              Express + Drizzle (cần tạo)
├── packages/
│   └── shared/           @esg/shared: hằng số, schema Zod, kiểu dữ liệu, buildSurvey
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Nguyên tắc:

- `@esg/shared` là **hợp đồng** giữa web và api. Schema Zod ở đây dùng cho cả form frontend và validate request ở Express.
- Không dùng `any`. Dữ liệu từ ngoài vào (request body, query, env) đều phải đi qua `safeParse` của Zod rồi mới được dùng.
- `tsconfig.base.json` bật `strict` và `noUncheckedIndexedAccess`. `apps/api` cũng kế thừa file này.

### 2.1 Nội dung hiện có của `@esg/shared`

| File | Xuất ra |
| --- | --- |
| `constants.ts` | `MAX_EVIDENCE_FILES` (10), `MAX_EVIDENCE_FILE_SIZE_BYTES` (10 MB), `ACCEPTED_EVIDENCE_MIME_TYPES`, `ANSWER_VALUES`, `REQUIREMENT_LEVELS`, `PILLAR_ICONS` và các kiểu suy ra |
| `survey.ts` | `pillarSchema`, `questionGroupSchema`, `questionSchema`, `guidanceSchema`, các schema `*InputSchema`, `surveySchema` và kiểu tương ứng |
| `answer.ts` | `evidenceFileSchema`, `answerSchema` (discriminated union theo `value`) |
| `company.ts` | `companyProfileSchema` |
| `build-survey.ts` | `buildSurvey({ pillars, groups, questions })` dựng cây `Survey` đã sắp xếp theo `order` |
| `form-errors.ts` | `flattenIssues(error)` gom lỗi Zod thành `Record<string, string>` |

### 2.2 Việc nên làm ở `@esg/shared` trước khi viết API

1. **Chuyển logic "câu đã hoàn thành" về shared.** Hiện hàm `isQuestionComplete` nằm ở `apps/web/src/features/survey/lib/progress.ts`. Server cần dùng chính quy tắc đó để tính tiến độ và kiểm tra khi nộp bài. Đưa hàm này (kèm kiểu đầu vào thuần, không phụ thuộc `File`) vào `packages/shared/src/completion.ts`.
2. **Tách kiểu bằng chứng.** Ở web, `EvidenceItem` giữ đối tượng `File`. Ở shared chỉ có `EvidenceFile` (metadata). Server làm việc với metadata, web ghép thêm `File` khi upload.
3. **Đổi `questionId` trong `answerSchema` thành `z.string().uuid()`** cho nhất quán với `idSchema` trong `survey.ts`.

## 3. Mô hình miền (domain)

```
Pillar 1───n QuestionGroup 1───n Question
                                   │
Submission 1───n Answer n───1 ─────┘
               Answer 1───n EvidenceFile
Submission 1───1 CompanyProfile (gộp trong bảng submissions)
```

### 3.1 Bộ câu hỏi (do admin quản lý)

| Thực thể | Trường | Ghi chú |
| --- | --- | --- |
| Pillar (trụ cột) | `id` uuid, `name`, `icon` (`sprout` \| `users` \| `landmark`), `order` | Ví dụ: Môi trường, Xã hội, Quản trị. Số lượng không giới hạn |
| QuestionGroup (nhóm) | `id` uuid, `pillarId`, `title`, `description`, `order` | Một nhóm thuộc đúng một trụ cột |
| Question (câu hỏi) | `id` uuid, `groupId`, `text`, `descriptionRequirement`, `evidenceRequirement`, `guidance`, `order` | `*Requirement` là `required` hoặc `optional` |
| Guidance | `title`, `body`, `suggestedEvidence`, `tip` | Hiển thị ở cột phải. Lưu thành 4 cột trong bảng `questions` |

Quy tắc:

- **Không có mã câu hỏi** (như `E001`). Id là UUID. Giao diện hiển thị "Câu 1, Câu 2..." tính từ vị trí hiện tại trong nhóm, vì vậy backend **không lưu và không trả** số thứ tự hiển thị. Chỉ có `order` dùng để sắp xếp.
- `order` là số nguyên tăng dần trong phạm vi cha (nhóm trong trụ cột, câu hỏi trong nhóm). Có thể có khoảng trống sau khi xóa, không cần đánh số lại.
- Xóa trụ cột sẽ xóa luôn các nhóm và câu hỏi bên trong. Xóa nhóm sẽ xóa các câu hỏi bên trong.
- Nhóm hoặc trụ cột rỗng vẫn hợp lệ. Giao diện hiển thị trạng thái rỗng.

### 3.2 Bài khảo sát của người dùng

**CompanyProfile** (khớp `companyProfileSchema`):

| Trường | Kiểu | Bắt buộc |
| --- | --- | --- |
| `name` | string | Có |
| `industry` | string (mã lựa chọn) | Có |
| `headcount` | string (mã lựa chọn) | Có |
| `address` | string | Có |
| `reportYear` | số nguyên 2000 đến 2100 | Có |
| `reportScope` | string | Không |

Danh sách lựa chọn hiện nằm trong `apps/web/src/data/company-options.ts`:

- `industry`: `manufacturing`, `retail`, `services`, `it`, `construction`, `agriculture`, `education`, `other`.
- `headcount`: `lt-10`, `10-49`, `50-199`, `200-499`, `gte-500`.

**(Đề xuất)** Chuyển hai danh sách này vào `@esg/shared` dưới dạng mảng `as const` để server validate đúng giá trị.

**Answer** (khớp `answerSchema`), phân biệt theo `value`:

| `value` | Trường kèm theo |
| --- | --- |
| `yes` | `description` (string), `evidence` (tối đa 10 tệp) |
| `no` | không có |
| `not_applicable` | không có |

**EvidenceFile**: `id`, `name`, `size` (byte, tối đa 10 MB), `mimeType` thuộc `application/pdf`, `image/png`, `image/jpeg`, `image/webp`.

### 3.3 Quy tắc "câu đã hoàn thành"

Dùng để tính tiến độ. Phải giống hệt giữa web và api:

1. Chưa chọn đáp án: chưa hoàn thành.
2. Chọn `no` hoặc `not_applicable`: hoàn thành.
3. Chọn `yes`:
   - Nếu `descriptionRequirement = required` thì mô tả (sau khi `trim`) phải khác rỗng.
   - Nếu `evidenceRequirement = required` thì phải có ít nhất 1 tệp bằng chứng.
4. Khi chuyển từ `yes` sang đáp án khác, mô tả và bằng chứng không còn được tính. **(Đề xuất)** server xóa luôn mô tả và tệp đã tải của câu đó để tránh rác.

## 4. Lược đồ cơ sở dữ liệu (Drizzle, PostgreSQL)

**(Đề xuất)** Dùng `drizzle-orm` với `pg-core`. Cột tên theo `snake_case`, thuộc tính TypeScript theo `camelCase`. Cột sắp xếp đặt tên `sort_order` vì `order` là từ khóa SQL, thuộc tính TypeScript vẫn là `order` để khớp `@esg/shared`.

`apps/api/src/db/schema.ts`:

```ts
import {
  ACCEPTED_EVIDENCE_MIME_TYPES,
  ANSWER_VALUES,
  PILLAR_ICONS,
  REQUIREMENT_LEVELS,
} from "@esg/shared";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const pillarIconEnum = pgEnum("pillar_icon", PILLAR_ICONS);
export const requirementLevelEnum = pgEnum(
  "requirement_level",
  REQUIREMENT_LEVELS,
);
export const answerValueEnum = pgEnum("answer_value", ANSWER_VALUES);
export const evidenceMimeTypeEnum = pgEnum(
  "evidence_mime_type",
  ACCEPTED_EVIDENCE_MIME_TYPES,
);
export const submissionStatusEnum = pgEnum("submission_status", [
  "draft",
  "submitted",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const pillars = pgTable("pillars", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  icon: pillarIconEnum("icon").notNull(),
  order: integer("sort_order").notNull(),
  ...timestamps,
});

export const questionGroups = pgTable(
  "question_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pillarId: uuid("pillar_id")
      .notNull()
      .references(() => pillars.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    order: integer("sort_order").notNull(),
    ...timestamps,
  },
  (table) => [index("question_groups_pillar_idx").on(table.pillarId)],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => questionGroups.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    descriptionRequirement: requirementLevelEnum("description_requirement")
      .notNull()
      .default("required"),
    evidenceRequirement: requirementLevelEnum("evidence_requirement")
      .notNull()
      .default("optional"),
    guidanceTitle: text("guidance_title").notNull(),
    guidanceBody: text("guidance_body").notNull(),
    guidanceSuggestedEvidence: text("guidance_suggested_evidence")
      .notNull()
      .default(""),
    guidanceTip: text("guidance_tip").notNull().default(""),
    order: integer("sort_order").notNull(),
    ...timestamps,
  },
  (table) => [index("questions_group_idx").on(table.groupId)],
);

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: submissionStatusEnum("status").notNull().default("draft"),
  companyName: text("company_name"),
  industry: text("industry"),
  headcount: text("headcount"),
  address: text("address"),
  reportYear: integer("report_year"),
  reportScope: text("report_scope"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  ...timestamps,
});

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    value: answerValueEnum("value").notNull(),
    description: text("description").notNull().default(""),
    ...timestamps,
  },
  (table) => [
    unique("answers_submission_question_unique").on(
      table.submissionId,
      table.questionId,
    ),
  ],
);

export const evidenceFiles = pgTable(
  "evidence_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    answerId: uuid("answer_id")
      .notNull()
      .references(() => answers.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    mimeType: evidenceMimeTypeEnum("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("evidence_files_answer_idx").on(table.answerId)],
);
```

Quyết định cần chốt:

- **Không đặt ràng buộc unique cho `(parent, sort_order)`.** Đổi chỗ hai phần tử bằng cách hoán đổi `order` sẽ vi phạm unique tạm thời. Thay vào đó, hoán đổi trong một transaction.
- **Xóa câu hỏi có bài khảo sát đã nộp:** thiết kế trên dùng `cascade`, nghĩa là câu trả lời liên quan bị xóa theo. Nếu muốn giữ lịch sử các bài đã nộp, cần chuyển sang lưu ảnh chụp (snapshot) nội dung câu hỏi vào bài nộp, hoặc xóa mềm câu hỏi (`deleted_at`). **(Đề xuất)** làm xóa mềm khi bắt đầu có người dùng thật.
- **Số lượng bằng chứng tối đa 10 mỗi câu** phải kiểm tra ở tầng ứng dụng (đếm trước khi chèn, trong transaction). Không có cách biểu diễn gọn bằng ràng buộc cột.
- **Danh tính người dùng:** frontend chưa có đăng nhập. **(Đề xuất)** giai đoạn đầu mỗi bài khảo sát là một `submission` ẩn danh, trình duyệt giữ `submissionId` trong `localStorage` để tiếp tục. Khi thêm tài khoản, thêm cột `user_id` vào `submissions`.

## 5. Hợp đồng API

Tiền tố: `/api/v1`. Dữ liệu là JSON, ngoại trừ upload tệp (`multipart/form-data`). Thời gian theo ISO 8601 (UTC).

### 5.1 Quy ước chung

Phản hồi lỗi thống nhất:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "fields": { "text": "Vui lòng nhập nội dung câu hỏi" }
  }
}
```

| HTTP | `code` | Khi nào |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Body, query hoặc param không qua Zod. `fields` dùng đúng định dạng của `flattenIssues` |
| 401 | `UNAUTHORIZED` | Thiếu hoặc sai thông tin đăng nhập (khi có auth) |
| 403 | `FORBIDDEN` | Không đủ quyền |
| 404 | `NOT_FOUND` | Không tìm thấy tài nguyên |
| 409 | `CONFLICT` | Vi phạm quy tắc nghiệp vụ, ví dụ đã đủ 10 tệp bằng chứng, bài đã nộp |
| 413 | `FILE_TOO_LARGE` | Tệp vượt 10 MB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Định dạng tệp không được chấp nhận |
| 500 | `INTERNAL_ERROR` | Lỗi không lường trước. Không lộ chi tiết ra ngoài |

Thông báo lỗi trả về bằng tiếng Việt vì giao diện hiển thị trực tiếp. Schema Zod trong shared đã mang sẵn thông báo tiếng Việt.

### 5.2 API công khai (người dùng)

| Phương thức | Đường dẫn | Mô tả | Body / phản hồi |
| --- | --- | --- | --- |
| GET | `/survey` | Toàn bộ bộ câu hỏi dạng cây | Phản hồi `Survey` (kết quả của `buildSurvey`) |
| POST | `/submissions` | Tạo bài khảo sát nháp | Phản hồi `{ id }`, mã 201 |
| GET | `/submissions/:id` | Lấy bài khảo sát | `{ id, status, company, answers }` |
| PUT | `/submissions/:id/company` | Lưu thông tin doanh nghiệp | Body `CompanyProfile` |
| PUT | `/submissions/:id/answers/:questionId` | Lưu hoặc cập nhật câu trả lời | Body `Answer` (không gồm `evidence`) |
| POST | `/submissions/:id/answers/:questionId/evidence` | Tải lên một tệp bằng chứng | `multipart`, trường `file` |
| DELETE | `/submissions/:id/answers/:questionId/evidence/:evidenceId` | Xóa một tệp bằng chứng | 204 |
| GET | `/submissions/:id/evidence/:evidenceId` | Tải hoặc xem tệp | Chuyển hướng tới URL ký sẵn hoặc stream tệp |
| POST | `/submissions/:id/submit` | Nộp bài | 409 nếu còn câu chưa hoàn thành |
| GET | `/submissions/:id/progress` | Tiến độ | `{ completedQuestions, totalQuestions, completedGroups, totalGroups, evidenceCount }` |

Ghi chú:

- `PUT` câu trả lời là **upsert** theo cặp `(submissionId, questionId)`. Ràng buộc unique ở bảng `answers` bảo đảm không trùng.
- Tải tệp mỗi lần **một tệp**, khớp với giao diện (một ô tải, thêm bằng nút `+`). Server kiểm tra: câu trả lời hiện là `yes`, chưa đủ 10 tệp, đúng loại, không quá 10 MB.
- Server **không tin `Content-Type` do client gửi**. Đọc vài byte đầu của tệp (magic bytes) để xác định PDF, PNG, JPEG, WEBP rồi so với danh sách cho phép.
- Bài đã `submitted` không cho sửa (409).

### 5.3 API quản trị

Tất cả nằm dưới `/admin`. **(Đề xuất)** bọc bằng middleware xác thực ngay từ đầu, kể cả khi ban đầu chỉ kiểm tra một khóa API cố định lấy từ biến môi trường, để sau này thay bằng đăng nhập thật mà không đổi route.

| Phương thức | Đường dẫn | Body | Ghi chú |
| --- | --- | --- | --- |
| GET | `/admin/survey` | không | Giống `/survey` |
| POST | `/admin/pillars` | `PillarInput` | `order` = lớn nhất hiện có + 1 |
| PATCH | `/admin/pillars/:id` | `PillarInput` | |
| DELETE | `/admin/pillars/:id` | không | Xóa kèm nhóm và câu hỏi |
| POST | `/admin/groups` | `QuestionGroupInput` | Kiểm tra `pillarId` tồn tại |
| PATCH | `/admin/groups/:id` | `QuestionGroupInput` | Cho phép đổi `pillarId` |
| DELETE | `/admin/groups/:id` | không | Xóa kèm câu hỏi |
| POST | `/admin/groups/:id/move` | `{ "direction": -1 \| 1 }` | Hoán đổi `order` với nhóm liền kề cùng trụ cột |
| POST | `/admin/questions` | `QuestionInput` | `order` = lớn nhất trong nhóm + 1 |
| PATCH | `/admin/questions/:id` | `QuestionInput` | |
| DELETE | `/admin/questions/:id` | không | |
| POST | `/admin/questions/:id/move` | `{ "direction": -1 \| 1 }` | Hoán đổi với câu liền kề cùng nhóm |

Phản hồi của `POST` và `PATCH` là thực thể vừa tạo hoặc sửa (kiểu `Pillar`, `QuestionGroup`, `Question`). Giao diện hiện tại dùng id do client sinh ra, khi nối API thì **server sinh id** và client dùng id trả về.

Việc `move` trả về `204` hoặc danh sách anh em đã sắp xếp lại đều được. **(Đề xuất)** trả về danh sách anh em để client không phải gọi lại `GET /survey`.

## 6. Cấu trúc `apps/api`

Chia theo tính năng, cùng triết lý với frontend:

```
apps/api/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── drizzle/                     file migration sinh ra
└── src/
    ├── index.ts                 khởi động server
    ├── app.ts                   dựng Express app (tách ra để test)
    ├── config/env.ts            đọc và validate biến môi trường bằng Zod
    ├── db/
    │   ├── client.ts
    │   └── schema.ts
    ├── middleware/
    │   ├── validate.ts          validate body, params, query bằng Zod
    │   ├── error-handler.ts
    │   ├── require-admin.ts
    │   └── upload.ts            multer, giới hạn dung lượng
    ├── lib/
    │   ├── http-error.ts        lớp lỗi có mã HTTP và `code`
    │   └── storage/             giao diện lưu tệp và các bản triển khai
    └── features/
        ├── survey/              routes, controller, service, repository
        ├── admin/
        ├── submissions/
        └── evidence/
```

Phân tầng trong mỗi feature:

- **routes**: khai báo đường dẫn và gắn middleware validate.
- **controller**: nhận request đã validate, gọi service, trả response.
- **service**: nghiệp vụ (quy tắc ở mục 3.3, giới hạn 10 tệp, hoán đổi `order`).
- **repository**: truy vấn Drizzle. Chỉ tầng này được import `db`.

### 6.1 Thư viện đề xuất

| Mục đích | Thư viện |
| --- | --- |
| Web server | `express` (v5), `cors`, `helmet` |
| CSDL | `drizzle-orm`, `drizzle-kit`, `pg` hoặc `postgres` |
| Validate | `zod` (dùng chung với shared) |
| Upload | `multer` (lưu bộ nhớ hoặc đĩa tạm, giới hạn 10 MB) |
| Chạy dev | `tsx` |
| Test | `vitest`, `supertest` |

### 6.2 Biến môi trường

Validate khi khởi động, lỗi thì dừng ngay:

| Biến | Ý nghĩa |
| --- | --- |
| `PORT` | Cổng server, ví dụ `4000` |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `CORS_ORIGIN` | Địa chỉ web được phép gọi API |
| `ADMIN_API_KEY` | Khóa tạm cho `/admin` **(Đề xuất)** |
| `STORAGE_DRIVER` | `local` hoặc `s3` |
| `STORAGE_LOCAL_DIR` | Thư mục lưu tệp khi dùng `local` |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Khi dùng `s3` hoặc dịch vụ tương thích S3 |

### 6.3 Về kiểu dữ liệu, không dùng `any`

- Middleware validate nhận một `ZodType<T>` và ghi kết quả đã parse vào một chỗ có kiểu rõ ràng, controller không đọc `req.body` thô.
- Lỗi không lường trước được gán là `unknown` ở `catch`, rồi thu hẹp bằng `instanceof HttpError` trước khi xử lý.
- Hàng đọc từ Drizzle dùng `typeof table.$inferSelect` để suy ra kiểu, sau đó ánh xạ sang kiểu của `@esg/shared`. Cần ánh xạ vì cột `guidance*` được trải phẳng trong DB nhưng là object lồng nhau trong `Question`.

## 7. Lưu trữ tệp bằng chứng

Định nghĩa giao diện để đổi nơi lưu mà không sửa nghiệp vụ:

```ts
export interface EvidenceStorage {
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  getReadUrl(key: string, expiresInSeconds: number): Promise<string>;
  remove(key: string): Promise<void>;
}
```

- `storageKey` có dạng `submissions/{submissionId}/{evidenceId}` (không dùng tên tệp gốc để tránh trùng và ký tự lạ). Tên gốc lưu ở `original_name` để hiển thị.
- Bản triển khai `local` cho giai đoạn đầu, `s3` khi lên môi trường thật.
- Vercel không giữ tệp ghi xuống đĩa lâu dài, vì vậy khi deploy phải dùng `s3` hoặc dịch vụ lưu trữ đối tượng tương đương.
- Khi xóa bằng chứng hoặc xóa bài khảo sát, xóa cả tệp trong kho lưu trữ. Làm thành bước nền hoặc dọn dẹp định kỳ nếu xóa đồng bộ bị chậm.

## 8. Tích hợp với frontend hiện tại

| Vị trí ở web | Hiện tại | Khi có backend |
| --- | --- | --- |
| `features/survey/services/survey.service.ts` | Đọc từ `data/` | `fetch` tới `GET /survey`, trả `Survey` đã kiểm bằng `surveySchema.parse` |
| `features/survey/store/survey-content-store.ts` | Mutation trực tiếp trên state | Mỗi action gọi API `/admin/*` rồi cập nhật state bằng dữ liệu server trả về |
| `features/survey/hooks/use-survey-answers.ts` | Reducer cục bộ | Vẫn giữ draft cục bộ, thêm gọi `PUT .../answers/:questionId` sau khi người dùng dừng gõ (debounce) hoặc chọn đáp án |
| `features/evidence` | Chỉ giữ `File` trong bộ nhớ | `POST` từng tệp, lưu `evidenceId` trả về thay cho `crypto.randomUUID()` |
| `features/company/components/company-profile-form.tsx` | Chỉ hiện "đã ghi nhận" | Gọi `PUT .../company` khi bấm lưu |
| `data/` | Dữ liệu mock | Chuyển thành file seed của Drizzle, sau đó giữ làm dữ liệu test |

Biến môi trường phía web: `NEXT_PUBLIC_API_URL`, ví dụ `http://localhost:4000/api/v1`.

Mock data dùng UUID cố định trong `data/ids.ts`, có thể dùng nguyên các id đó làm dữ liệu seed.

## 9. Bảo mật và vận hành

- `helmet`, CORS chỉ cho phép `CORS_ORIGIN`.
- Giới hạn tần suất (`express-rate-limit`) cho API công khai, đặc biệt là upload và tạo bài khảo sát.
- Validate mọi đầu vào bằng Zod. Mọi truy vấn qua Drizzle (tham số hóa) để tránh SQL injection.
- Kiểm tra quyền truy cập bài khảo sát: chỉ người giữ `submissionId` mới đọc được. Dùng UUID khó đoán, nhưng **(Đề xuất)** thêm một `accessToken` ngẫu nhiên riêng cho mỗi bài khi cần chặt chẽ hơn.
- Không ghi nội dung tệp hoặc thông tin doanh nghiệp vào log.
- Endpoint `GET /health` trả 200, phục vụ kiểm tra khi deploy.
- Deploy `apps/api` tách khỏi web (Render, Railway hoặc Fly.io), vì Express chạy như server dài hạn, không phù hợp chạy trực tiếp trên Vercel.

## 10. Lộ trình triển khai gợi ý

1. Tạo `apps/api`: `package.json`, `tsconfig.json` kế thừa `tsconfig.base.json`, `src/app.ts`, `GET /health`.
2. Chuyển `isQuestionComplete` và danh sách lựa chọn doanh nghiệp vào `@esg/shared` (mục 2.2 và 3.2).
3. Cài Drizzle, viết `schema.ts`, chạy migration đầu tiên, viết script seed từ `apps/web/src/data`.
4. Làm `GET /survey` và nối `surveyService` ở web. Đây là bước đầu tiên có thể kiểm chứng toàn tuyến.
5. Làm các API `/admin/*` và nối store của admin. Thêm middleware `require-admin`.
6. Làm `submissions`, `company` và `answers`. Nối form doanh nghiệp và việc lưu câu trả lời.
7. Làm upload bằng chứng với kho lưu trữ `local`, sau đó thêm `s3`.
8. Làm `submit` và `progress`.
9. Viết test tích hợp cho các quy tắc ở mục 3.3 và giới hạn tệp, rồi thêm giới hạn tần suất và log.

## 11. Câu hỏi còn mở

- Người dùng có cần đăng nhập để tiếp tục bài khảo sát trên nhiều thiết bị không, hay chỉ cần link riêng?
- Sau khi nộp, báo cáo ESG được tạo thế nào (bước 3 "Báo cáo ESG của bạn" trong thiết kế tham khảo): xuất PDF, trang xem trực tuyến, hay chưa làm?
- Một doanh nghiệp có nhiều bài khảo sát theo từng năm báo cáo không? Nếu có, cần thêm khái niệm `Company` tách khỏi `Submission`.
- Có cho phép nhiều quản trị viên không, và có cần nhật ký thay đổi bộ câu hỏi không?
- Khi admin sửa hoặc xóa câu hỏi sau khi đã có bài nộp, có cần giữ nguyên nội dung cũ cho các bài đó không (xem mục 4)?
