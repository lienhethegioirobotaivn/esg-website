import { msg } from "@/features/locale/lib/translate";

export const COPY = {
  aboutIntro:
    msg("Báo cáo kết nối thông tin về hoạt động, con người và cơ chế quản trị thành một bức tranh có cấu trúc. Giá trị của hồ sơ nằm ở khả năng nhìn rõ hiện trạng, nhận diện phần còn thiếu và lựa chọn việc cần làm tiếp theo."),
  basisTitle: msg("Cơ sở lập báo cáo"),
  basisBody:
    msg("Thông tin được tổng hợp từ các câu trả lời và tài liệu do doanh nghiệp cung cấp cho kỳ báo cáo đã xác định. Mỗi nhận định cần được đọc cùng phạm vi, nguồn dữ liệu và tình trạng minh chứng liên quan."),
  layersTitle: msg("Ba lớp thông tin"),
  layersBody:
    msg("Tự khai phản ánh câu trả lời của doanh nghiệp. Minh chứng đính kèm giúp truy xuất căn cứ, nhưng việc có tệp chưa tự xác nhận tính đúng của nội dung. Xác minh độc lập chỉ được ghi nhận cho phần có tài liệu nêu rõ tổ chức, phạm vi và kết quả xác minh."),
  aboutNote:
    msg("Tiến độ trả lời và mức độ đầy đủ minh chứng không phải điểm đạt ESG, chứng nhận hoặc kết luận tuân thủ một tiêu chuẩn."),
  tocIntro:
    msg("Các phần được sắp xếp theo hành trình từ phạm vi hoạt động đến thông tin ESG, ưu tiên cải thiện và căn cứ hỗ trợ."),
  tocNote:
    msg("Việc tham chiếu tới tài liệu được thực hiện theo mã minh chứng. Các tài liệu có giới hạn chia sẻ được quản lý theo quyền truy cập của hồ sơ và không mặc nhiên đính kèm vào bản báo cáo được chia sẻ."),
  coverTagline: msg("Từ thông tin được ghi nhận đến những ưu tiên có thể hành động."),
  coverNote:
    msg("Hồ sơ tự khai phục vụ quản trị nội bộ. Phạm vi và tình trạng xác minh được trình bày trong báo cáo."),
  summaryIntro:
    msg("Bức tranh ESG cần được đọc cùng bối cảnh hoạt động và độ đầy đủ của dữ liệu. Phần tóm tắt tập trung vào thông tin đã được ghi nhận, những vấn đề cần làm rõ và các gợi ý ưu tiên."),
  summaryNote:
    msg("Phân bố trạng thái chỉ tổng hợp câu hỏi thực hành. Các câu về sự cố và số liệu định lượng được trình bày riêng, không áp dụng cách hiểu Có = tích cực."),
  prioritiesNote:
    msg("Các gợi ý ưu tiên được tạo từ khoảng trống trong hồ sơ, chưa phải lựa chọn của người có thẩm quyền."),
  profileIntro:
    msg("Quy mô, sản phẩm và cách tổ chức hoạt động tạo bối cảnh cho toàn bộ hồ sơ. Thông tin dưới đây giúp người đọc hiểu đơn vị báo cáo và giới hạn sử dụng kết quả."),
  scopeIntro:
    msg("Một chỉ số chỉ có ý nghĩa khi biết rõ giai đoạn, cơ sở và nhóm đối tượng được tính. Báo cáo ghi nhận phạm vi được doanh nghiệp xác định, đồng thời nêu những phần chưa được bao phủ."),
  scopeNote:
    msg("Dữ liệu ở một cơ sở không tự đại diện cho toàn doanh nghiệp. Thông tin của nhà cung cấp hoặc bên thuê ngoài chỉ được cộng gộp khi có căn cứ về phạm vi và phương pháp."),
  valueChainIntro:
    msg("Cách doanh nghiệp tạo ra sản phẩm hoặc cung cấp dịch vụ giúp nhận diện nơi phát sinh tác động và nhóm bên liên quan. Thông tin kinh doanh tự nguyện chỉ được trình bày trong phạm vi doanh nghiệp lựa chọn chia sẻ."),
  valueChainNote:
    msg("Tên đối tác, thông tin liên hệ cá nhân và nhu cầu kết nối thương mại không xuất hiện mặc định trong bản chia sẻ. Khoảng doanh thu không được sử dụng làm điểm đánh giá ESG."),
  envIntro:
    msg("Quản lý môi trường bắt đầu từ việc hiểu nguồn tài nguyên được sử dụng, dòng chất thải phát sinh và tác động có thể ảnh hưởng tới bên ngoài. Các nội dung được xem xét cùng kỳ dữ liệu và tình trạng căn cứ."),
  energyIntro:
    msg("Dữ liệu điện và nhiên liệu cho biết mức sử dụng đầu vào trong phạm vi báo cáo. Việc mô tả biện pháp tiết kiệm được tách khỏi kết quả đo lường để tránh suy ra mức giảm khi chưa có dữ liệu đối chiếu."),
  ghgIntro:
    msg("Thông tin phát thải cần được đọc cùng ranh giới, phương pháp tính và nguồn dữ liệu. Việc có một hoạt động tiết kiệm hoặc trồng cây không tự tạo ra lượng giảm phát thải hay tín chỉ carbon."),
  waterIntro:
    msg("Theo dõi nước sử dụng và cách thu gom, xử lý nước thải tạo cơ sở để nhận diện cơ hội cải thiện. Chỉ số tổng hợp cần được gắn với cơ sở, giai đoạn và cách ghi nhận thực tế."),
  wasteIntro:
    msg("Tách các nhóm chất thải giúp người đọc hiểu cách phát sinh và quản lý đầu ra. Số liệu được trình bày theo đơn vị thống nhất và không mặc nhiên thể hiện tỷ lệ tái chế hay tuân thủ khi hồ sơ chưa có căn cứ tương ứng."),
  materialsIntro:
    msg("Bên cạnh điện, nước và chất thải, hoạt động có thể liên quan đến vật liệu, hóa chất, bụi, tiếng ồn hoặc sinh cảnh. Nội dung dưới đây ghi nhận những thực hành và giới hạn được doanh nghiệp mô tả trong phạm vi của mình."),
  incidentIntro:
    msg("Việc ghi nhận sự cố và đặt mục tiêu có thể hỗ trợ doanh nghiệp ưu tiên hành động. Trạng thái đã xảy ra, đang xử lý và đã hoàn tất được phân biệt theo thông tin có trong hồ sơ."),
  workforceIntro:
    msg("Thông tin về người lao động tạo bối cảnh để xem xét điều kiện làm việc, quyền lợi và cách doanh nghiệp tổ chức hỗ trợ. Các chỉ số tổng hợp được tách khỏi dữ liệu cá nhân và nhóm có khả năng nhận diện."),
  safetyIntro:
    msg("Quản lý an toàn bao gồm nhận diện nguy cơ, hướng dẫn thực hiện và khả năng ứng phó. Số vụ tai nạn được đọc cùng phạm vi ghi nhận và không tự đại diện cho toàn bộ mức độ an toàn."),
  labourIntro:
    msg("Các cơ chế bảo vệ quyền lao động cần được thể hiện bằng cách thực hiện trong công việc hằng ngày. Báo cáo ghi nhận nội dung tự khai, kênh phản ánh và phần cần làm rõ, đồng thời bảo vệ thông tin của người liên quan."),
  labourNote:
    msg("Bản chia sẻ không đưa danh tính người phản ánh, hồ sơ sức khỏe hoặc dữ liệu cá nhân nhạy cảm vào phần minh chứng."),
  communityIntro:
    msg("Đào tạo và cơ chế tiếp nhận phản hồi có thể hỗ trợ cải thiện chất lượng công việc, dịch vụ và quan hệ với cộng đồng. Hoạt động đã triển khai được trình bày cùng đối tượng, phạm vi và kết quả được ghi nhận."),
  governanceIntro:
    msg("Quản trị tạo cơ sở để phân công công việc, lựa chọn trọng tâm và kiểm tra tiến độ. Thông tin trong phần này mô tả cơ chế được doanh nghiệp tự khai, không suy ra chất lượng vận hành chỉ từ sự tồn tại của một văn bản."),
  integrityIntro:
    msg("Quy tắc ứng xử, quản lý xung đột lợi ích và cơ chế phản ánh tạo khuôn khổ cho quyết định có trách nhiệm. Vụ việc được xác nhận trong kỳ được ghi nhận riêng với tình trạng xử lý và giới hạn công bố."),
  integrityNote:
    msg("Không có tệp đính kèm không đồng nghĩa không có sự cố. Việc giữ bí mật danh tính được thực hiện mà vẫn ghi nhận đúng trạng thái và giới hạn dữ liệu."),
  supplyIntro:
    msg("Tác động ESG có thể phát sinh qua việc mua sắm và quan hệ nhà cung cấp. Việc nhận diện nhóm đối tác quan trọng và tiêu chí lựa chọn giúp doanh nghiệp xác định phần cần rà soát trong chuỗi giá trị."),
  supplyNote:
    msg("Tên pháp lý của đối tác chỉ được thể hiện khi đã được phép chia sẻ. Tự khai có tiêu chí mua sắm không đồng nghĩa toàn bộ nhà cung cấp đã được đánh giá độc lập."),
  dataIntro:
    msg("Dữ liệu cần được quản lý từ lúc thu thập tới khi sử dụng, chia sẻ và lưu trữ. Các cơ chế kiểm tra báo cáo và duy trì hoạt động được xem xét cùng quyền truy cập và căn cứ cho những tuyên bố được công bố."),
  dataNote:
    msg("Thông tin trao đổi tư vấn, đồng ý tiếp thị và nhu cầu kết nối thương mại được quản lý ngoài nội dung báo cáo chia sẻ mặc định."),
  moduleNote:
    msg("Nội dung phản ánh hồ sơ tự khai cho hoạt động thuộc phạm vi; không phải kết luận đạt một chuẩn chứng nhận ngành."),
  gapsIntro:
    msg("Một kế hoạch có ích bắt đầu từ vấn đề được mô tả rõ và căn cứ có thể truy xuất. Các khoảng trống được phân biệt giữa thiếu thực hành, thiếu dữ liệu, thiếu minh chứng và vấn đề đang cần xử lý."),
  gapsNote:
    msg("Gợi ý ưu tiên do hệ thống tạo từ trạng thái trả lời: sự cố và Chưa có là Cao; Có một phần là Trung bình; Chưa rõ và Chưa có dữ liệu là Cần làm rõ trước. Khi một nhóm có nhiều mức, nhóm lấy mức cao nhất. Đây chưa phải lựa chọn của người có thẩm quyền, và tình trạng sự cố không tự chuyển thành đã khắc phục chỉ vì có một hành động được đề xuất."),
  ghgNote:
    msg("Scope 1 là phát thải trực tiếp từ nguồn doanh nghiệp sở hữu hoặc kiểm soát, ví dụ nhiên liệu đốt cho phương tiện, máy phát điện hoặc lò hơi. Scope 2 là phát thải gián tiếp từ điện mua về sử dụng. Hai giá trị do doanh nghiệp tự khai, báo cáo không tự tính từ lượng điện hay nhiên liệu."),
  actionsIntro:
    msg("Lộ trình giúp chuyển nội dung rà soát thành công việc có người chịu trách nhiệm và cách theo dõi. Những cam kết dưới đây chỉ được trình bày khi doanh nghiệp đã cung cấp hoặc xác nhận nội dung tương ứng."),
  actionsNoPlan:
    msg("Doanh nghiệp chưa cung cấp kế hoạch hành động. Các nội dung dưới đây là đề xuất của hệ thống, chưa được doanh nghiệp xác nhận."),
  actionsSuggestTitle: msg("Đề xuất cải thiện chưa được doanh nghiệp xác nhận"),
  actionsSuggestNote:
    msg("Đề xuất được tạo từ trạng thái trả lời, không kèm người phụ trách, hạn hoàn thành hay trạng thái thực hiện. Mức gợi ý ưu tiên: Cao, Trung bình, Cần làm rõ trước."),
  actionsNote:
    msg("Các khuyến nghị chưa được xác nhận được quản lý như gợi ý bổ sung, không được trình bày thành cam kết của doanh nghiệp."),
  imagesIntro:
    msg("Hình ảnh hỗ trợ người đọc hiểu bối cảnh và cách thực hiện. Các hình được nhóm theo câu hỏi mà doanh nghiệp đã tải lên, kèm ghi chú chung của câu đó và mã tham chiếu để tránh sử dụng ảnh ngoài bối cảnh."),
  evidenceNoNote: msg("Doanh nghiệp không nhập ghi chú cho câu này."),
  evidenceOtherFiles: msg("Tệp khác của câu này, không hiển thị hình trong báo cáo:"),
  imagesNote:
    msg("Chỉ sử dụng hình ảnh đã được cho phép và phù hợp với quyền chia sẻ của bản báo cáo. Một hình ảnh không tự chứng minh kết quả cho cả kỳ hoặc toàn bộ cơ sở."),
  evidenceIntro:
    msg("Danh mục tạo liên kết giữa nội dung trình bày và tài liệu được sử dụng. Người đọc cần phân biệt tài liệu đã đính kèm, nội dung đã rà soát và phạm vi xác minh thực tế."),
  evidenceNote:
    msg("Trừ phần có tài liệu xác minh được nêu rõ, các thông tin trong hồ sơ dựa trên dữ liệu do doanh nghiệp tự cung cấp và chưa được xác minh độc lập. Việc tạo báo cáo không tự cấp chứng nhận hoặc xác lập mức đạt ESG."),
  appendixIntro:
    msg("Phụ lục ghi lại nội dung thuộc bộ câu hỏi áp dụng cho kỳ báo cáo. Mỗi câu trả lời đi cùng trạng thái dữ liệu và mã căn cứ; nội dung không thuộc phạm vi đã chọn không được cộng vào tổng hợp."),
  appendixNote:
    msg("Các trạng thái Chưa rõ, Chưa có và Không áp dụng được giữ theo đúng ý nghĩa khai báo. Số không đã được xác nhận được thể hiện bằng 0; phần không có dữ liệu không được thay bằng số không. Tài liệu riêng tư không được xuất kèm chỉ vì đã được tải lên hệ thống."),
  confirmIntro:
    msg("Việc xác nhận giúp ghi nhận trách nhiệm đối với nội dung được cung cấp và thời điểm chốt hồ sơ. Thông tin này không thay thế một cuộc đánh giá hoặc xác minh độc lập."),
  confirmNote:
    msg("Chữ ký hoặc dấu chỉ hiển thị khi có tệp hợp lệ được phép sử dụng. Không tự sinh chữ ký, dấu xác nhận, QR chứng nhận hoặc tên đơn vị xác minh."),
  closing: msg("Thông tin có căn cứ. Ưu tiên rõ ràng. Cải thiện có thể theo dõi."),
  frameworkIntro:
    msg("ESG giúp xem xét môi trường, con người và cách doanh nghiệp được quản trị. Các SDG dưới đây là liên hệ chủ đề để định hướng cách đọc báo cáo; chúng không biểu thị một mức đạt hay kết quả đóng góp đã được xác minh."),
  frameworkPillars: msg("Ba trụ cột được xem xét cùng phạm vi hoạt động và chất lượng dữ liệu."),
  frameworkNote:
    msg("Liên hệ SDG là khung tham khảo theo chủ đề, không phải bảng điểm hay chứng nhận. Mối liên hệ cụ thể của doanh nghiệp cần được đối chiếu với hoạt động và căn cứ trong hồ sơ."),
  frameworkSource: msg("Nguồn mục tiêu SDG: United Nations | https://sdgs.un.org/goals"),
  frameworkDisclaimer:
    msg("Nội dung ấn phẩm này chưa được Liên Hợp Quốc phê duyệt và không phản ánh quan điểm của Liên Hợp Quốc, các quan chức hoặc các quốc gia thành viên."),
  statusLegend: [
    [msg("Có / Có một phần"), msg("Thực hành được tự khai là đang có; cần đọc mô tả và căn cứ.")],
    [msg("Chưa có / Chưa rõ"), msg("Khoảng trống thực hành hoặc dữ liệu cần được làm rõ.")],
    [msg("Không áp dụng"), msg("Chỉ có ý nghĩa trong phạm vi và lý do được doanh nghiệp cung cấp.")],
  ],
  evidenceRefsIntro:
    msg("Tài liệu được trình bày cùng mã tham chiếu, phạm vi và quyền chia sẻ. Chỉ các tệp được phép sử dụng mới xuất hiện trong báo cáo."),
  moduleIntros: {
    MAN: msg("Nguồn tác động trong sản xuất thường gắn với dòng nguyên vật liệu, thiết bị và điều kiện tại công đoạn. Phần này giúp đặt thông tin ESG vào quy trình thực tế của cơ sở, từ kiểm soát đầu vào đến xử lý tình huống liên quan sản phẩm."),
    RET: msg("Hoạt động thương mại kết nối hàng hóa, tồn kho, giao vận và trải nghiệm khách hàng. Các nội dung chuyên ngành tập trung vào cách doanh nghiệp quản lý dòng hàng, thông tin bán hàng và trách nhiệm trong quá trình lưu thông."),
    SER: msg("Tác động của dịch vụ phụ thuộc vào nơi cung cấp, người thực hiện và phạm vi công việc đã cam kết. Hồ sơ chuyên ngành ghi nhận cách quản lý vật tư, an toàn, chất lượng và tài liệu của khách hàng trong quá trình phục vụ."),
    ICT: msg("Sản phẩm và hạ tầng số liên quan đến tài nguyên, khả năng tiếp cận, dữ liệu và an toàn của người dùng. Nội dung chuyên ngành làm rõ phạm vi doanh nghiệp kiểm soát và cách quản lý rủi ro trong vòng đời dịch vụ số."),
    CON: msg("Hoạt động dự án cần được xem xét theo địa điểm, giai đoạn và các bên cùng tham gia. Phần chuyên ngành ghi nhận việc quản lý tác động môi trường, an toàn công trường và thông tin được bàn giao khi công trình vận hành."),
    AGR: msg("Nguồn gốc đầu vào, điều kiện sản xuất và an toàn thực phẩm có mối liên hệ trực tiếp với người sử dụng và cộng đồng. Các nội dung được đặt trong phạm vi vùng sản xuất, cơ sở hoặc lô hàng mà doanh nghiệp khai báo."),
    EDU: msg("Hoạt động giáo dục gắn với môi trường học tập, quyền và sự an toàn của người học, năng lực nhân sự và chất lượng chương trình. Nội dung được điều chỉnh theo nhóm tuổi, hình thức đào tạo và hoạt động thực tế của đơn vị."),
    OTH: msg("Những hoạt động chưa phù hợp với các nhóm ngành có sẵn cần được mô tả rõ hơn về đầu vào, đầu ra và nhóm chịu ảnh hưởng. Phần này ghi nhận hiện trạng và các yêu cầu cần chuyên gia xác định thêm trước khi mở rộng phạm vi báo cáo."),
  },
  strips: {
    pillars: [msg("Ba trụ cột cùng được xem xét"), msg("Môi trường"), msg("Con người"), msg("Quản trị")],
    profile: [msg("Hoạt động trong bối cảnh rộng hơn"), msg("Doanh nghiệp"), msg("Sản phẩm"), msg("Các bên liên quan")],
    scope: [msg("Phạm vi của hồ sơ"), msg("Đơn vị"), msg("Hoạt động"), msg("Chuỗi giá trị")],
    valueChain: [msg("Vòng đời sản phẩm và dịch vụ"), msg("Thiết kế"), msg("Sử dụng"), msg("Thu hồi")],
    env: [msg("Tài nguyên và tác động môi trường"), msg("Năng lượng"), msg("Nước"), msg("Vật liệu")],
    energy: [msg("Quản lý việc sử dụng năng lượng"), msg("Ghi nhận"), msg("Tối ưu"), msg("Theo dõi")],
    ghg: [msg("Phân biệt nguồn phát thải"), msg("Trực tiếp"), msg("Năng lượng mua"), msg("Chuỗi giá trị")],
    water: [msg("Dòng nước trong hoạt động"), msg("Sử dụng"), msg("Thu gom"), msg("Xử lý")],
    waste: [msg("Thứ tự ưu tiên trong quản lý vật liệu"), msg("Giảm sử dụng"), msg("Tái sử dụng"), msg("Tái chế")],
    materials: [msg("Xem xét vòng đời vật liệu"), msg("Đầu vào"), msg("Trong hoạt động"), msg("Cuối vòng đời")],
    incident: [msg("Từ ghi nhận đến cải thiện"), msg("Nhận diện"), msg("Đặt mục tiêu"), msg("Theo dõi")],
    workforce: [msg("Môi trường làm việc có trách nhiệm"), msg("Quyền lợi"), msg("Cơ hội"), msg("Phát triển")],
    safety: [msg("Kiểm soát nguy cơ trong công việc"), msg("Nhận diện"), msg("Phòng ngừa"), msg("Ứng phó")],
    labour: [msg("Cơ chế bảo vệ người lao động"), msg("Tôn trọng"), msg("Lắng nghe"), msg("Giải quyết")],
    community: [msg("Học tập gắn với thực hành"), msg("Học hỏi"), msg("Ứng dụng"), msg("Phản hồi")],
    governance: [msg("Trách nhiệm và kiểm soát"), msg("Phân công"), msg("Kiểm soát"), msg("Minh bạch")],
    integrity: [msg("Liêm chính trong quyết định"), msg("Quy tắc"), msg("Công bằng"), msg("Phản ánh")],
    supply: [msg("Quan hệ trong chuỗi cung ứng"), msg("Lựa chọn"), msg("Rà soát"), msg("Hợp tác")],
    data: [msg("Vòng đời thông tin"), msg("Phân quyền"), msg("Lưu trữ"), msg("Rà soát")],
    MAN: [msg("Nguồn lực trong sản xuất"), msg("Đầu vào"), msg("Vận hành"), msg("Đầu ra")],
    RET: [msg("Dòng hàng hóa và trách nhiệm"), msg("Nguồn gốc"), msg("Phân phối"), msg("Người dùng")],
    SER: [msg("Trải nghiệm dịch vụ có trách nhiệm"), msg("Con người"), msg("Chất lượng"), msg("Phản hồi")],
    ICT: [msg("Công nghệ trong suốt vòng đời"), msg("Hạ tầng"), msg("Người dùng"), msg("An toàn dữ liệu")],
    CON: [msg("Tác động của không gian xây dựng"), msg("Vật liệu"), msg("Công trình"), msg("Cộng đồng")],
    AGR: [msg("Từ nguồn lực đến sản phẩm"), msg("Đất và nước"), msg("Sản xuất"), msg("An toàn")],
    EDU: [msg("Điều kiện để học tập và phát triển"), msg("Tiếp cận"), msg("Học tập"), msg("An toàn")],
    OTH: [msg("Xác định tác động theo hoạt động"), msg("Bối cảnh"), msg("Tác động"), msg("Các bên liên quan")],
    gaps: [msg("Ưu tiên công việc có căn cứ"), msg("Nhận diện"), msg("Ưu tiên"), msg("Theo dõi")],
    actions: [msg("Chu trình cải thiện"), msg("Lập kế hoạch"), msg("Thực hiện"), msg("Xem xét")],
    traceable: [msg("Thông tin có thể truy xuất"), msg("Mã tham chiếu"), msg("Minh chứng"), msg("Phạm vi")],
    appendix: [msg("Một câu trả lời đi cùng bối cảnh"), msg("Nội dung"), msg("Căn cứ"), msg("Trạng thái")],
    confirm: [msg("Hồ sơ được quản lý theo phiên bản"), msg("Trách nhiệm"), msg("Thời điểm"), msg("Truy xuất")],
  },
} as const;
