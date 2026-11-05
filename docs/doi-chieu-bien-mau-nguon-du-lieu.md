# Đối chiếu biến mẫu (mã vàng) với nguồn dữ liệu

Nguồn: file mẫu `ESG_Mau_to_vang_Do_hoa_v3.md` (456 biến). Các biến tiếng Anh tô vàng là mã để đổ dữ liệu, không phải địa chỉ ô Sheet. Báo cáo xuất ra gắn theo **mã câu hỏi** hoặc **mã trường thông tin doanh nghiệp**, không gắn theo số dòng Sheet. Biến chưa có nguồn thì ẩn, không dùng số liệu demo.

## Tóm tắt

| Trạng thái | Nhóm biến |
|---|---|
| Có nguồn | 44 |
| Tự tính/sinh | 30 |
| Mới (thẻ Kế hoạch) | 3 |
| Cần kiểm tra | 6 |
| Chưa có nguồn | 7 |

Ý nghĩa: **Có nguồn** = lấy trực tiếp từ câu trả lời hoặc trường đã nhập. **Tự tính/sinh** = hệ thống tính hoặc viết theo quy tắc từ dữ liệu đã nhập. **Mới (thẻ Kế hoạch)** = lấy từ thẻ Kế hoạch cải thiện ESG. **Cần kiểm tra** = đã có mã trong code nhưng cần xác nhận với sếp hoặc kiểm tra ô nhập trên form. **Chưa có nguồn** = web chưa thu dữ liệu này, báo cáo ẩn.

Mỗi dòng bên dưới là một nhóm biến cùng nguồn, nên số dòng ít hơn số biến.

## Bảng đối chiếu

| Biến | Nguồn dữ liệu | Trạng thái | Ghi chú |
|---|---|---|---|
| `customer_logo` | Ô tải logo ở form thông tin doanh nghiệp | Có nguồn | Không có logo thì ẩn |
| `report_year` | Trường reportYear (Năm báo cáo) | Có nguồn |  |
| `company_name` | Trường name (P-001) | Có nguồn |  |
| `cover_photo` | Không có ô tải ảnh bìa | Chưa có nguồn | Trang bìa không dùng ảnh |
| `disclosure_level` | Tính từ quy mô nhân sự (headcount): dưới 50 = Cơ bản, từ 50 = Mở rộng | Tự tính/sinh |  |
| `content_version` | Hằng số trong code: Bộ câu hỏi ESG v0.1 | Tự tính/sinh | Chưa lấy từ Sheet |
| `answer_version` | Thời điểm xuất báo cáo | Tự tính/sinh |  |
| `review_status` | Câu C-060 (xác nhận): có xác nhận hay chưa | Tự tính/sinh |  |
| `report_status` | Bản nháp hoặc Hoàn tất tự khai, theo các điều kiện kiểm tra | Tự tính/sinh |  |
| `report_id` | Mã báo cáo do Apps Script cấp khi lưu doanh nghiệp | Có nguồn | Chưa lưu thì ghi Chưa lưu hồ sơ |
| `issued_at` | Ngày xuất báo cáo (giờ Việt Nam) | Tự tính/sinh |  |
| `toc.framework … toc.R07` | Số trang thực của từng mục (xuất 2 lượt) | Tự tính/sinh |  |
| `countries` | Trường countries | Cần kiểm tra | Trường có trong code báo cáo; cần xác nhận có ô nhập trên form |
| `period` | Trường reportPeriod + reportYear | Có nguồn |  |
| `report_version` | Bản nháp hoặc 1.0 | Tự tính/sinh |  |
| `answered_count, evidence_count, open_items_count` | Đếm từ câu trả lời và tệp đính kèm | Tự tính/sinh |  |
| `executive_summary` | Câu chữ sinh theo quy tắc từ số liệu đã nhập | Tự tính/sinh | Không dùng AI |
| `priority_1, priority_2, priority_3` | 3 đề xuất xếp đầu từ khoảng trống | Tự tính/sinh | Dùng cột improvementHint trong Sheet nếu có |
| `trading_name` | Trường tradingName | Có nguồn |  |
| `registration_id` | Trường taxCode | Có nguồn |  |
| `legal_form` | Trường legalForm | Cần kiểm tra | Cần xác nhận có ô nhập trên form |
| `org_context` | Câu ghép từ tên, quy mô, ngành, hoạt động | Tự tính/sinh |  |
| `org_photo` | Không có ô tải ảnh | Chưa có nguồn | Ẩn |
| `primary_sector` | Trường industry | Có nguồn |  |
| `secondary_sectors` | Trường secondarySectors | Có nguồn |  |
| `size_band` | Trường headcount | Có nguồn |  |
| `activities, products_services` | Trường activities (hiện dùng chung cho cả hai biến) | Có nguồn | Chưa có ô riêng cho sản phẩm, dịch vụ |
| `capabilities` | Trường capabilities | Có nguồn |  |
| `employees_presence, contractor_presence` | Trường hasEmployees, hasContractors | Có nguồn |  |
| `sites, site.name, site.scope, site.limit` | Trường sites (mỗi dòng: Cơ sở | Hoạt động | Giới hạn) | Có nguồn |  |
| `scope_limitations` | Trường reportScope + dataLimitations | Có nguồn |  |
| `supplier_groups, supplier_group.name/risk/response, supply_chain_scope` | Trường supplierGroups (mỗi dòng: Nhóm | Rủi ro | Cách xử lý) | Có nguồn |  |
| `markets` | Trường markets | Có nguồn |  |
| `downstream_groups` | Trường downstreamGroups | Có nguồn |  |
| `revenue_band` | Trường revenueBand | Có nguồn |  |
| `value_chain_visual` | Sơ đồ nhà cung cấp, công ty, đối tác đầu ra | Tự tính/sinh | Sinh từ supplierGroups và downstreamGroups |
| `value_chain_context` | Câu ghép từ nhóm nhà cung cấp, đối tác | Tự tính/sinh |  |
| `electricity_kwh` | Câu C-002 (số liệu) | Có nguồn |  |
| `water_m3` | Câu C-009 (số liệu) | Có nguồn |  |
| `ghg_data_status` | Từ trạng thái C-006 và C-007 | Tự tính/sinh |  |
| `environment_summary, environment_gaps` | Câu ghép từ C-002, C-009 và trạng thái thực hành môi trường | Tự tính/sinh |  |
| `energy_scope, energy_sources` | Ghi chú của câu C-002 | Có nguồn | Hiện hiển thị là Nguồn, cách tổng hợp |
| `chart_energy` | Biểu đồ điện theo tháng | Chưa có nguồn | Bộ câu hỏi chỉ thu tổng điện cả kỳ, chưa có số theo tháng |
| `fuel.type, fuel.amount, fuel.unit, fuel.source` | Câu C-003 (bảng nhiên liệu) | Cần kiểm tra | Hiện chỉ hiển thị phần ghi chú dạng văn bản; chưa tách từng dòng loại, lượng, đơn vị, nguồn |
| `scope1_tco2e, scope1_boundary` | Câu C-006 (số liệu và ghi chú) | Có nguồn |  |
| `scope2_tco2e, scope2_boundary` | Câu C-007 (số liệu và ghi chú) | Có nguồn |  |
| `ghg_method` | Ghi chú câu C-005 | Có nguồn |  |
| `ghg_sources` | Ghi chú câu C-006 và C-007 | Có nguồn |  |
| `climate_assessment, energy_assessment, water_assessment, waste_assessment, materials_assessment` | Câu nhận định sinh theo quy tắc từ trạng thái các câu thực hành | Tự tính/sinh |  |
| `water_sources` | Ghi chú câu C-009 | Có nguồn |  |
| `wastewater_method` | Câu C-011 | Có nguồn |  |
| `waste_nonhaz_t, waste_nonhaz_source` | Câu C-012 (số liệu và ghi chú) | Có nguồn |  |
| `waste_haz_t, waste_haz_source` | Câu C-013 (số liệu và ghi chú) | Có nguồn |  |
| `chart_waste` | Vẽ từ C-012 và C-013 | Tự tính/sinh |  |
| `water_photo, materials_photo, safety_photo, community_photo và các caption` | Không có ô tải ảnh theo chủ đề | Chưa có nguồn | Ẩn; ảnh minh chứng lấy riêng từ tệp tải lên ở từng câu |
| `environment_incident_status, environment_incident_scope, env_incident.description/status/evidence` | Câu C-019 (sự cố môi trường) | Có nguồn |  |
| `env_goal.owner` | Chưa có ô nhập người phụ trách mục tiêu môi trường | Chưa có nguồn | Ẩn |
| `environment_actions` | Chưa có nguồn riêng cho việc cần làm theo mảng môi trường | Chưa có nguồn | Có thể lấy từ thẻ Kế hoạch nếu sếp muốn tách theo mảng |
| `headcount` | Câu C-021 | Có nguồn |  |
| `worker_scope` | Ghi chú câu C-021 | Có nguồn |  |
| `work_accidents, work_fatalities` | Câu C-030, C-031 | Có nguồn |  |
| `training_hours, training_sources` | Câu C-037 (số liệu và ghi chú) | Có nguồn |  |
| `workforce_assessment, labour_rights_practices, labour_rights_gaps, labour_rights_assessment, safety_assessment` | Câu nhận định sinh theo quy tắc | Tự tính/sinh |  |
| `social_actions` | Chưa có nguồn riêng | Chưa có nguồn | Ẩn |
| `esg_role` | Ghi chú câu C-041 | Có nguồn |  |
| `leadership_review` | Ghi chú câu C-059 | Có nguồn |  |
| `governance_summary, integrity_assessment, supply_chain_assessment, data_governance_assessment` | Câu nhận định sinh theo quy tắc | Tự tính/sinh |  |
| `material_priorities` | Ghi chú câu C-057 | Có nguồn |  |
| `integrity_incident_status, integrity.status, integrity.disclosure` | Câu C-046 (vụ việc liêm chính) | Có nguồn |  |
| `reporting_controls` | Câu C-052 và các câu kiểm soát dữ liệu cùng nhóm | Cần kiểm tra | Cần xác nhận nội dung mong muốn của ô này |
| `q.<mã câu> và ev.<mã câu> (C-001…C-059, MAN, RET, SER, ICT, CON, AGR, EDU, OTH)` | Câu hỏi cùng mã: câu trả lời và trạng thái minh chứng (đính kèm bao nhiêu tệp, chưa xác minh) | Có nguồn | Hiện theo mã câu hỏi, không theo số dòng Sheet |
| `module.<ngành>.scope, module.<ngành>.limits` | Ngành đã chọn, capabilities và reportScope | Có nguồn |  |
| `module.<ngành>.assessment` | Nhận định sinh theo quy tắc từ trạng thái các câu thuộc ngành | Tự tính/sinh |  |
| `gap.title, gap.reason, gap.priority` | Tên nhóm câu hỏi; danh sách nội dung cụ thể theo loại; gợi ý ưu tiên theo mức | Tự tính/sinh | Ưu tiên chỉ là gợi ý của hệ thống |
| `review_followups` | Các câu Có hoặc Có một phần nhưng chưa đính kèm minh chứng | Tự tính/sinh |  |
| `improvement_focus` | 3 khoảng trống xếp đầu | Tự tính/sinh |  |
| `action_timeline` | Hình tiến độ sinh từ các đầu việc trong thẻ Kế hoạch | Mới (thẻ Kế hoạch) |  |
| `action.description, action.owner, action.due, action.status` | Thẻ Kế hoạch cải thiện ESG (mỗi đầu việc một dòng) | Mới (thẻ Kế hoạch) | Trạng thái: Chưa bắt đầu / Đang thực hiện / Hoàn thành / Tạm hoãn |
| `action_goal, action_resources, action_review_cycle` | Thẻ Kế hoạch cải thiện ESG (3 ô chung) | Mới (thẻ Kế hoạch) | Ẩn nếu để trống |
| `evidence_photo_1…n, evidence_caption_1…n` | Ảnh khách tải lên ở từng câu; nhóm theo câu hỏi, kèm ghi chú chung của câu | Có nguồn | Tối đa 8 ảnh; ảnh vượt giới hạn và tệp khác chỉ nằm trong bảng danh mục |
| `evidence.id, evidence.description, evidence.scope, evidence.status` | Từng tệp tải lên: mã EV, câu hỏi, kỳ báo cáo, trạng thái chưa xác minh | Có nguồn |  |
| `limitations` | Trường dataLimitations + câu cố định + số câu chưa khai báo | Tự tính/sinh |  |
| `verifcation_statement` | Câu cố định: không có xác minh độc lập | Tự tính/sinh |  |
| `permitted_references` | Hiện lấy theo phiên bản bộ câu hỏi | Cần kiểm tra | Cần xác nhận nội dung mong muốn của ô này |
| `answer.id, answer.description, answer.evidence_status` | Phụ lục: mã câu, câu hỏi, câu trả lời, trạng thái căn cứ | Có nguồn |  |
| `answer_notes` | Ghi chú cố định | Tự tính/sinh |  |
| `unanswered_summary` | Danh sách câu chưa khai báo | Tự tính/sinh |  |
| `confirming_role` | Trường confirmingRole | Cần kiểm tra | Cần xác nhận có ô nhập trên form |
| `confirmed_at, confirmation_status` | Câu C-060 (xác nhận) và ngày xuất | Tự tính/sinh |  |
| `report_reference` | Mã báo cáo + ESG Report Online | Tự tính/sinh |  |

## Việc cần sếp xác nhận

1. Các biến **Chưa có nguồn** (ảnh bìa, ảnh theo chủ đề, biểu đồ điện theo tháng, người phụ trách mục tiêu môi trường, hành động theo mảng môi trường và xã hội): bỏ hẳn hay bổ sung ô nhập sau?
2. Biến `fuel.*` (bảng nhiên liệu): có cần tách từng dòng loại, lượng, đơn vị, nguồn trong báo cáo không?
3. Biến `reporting_controls` và `permitted_references`: nội dung mong muốn là gì?
4. Các biến **Cần kiểm tra** về trường doanh nghiệp (`countries`, `legal_form`, `confirming_role`): có ô nhập tương ứng trên form chưa? Cần mình kiểm tra với bản form hiện tại.
5. `products_services` đang dùng chung dữ liệu với `activities`; có cần ô riêng không?
