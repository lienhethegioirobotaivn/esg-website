var SHEET_NAME = 'Data khách hàng';
var KEY_COLUMN = 'Mã báo cáo';
var HEADER_SCAN_ROWS = 30;
var DEFAULT_STATUS = 'Bản nháp';
var LOGO_LINK_COLUMN = 'Link hồ sơ bảo mật';
var REPORT_CODE_PATTERN = /^ESG-\d{8}-[A-Z0-9]{4}$/;
var ALLOWED_LOGO_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};
var MAX_LOGO_BYTES = 2 * 1024 * 1024;
var INQUIRY_KEY_COLUMN = 'Mã yêu cầu';
var INQUIRY_SHEET_PROPERTY = 'INQUIRY_SHEET_NAME';
var INQUIRY_PREFIXES = { 'Tư vấn': 'TV', 'Kiểm định': 'KD' };
var INQUIRY_STATUS = 'Mới tiếp nhận';
var INQUIRY_PRIORITY = 'Bình thường';
var INQUIRY_SOURCE = 'Website';
var INQUIRY_CONSENT = 'Có';
var FORM_VERSION = 'v1';
var FEEDBACK_SHEET_NAME = 'Góp ý';
var FEEDBACK_KEY_COLUMN = 'Mã góp ý';
var FEEDBACK_HEADERS = ['Mã góp ý', 'Thời gian gửi', 'Ý kiến', 'Email', 'Đã gửi email mời góp ý', 'Nguồn gửi', 'Phiên bản form'];
var FEEDBACK_TIME_COLUMN = 'Thời gian gửi';
var FEEDBACK_EMAIL_COLUMN = 'Email';
var FEEDBACK_SENT_COLUMN = 'Đã gửi email mời góp ý';
var FEEDBACK_DELAY_DAYS = 5;
var FEEDBACK_TRIGGER_HOUR = 9;
var CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
var POSTS_SHEET_NAME = 'Bài viết';
var POSTS_HEADERS = ['Mã bài', 'Mục', 'Slug', 'Chuyên mục', 'Tiêu đề', 'Tóm tắt', 'Ảnh bìa', 'Tác giả', 'Phút đọc', 'Ngày đăng', 'Nổi bật', 'Đọc nhiều', 'Chuyên đề', 'Trạng thái', 'Nội dung (JSON)', 'Lượt tim', 'Cập nhật lúc'];
var POSTS_KEY = 'Mã bài';
var BODY_SHEET_NAME = 'Nội dung bài viết';
var BODY_HEADERS = ['Mã bài', 'Phần', 'Nội dung'];
var BODY_CHUNK_SIZE = 40000;
var BODY_CHUNK_PREFIX = '@chunks:';
var STATS_SHEET_NAME = 'Số liệu thành tựu';
var STATS_HEADERS = ['Thứ tự', 'Giá trị', 'Nhãn'];
var ABOUT_IMAGES_FOLDER_NAME = 'Ảnh trang Về ESG Report Online';
var ABOUT_IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
var MAX_ABOUT_IMAGE_BYTES = 3 * 1024 * 1024;
var ABOUT_WRITE_ACTIONS = { savePost: true, deletePost: true, saveStats: true, likePost: true };
var ABOUT_READ_ACTIONS = { listPosts: true, listStats: true, uploadImage: true };
var TRANSLATE_LANGUAGES = { 'vi': true, 'en': true, 'fr': true, 'zh-CN': true };
var TRANSLATE_MAX_TEXTS = 50;
var TRANSLATE_MAX_CHARS = 5000;
var TRANSLATION_SHEET_NAME = 'Bản dịch';
var TRANSLATION_HEADERS = ['Mã băm', 'Chữ gốc (vi)', 'en', 'fr', 'zh', 'en (sửa tay)', 'fr (sửa tay)', 'zh (sửa tay)', 'Cập nhật lúc'];
var TRANSLATION_LOCALES = { 'en': true, 'fr': true, 'zh': true };
var TRANSLATION_MAX_ITEMS = 60;
var TRANSLATION_HASH_PATTERN = /^[0-9a-f]{16}$/;
var TRANSLATION_PRUNE_MAX_KEEP = 20000;
var TRANSLATION_SYNC_MAX_ROUNDS = 6;
var TRANSLATION_SYNC_MAX_MS = 270000;
var TRANSLATION_SYNC_INTERVAL_MINUTES = 10;
var TRANSLATION_SYNC_FULL_EVERY_MS = 24 * 60 * 60 * 1000;
var EXPORT_SHEET_NAME = 'Báo cáo đã xuất';
var EXPORT_HEADERS = ['Mã lần xuất', 'Mã báo cáo', 'Thời gian', 'Ngôn ngữ', 'Trạng thái', 'Doanh nghiệp', 'Giao diện', 'Id file PDF', 'Id file Word', 'Tên file PDF', 'Tên file Word', 'Link file PDF', 'Link file Word', 'Email đã xác thực'];
var EXPORT_LINKS = [
  { idColumn: 'Id file PDF', linkColumn: 'Link file PDF', label: 'Mở PDF' },
  { idColumn: 'Id file Word', linkColumn: 'Link file Word', label: 'Mở Word' }
];
var OWNER_COLUMN = 'Email đã xác thực';
var EXPORT_ID_PATTERN = /^RX-\d{8}-[A-Z0-9]{6}$/;
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var OTP_CODE_PATTERN = /^\d{6}$/;
var OTP_TTL_SECONDS = 600;
var OTP_MAX_TRIES = 5;
var OTP_RESEND_SECONDS = 60;
var OTP_PER_EMAIL_PER_HOUR = 3;
var OTP_DAILY_LIMIT = 60;
var OTP_MIN_MAIL_QUOTA = 10;
var OTP_SENDER_NAME = 'ESG Report Online';
var EXPORT_KEY = 'Mã lần xuất';
var SNAPSHOT_SHEET_NAME = 'Nội dung khảo sát';
var SNAPSHOT_HEADERS = ['Mã lần xuất', 'Phần', 'Nội dung'];
var SNAPSHOT_CHUNK_SIZE = 40000;
var REPORT_TEMP_FOLDER_NAME = 'Tải lên tạm';
var REPORT_EXPORTS_FOLDER_NAME = 'Báo cáo đã xuất';
var REPORT_FORMATS = {
  pdf: { mime: 'application/pdf', signature: [37, 80, 68, 70, 45], idColumn: 'Id file PDF', nameColumn: 'Tên file PDF' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', signature: [80, 75, 3, 4], idColumn: 'Id file Word', nameColumn: 'Tên file Word' }
};
var REPORT_LOCALES = { vi: true, en: true, fr: true, zh: true };
var REPORT_STATUS_LABELS = { draft: 'Bản nháp', complete: 'Đầy đủ' };
var REPORT_THEME_LABELS = { 'default': 'Mặc định', brand: 'Thương hiệu' };
var UPLOAD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var REPORT_MAX_FILE_BYTES = 25 * 1024 * 1024;
var REPORT_DOWNLOAD_CHUNK_BYTES = 2499999;
var REPORT_MAX_CHUNKS = 12;
var REPORT_MAX_CHUNK_CHARS = 4 * 1024 * 1024;
var REPORT_MAX_SNAPSHOT_CHARS = 600000;
var REPORT_KEEP_EXPORTS = 5;
var REPORT_TEMP_MAX_AGE_MS = 24 * 60 * 60 * 1000;
var REPORT_CLEANUP_TRIGGER_HOUR = 3;

function doPost(e) {
  try {
    var body = parseBody_(e);
    var props = PropertiesService.getScriptProperties();
    var expected = props.getProperty('SECRET');
    if (!expected || body.secret !== expected) {
      return json_({ ok: false, error: 'Sai khóa xác thực.' });
    }
    if (body.action === 'translate') {
      return json_(translateTexts_(body));
    }
    if (body.action === 'listTranslations') {
      return json_(listTranslations_(body));
    }
    if (body.action === 'saveTranslations') {
      var translationLock = LockService.getScriptLock();
      translationLock.waitLock(20000);
      try {
        return json_(saveTranslations_(body));
      } finally {
        translationLock.releaseLock();
      }
    }
    if (body.action === 'pruneTranslations') {
      var pruneLock = LockService.getScriptLock();
      pruneLock.waitLock(20000);
      try {
        return json_(pruneTranslations_(body));
      } finally {
        pruneLock.releaseLock();
      }
    }
    if (body.action === 'uploadReportChunk') {
      return json_(uploadReportChunk_(body, props));
    }
    if (body.action === 'finishReport') {
      return json_(finishReport_(body, props));
    }
    if (body.action === 'otpRequest') {
      return json_(otpRequest_(body, props));
    }
    if (body.action === 'otpVerify') {
      return json_(otpVerify_(body, props));
    }
    if (body.action === 'setReportOwner') {
      return json_(setReportOwner_(body));
    }
    if (body.action === 'listOwnerReports') {
      return json_(listOwnerReports_(body));
    }
    if (body.action === 'getOwnerReportFile') {
      return json_(getOwnerReportFile_(body));
    }
    if (body.action === 'getOwnerSnapshot') {
      return json_(getOwnerSnapshot_(body));
    }
    if (body.action === 'deleteOwnerReport') {
      return json_(deleteOwnerReport_(body));
    }
    if (body.action === 'saveInquiry' || body.action === 'saveFeedback') {
      if (!body.fields || typeof body.fields !== 'object') {
        return json_({ ok: false, error: 'Thiếu dữ liệu liên hệ.' });
      }
      var contactLock = LockService.getScriptLock();
      contactLock.waitLock(20000);
      try {
        return json_(
          body.action === 'saveInquiry'
            ? saveInquiry_(body, props)
            : saveFeedback_(body, props)
        );
      } finally {
        contactLock.releaseLock();
      }
    }
    if (ABOUT_WRITE_ACTIONS[body.action] || ABOUT_READ_ACTIONS[body.action]) {
      if (ABOUT_WRITE_ACTIONS[body.action]) {
        var aboutLock = LockService.getScriptLock();
        aboutLock.waitLock(20000);
        try {
          return json_(runAbout_(body, props));
        } finally {
          aboutLock.releaseLock();
        }
      }
      return json_(runAbout_(body, props));
    }
    if (body.action !== 'saveCompany') {
      return json_({ ok: false, error: 'Hành động không được hỗ trợ.' });
    }
    if (!REPORT_CODE_PATTERN.test(String(body.reportCode || ''))) {
      return json_({ ok: false, error: 'Mã báo cáo không hợp lệ.' });
    }
    if (!body.fields || typeof body.fields !== 'object') {
      return json_({ ok: false, error: 'Thiếu dữ liệu doanh nghiệp.' });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      return json_(saveCompany_(body, props));
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'esg-company-bridge' });
}

function saveCompany_(body, props) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Không tìm thấy tab "' + SHEET_NAME + '".');
  }

  var layout = findLayout_(sheet);
  var keyIndex = layout.columns[KEY_COLUMN];
  var lastRow = Math.max(sheet.getLastRow(), layout.headerRow);
  var firstDataRow = layout.headerRow + 1;
  var rowCount = lastRow - layout.headerRow;
  var keys = rowCount > 0
    ? sheet.getRange(firstDataRow, keyIndex, rowCount, 1).getValues()
    : [];

  var targetRow = 0;
  var emptyRow = 0;
  for (var i = 0; i < keys.length; i++) {
    var value = String(keys[i][0]).trim();
    if (value === body.reportCode) {
      targetRow = firstDataRow + i;
      break;
    }
    if (value === '' && emptyRow === 0) {
      emptyRow = firstDataRow + i;
    }
  }

  var created = targetRow === 0;
  if (created) {
    targetRow = emptyRow !== 0 ? emptyRow : firstDataRow + keys.length;
  }

  var missing = [];
  var values = {};
  values[KEY_COLUMN] = body.reportCode;
  if (created) {
    values['Ngày tạo'] = new Date();
    values['Trạng thái hồ sơ'] = DEFAULT_STATUS;
  }
  Object.keys(body.fields).forEach(function (name) {
    values[name] = body.fields[name];
  });

  var logoLink = '';
  if (body.logo) {
    logoLink = saveLogo_(body.reportCode, body.logo, props);
    values[LOGO_LINK_COLUMN] = logoLink;
  }

  Object.keys(values).forEach(function (name) {
    var column = layout.columns[name];
    if (!column) {
      missing.push(name);
      return;
    }
    sheet.getRange(targetRow, column).setValue(values[name]);
  });

  SpreadsheetApp.flush();
  return {
    ok: true,
    reportCode: body.reportCode,
    created: created,
    missingColumns: missing
  };
}

function findLayout_(sheet, keyColumn, sheetName) {
  keyColumn = keyColumn || KEY_COLUMN;
  sheetName = sheetName || SHEET_NAME;
  var width = Math.max(sheet.getLastColumn(), 1);
  var rows = Math.min(HEADER_SCAN_ROWS, Math.max(sheet.getLastRow(), 1));
  var data = sheet.getRange(1, 1, rows, width).getValues();
  for (var r = 0; r < data.length; r++) {
    for (var c = 0; c < data[r].length; c++) {
      if (String(data[r][c]).trim() === keyColumn) {
        var columns = {};
        for (var k = 0; k < data[r].length; k++) {
          var title = String(data[r][k]).trim();
          if (title !== '' && !columns[title]) {
            columns[title] = k + 1;
          }
        }
        return { headerRow: r + 1, columns: columns };
      }
    }
  }
  throw new Error('Không tìm thấy cột "' + keyColumn + '" trong tab "' + sheetName + '".');
}

function findSheetByKey_(keyColumn, preferredName) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (preferredName) {
    var named = spreadsheet.getSheetByName(preferredName);
    if (!named) {
      throw new Error('Không tìm thấy tab "' + preferredName + '".');
    }
    return { sheet: named, layout: findLayout_(named, keyColumn, preferredName) };
  }
  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    try {
      return { sheet: sheets[i], layout: findLayout_(sheets[i], keyColumn, sheets[i].getName()) };
    } catch (err) {
    }
  }
  throw new Error('Không tìm thấy tab có cột "' + keyColumn + '".');
}

function nextEmptyRow_(sheet, layout, keyColumn) {
  var keyIndex = layout.columns[keyColumn];
  var firstDataRow = layout.headerRow + 1;
  var rowCount = Math.max(sheet.getLastRow(), layout.headerRow) - layout.headerRow;
  var keys = rowCount > 0
    ? sheet.getRange(firstDataRow, keyIndex, rowCount, 1).getValues()
    : [];
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0]).trim() === '') {
      return firstDataRow + i;
    }
  }
  return firstDataRow + keys.length;
}

function writeRow_(sheet, layout, row, values) {
  var missing = [];
  Object.keys(values).forEach(function (name) {
    var column = layout.columns[name];
    if (!column) {
      missing.push(name);
      return;
    }
    sheet.getRange(row, column).setValue(values[name]);
  });
  SpreadsheetApp.flush();
  return missing;
}

function createCode_(prefix) {
  var date = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var suffix = '';
  for (var i = 0; i < 4; i++) {
    suffix += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
  }
  return prefix + '-' + date + '-' + suffix;
}

function saveInquiry_(body, props) {
  var kind = String(body.fields['Loại yêu cầu'] || '');
  var prefix = INQUIRY_PREFIXES[kind];
  if (!prefix) {
    throw new Error('Loại yêu cầu không hợp lệ.');
  }
  var found = findSheetByKey_(INQUIRY_KEY_COLUMN, props.getProperty(INQUIRY_SHEET_PROPERTY));
  var now = new Date();
  var code = createCode_(prefix);

  var values = {};
  values[INQUIRY_KEY_COLUMN] = code;
  values['Thời gian gửi'] = now;
  values['Trạng thái xử lý'] = INQUIRY_STATUS;
  values['Mức ưu tiên'] = INQUIRY_PRIORITY;
  values['Nguồn gửi'] = INQUIRY_SOURCE;
  values['Đồng ý liên hệ'] = INQUIRY_CONSENT;
  values['Thời điểm đồng ý'] = now;
  values['Phiên bản form'] = FORM_VERSION;
  values['Đồng bộ lúc'] = now;
  Object.keys(body.fields).forEach(function (name) {
    values[name] = body.fields[name];
  });

  var row = nextEmptyRow_(found.sheet, found.layout, INQUIRY_KEY_COLUMN);
  var missing = writeRow_(found.sheet, found.layout, row, values);

  notify_(props, '[ESG Report Online] ' + kind + ' mới ' + code, values, [
    'Mã yêu cầu', 'Loại yêu cầu', 'Tên doanh nghiệp', 'Thông tin / nhu cầu',
    'Quy mô nhân sự', 'Ngành nghề', 'Số điện thoại', 'Email'
  ], String(body.fields['Email'] || ''));
  return { ok: true, requestCode: code, missingColumns: missing };
}

function ensureFeedbackSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(FEEDBACK_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(FEEDBACK_SHEET_NAME);
    sheet.getRange(1, 1, 1, FEEDBACK_HEADERS.length).setValues([FEEDBACK_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return { sheet: sheet, layout: findLayout_(sheet, FEEDBACK_KEY_COLUMN, FEEDBACK_SHEET_NAME) };
}

function saveFeedback_(body, props) {
  var found = ensureFeedbackSheet_();
  var now = new Date();
  var code = createCode_('GY');

  var values = {};
  values[FEEDBACK_KEY_COLUMN] = code;
  values[FEEDBACK_TIME_COLUMN] = now;
  values['Nguồn gửi'] = INQUIRY_SOURCE;
  values['Phiên bản form'] = FORM_VERSION;
  Object.keys(body.fields).forEach(function (name) {
    values[name] = body.fields[name];
  });

  var row = nextEmptyRow_(found.sheet, found.layout, FEEDBACK_KEY_COLUMN);
  var missing = writeRow_(found.sheet, found.layout, row, values);

  notify_(props, '[ESG Report Online] Góp ý mới ' + code, values, [
    'Mã góp ý', 'Ý kiến', 'Email'
  ], '');
  return { ok: true, missingColumns: missing };
}

function notify_(props, subject, values, names, replyTo) {
  var to = props.getProperty('NOTIFY_EMAIL');
  if (!to) {
    return;
  }
  var lines = names.map(function (name) {
    return name + ': ' + (values[name] === undefined ? '' : values[name]);
  });
  var options = {};
  if (/^[^\s@]+@[^\s@]+$/.test(replyTo)) {
    options.replyTo = replyTo;
  }
  try {
    MailApp.sendEmail(to, subject, lines.join('\n'), options);
  } catch (err) {
    Logger.log('Không gửi được email thông báo: ' + err);
  }
}

function sendFeedbackInvites() {
  var props = PropertiesService.getScriptProperties();
  var found = ensureFeedbackSheet_();
  var sheet = found.sheet;
  var layout = found.layout;
  var cols = layout.columns;
  [FEEDBACK_TIME_COLUMN, FEEDBACK_EMAIL_COLUMN, FEEDBACK_SENT_COLUMN].forEach(function (name) {
    if (!cols[name]) {
      throw new Error('Thiếu cột "' + name + '" trong tab "' + FEEDBACK_SHEET_NAME + '".');
    }
  });

  var firstDataRow = layout.headerRow + 1;
  var rowCount = sheet.getLastRow() - layout.headerRow;
  Logger.log('Số ngày chờ: ' + FEEDBACK_DELAY_DAYS + ' | số dòng dữ liệu: ' + Math.max(rowCount, 0) + ' | hạn mức email còn lại: ' + MailApp.getRemainingDailyQuota());
  if (rowCount <= 0) {
    return;
  }
  var data = sheet.getRange(firstDataRow, 1, rowCount, sheet.getLastColumn()).getValues();
  var threshold = new Date().getTime() - FEEDBACK_DELAY_DAYS * 24 * 60 * 60 * 1000;
  var siteUrl = props.getProperty('SITE_URL') || '';
  var replyTo = props.getProperty('NOTIFY_EMAIL') || '';
  var sentCount = 0;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowNumber = firstDataRow + i;
    var email = String(row[cols[FEEDBACK_EMAIL_COLUMN] - 1]).trim();
    var created = row[cols[FEEDBACK_TIME_COLUMN] - 1];
    var sent = String(row[cols[FEEDBACK_SENT_COLUMN] - 1]).trim();
    if (email === '') {
      Logger.log('Dòng ' + rowNumber + ': bỏ qua, không có email.');
      continue;
    }
    if (sent !== '') {
      Logger.log('Dòng ' + rowNumber + ': bỏ qua, đã gửi lúc ' + sent + '.');
      continue;
    }
    var createdTime = created instanceof Date ? created.getTime() : new Date(created).getTime();
    if (isNaN(createdTime)) {
      Logger.log('Dòng ' + rowNumber + ': bỏ qua, cột "' + FEEDBACK_TIME_COLUMN + '" không phải ngày giờ (' + created + ').');
      continue;
    }
    if (createdTime > threshold) {
      Logger.log('Dòng ' + rowNumber + ': bỏ qua, chưa đủ ' + FEEDBACK_DELAY_DAYS + ' ngày kể từ lúc gửi.');
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
      Logger.log('Dòng ' + rowNumber + ': bỏ qua, email không hợp lệ (' + email + ').');
      continue;
    }
    var message = 'Xin chào,\n\n' +
      'Cách đây ít ngày bạn đã dùng thử công cụ tạo báo cáo ESG của ESG Report Online. ' +
      'Chúng tôi rất mong nhận được ý kiến của bạn về trải nghiệm sử dụng: điều gì dễ dùng, điều gì còn vướng và bạn muốn bổ sung gì.\n\n' +
      (siteUrl ? 'Bạn có thể quay lại và gửi góp ý tại: ' + siteUrl + '\n\n' : '') +
      'Bạn chỉ cần trả lời trực tiếp email này. Xin cảm ơn bạn.\n\nESG Report Online';
    var options = replyTo ? { replyTo: replyTo, name: 'ESG Report Online' } : { name: 'ESG Report Online' };
    try {
      MailApp.sendEmail(email, 'Mời bạn góp ý về trải nghiệm ESG Report Online', message, options);
    } catch (err) {
      Logger.log('Dòng ' + rowNumber + ': gửi email lỗi: ' + err);
      continue;
    }
    sheet.getRange(rowNumber, cols[FEEDBACK_SENT_COLUMN]).setValue(new Date());
    sentCount++;
    Logger.log('Dòng ' + rowNumber + ': đã gửi email tới ' + email + '.');
  }
  Logger.log('Tổng số email đã gửi: ' + sentCount);
}

function installFeedbackTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'sendFeedbackInvites') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('sendFeedbackInvites')
    .timeBased()
    .everyDays(1)
    .atHour(FEEDBACK_TRIGGER_HOUR)
    .create();
}

function runAbout_(body, props) {
  switch (body.action) {
    case 'listPosts':
      return { ok: true, posts: listPosts_(body.includeDrafts === true) };
    case 'savePost':
      return savePost_(body.post, props);
    case 'deletePost':
      return deletePost_(String(body.id || ''), props);
    case 'likePost':
      return likePost_(String(body.section || ''), String(body.slug || ''), Number(body.delta));
    case 'listStats':
      return { ok: true, items: listStats_() };
    case 'saveStats':
      return saveStats_(body.items);
    case 'uploadImage':
      return uploadAboutImage_(body.image, props);
  }
  throw new Error('Hành động không được hỗ trợ.');
}

function ensureTable_(name, headers) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, headers.length).setNumberFormat('@');
    return sheet;
  }
  var existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(function (value) {
    return String(value).trim();
  });
  headers.forEach(function (header) {
    if (existing.indexOf(header) === -1) {
      var column = existing.length + 1;
      sheet.getRange(1, column).setValue(header).setFontWeight('bold');
      existing.push(header);
    }
  });
  return sheet;
}

function readTable_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var header = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value).trim();
  });
  var columns = {};
  header.forEach(function (name, index) {
    if (name) {
      columns[name] = index + 1;
    }
  });
  var rows = [];
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    data.forEach(function (values, index) {
      var record = { _row: index + 2 };
      Object.keys(columns).forEach(function (name) {
        record[name] = values[columns[name] - 1];
      });
      rows.push(record);
    });
  }
  return { columns: columns, rows: rows };
}

function cellText_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  }
  return value === null || value === undefined ? '' : String(value);
}

function readBodyChunks_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BODY_SHEET_NAME);
  var chunks = {};
  if (!sheet) {
    return chunks;
  }
  readTable_(sheet).rows.forEach(function (record) {
    var id = cellText_(record['Mã bài']);
    if (id === '') {
      return;
    }
    if (!chunks[id]) {
      chunks[id] = [];
    }
    chunks[id].push({ part: Number(record['Phần']) || 0, text: cellText_(record['Nội dung']) });
  });
  Object.keys(chunks).forEach(function (id) {
    chunks[id].sort(function (a, b) {
      return a.part - b.part;
    });
  });
  return chunks;
}

function bodyText_(record, chunks) {
  var raw = cellText_(record['Nội dung (JSON)']);
  if (raw.indexOf(BODY_CHUNK_PREFIX) !== 0) {
    return raw;
  }
  var parts = chunks[cellText_(record['Mã bài'])] || [];
  return parts
    .map(function (item) {
      return item.text;
    })
    .join('');
}

function removeBodyChunks_(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BODY_SHEET_NAME);
  if (!sheet) {
    return;
  }
  var rows = readTable_(sheet).rows;
  for (var i = rows.length - 1; i >= 0; i--) {
    if (cellText_(rows[i]['Mã bài']) === id) {
      sheet.deleteRow(rows[i]._row);
    }
  }
}

function storeBody_(id, json) {
  removeBodyChunks_(id);
  if (json.length <= BODY_CHUNK_SIZE) {
    return json;
  }
  var sheet = ensureTable_(BODY_SHEET_NAME, BODY_HEADERS);
  var table = readTable_(sheet);
  var row = Math.max(sheet.getLastRow(), 1) + 1;
  var count = 0;
  for (var start = 0; start < json.length; start += BODY_CHUNK_SIZE) {
    count++;
    sheet.getRange(row, table.columns['Mã bài']).setNumberFormat('@').setValue(id);
    sheet.getRange(row, table.columns['Phần']).setNumberFormat('@').setValue(count);
    sheet.getRange(row, table.columns['Nội dung']).setNumberFormat('@').setValue(json.substring(start, start + BODY_CHUNK_SIZE));
    row++;
  }
  return BODY_CHUNK_PREFIX + count;
}

function imageIdsOf_(post) {
  var text = String(post.coverUrl || '') + ' ' + JSON.stringify(post.body || []);
  var ids = {};
  var pattern = /googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/g;
  var match;
  while ((match = pattern.exec(text)) !== null) {
    ids[match[1]] = true;
  }
  return Object.keys(ids);
}

function trashUnusedImages_(candidates, props) {
  if (!candidates.length) {
    return;
  }
  try {
    var used = {};
    listPosts_(true).forEach(function (post) {
      imageIdsOf_(post).forEach(function (id) {
        used[id] = true;
      });
    });
    var folderId = aboutImagesFolder_(props).getId();
    candidates.forEach(function (id) {
      if (used[id]) {
        return;
      }
      try {
        var file = DriveApp.getFileById(id);
        var parents = file.getParents();
        while (parents.hasNext()) {
          if (parents.next().getId() === folderId) {
            file.setTrashed(true);
            return;
          }
        }
      } catch (err) {
        console.log('Không xóa được ảnh ' + id + ': ' + err);
      }
    });
  } catch (err) {
    console.log('Không dọn được ảnh không còn dùng: ' + err);
  }
}

function postFromRecord_(record, chunks) {
  var body = [];
  try {
    body = JSON.parse(bodyText_(record, chunks) || '[]');
  } catch (err) {
    body = [];
  }
  return {
    id: cellText_(record['Mã bài']),
    section: cellText_(record['Mục']),
    slug: cellText_(record['Slug']),
    category: cellText_(record['Chuyên mục']),
    title: cellText_(record['Tiêu đề']),
    summary: cellText_(record['Tóm tắt']),
    coverUrl: cellText_(record['Ảnh bìa']),
    author: cellText_(record['Tác giả']),
    readMinutes: Number(record['Phút đọc']) || 1,
    publishedAt: cellText_(record['Ngày đăng']),
    featured: cellText_(record['Nổi bật']) === 'Có',
    popular: cellText_(record['Đọc nhiều']) === 'Có',
    spotlight: cellText_(record['Chuyên đề']) === 'Có',
    status: cellText_(record['Trạng thái']) === 'Nháp' ? 'draft' : 'published',
    body: body,
    likes: Math.max(0, Number(record['Lượt tim']) || 0)
  };
}

function listPosts_(includeDrafts) {
  var table = readTable_(ensureTable_(POSTS_SHEET_NAME, POSTS_HEADERS));
  var posts = [];
  var chunks = readBodyChunks_();
  table.rows.forEach(function (record) {
    if (cellText_(record[POSTS_KEY]) === '') {
      return;
    }
    var post = postFromRecord_(record, chunks);
    if (includeDrafts || post.status === 'published') {
      posts.push(post);
    }
  });
  return posts;
}

function savePost_(post, props) {
  if (!post || typeof post !== 'object') {
    throw new Error('Thiếu dữ liệu bài viết.');
  }
  var sheet = ensureTable_(POSTS_SHEET_NAME, POSTS_HEADERS);
  var table = readTable_(sheet);
  var id = String(post.id || '');
  var targetRow = 0;
  var existingLikes = 0;
  var previousImages = [];
  var bodyChunks = readBodyChunks_();
  table.rows.forEach(function (record) {
    var recordId = cellText_(record[POSTS_KEY]);
    if (recordId === '') {
      return;
    }
    if (id !== '' && recordId === id) {
      targetRow = record._row;
      existingLikes = Math.max(0, Number(record['Lượt tim']) || 0);
      previousImages = imageIdsOf_(postFromRecord_(record, bodyChunks));
    } else if (cellText_(record['Mục']) === post.section && cellText_(record['Slug']) === post.slug) {
      throw new Error('Đường dẫn (slug) "' + post.slug + '" đã tồn tại trong mục này.');
    }
  });
  if (id !== '' && targetRow === 0) {
    throw new Error('Không tìm thấy bài viết cần sửa.');
  }
  if (id === '') {
    id = 'P-' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd') + '-' + randomCode_(4);
  }
  if (targetRow === 0) {
    targetRow = firstEmptyRow_(sheet, table.columns[POSTS_KEY]);
  }

  var values = {
    'Mã bài': id,
    'Mục': post.section,
    'Slug': post.slug,
    'Chuyên mục': post.category,
    'Tiêu đề': post.title,
    'Tóm tắt': post.summary,
    'Ảnh bìa': post.coverUrl || '',
    'Tác giả': post.author,
    'Phút đọc': Number(post.readMinutes) || 1,
    'Ngày đăng': post.publishedAt,
    'Nổi bật': post.featured ? 'Có' : '',
    'Đọc nhiều': post.popular ? 'Có' : '',
    'Chuyên đề': post.spotlight ? 'Có' : '',
    'Trạng thái': post.status === 'draft' ? 'Nháp' : 'Đã đăng',
    'Nội dung (JSON)': storeBody_(id, JSON.stringify(post.body || [])),
    'Lượt tim': existingLikes,
    'Cập nhật lúc': Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss')
  };
  Object.keys(values).forEach(function (name) {
    var column = table.columns[name];
    if (column) {
      sheet.getRange(targetRow, column).setNumberFormat('@').setValue(values[name]);
    }
  });
  SpreadsheetApp.flush();
  trashUnusedImages_(previousImages, props);
  return { ok: true, id: id };
}

function firstEmptyRow_(sheet, keyColumn) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 2;
  }
  var keys = sheet.getRange(2, keyColumn, lastRow - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0]).trim() === '') {
      return i + 2;
    }
  }
  return lastRow + 1;
}

function randomCode_(length) {
  var code = '';
  for (var i = 0; i < length; i++) {
    code += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
  }
  return code;
}

function deletePost_(id, props) {
  if (!id) {
    throw new Error('Thiếu mã bài viết.');
  }
  var sheet = ensureTable_(POSTS_SHEET_NAME, POSTS_HEADERS);
  var table = readTable_(sheet);
  for (var i = 0; i < table.rows.length; i++) {
    if (cellText_(table.rows[i][POSTS_KEY]) === id) {
      var images = imageIdsOf_(postFromRecord_(table.rows[i], readBodyChunks_()));
      sheet.deleteRow(table.rows[i]._row);
      removeBodyChunks_(id);
      SpreadsheetApp.flush();
      trashUnusedImages_(images, props);
      return { ok: true };
    }
  }
  throw new Error('Không tìm thấy bài viết cần xóa.');
}

function likePost_(section, slug, delta) {
  if (!section || !slug || (delta !== 1 && delta !== -1)) {
    throw new Error('Dữ liệu thả tim không hợp lệ.');
  }
  var sheet = ensureTable_(POSTS_SHEET_NAME, POSTS_HEADERS);
  var table = readTable_(sheet);
  for (var i = 0; i < table.rows.length; i++) {
    var record = table.rows[i];
    if (cellText_(record['Mục']) === section && cellText_(record['Slug']) === slug) {
      var likes = Math.max(0, (Number(record['Lượt tim']) || 0) + delta);
      sheet.getRange(record._row, table.columns['Lượt tim']).setNumberFormat('@').setValue(likes);
      SpreadsheetApp.flush();
      return { ok: true, likes: likes };
    }
  }
  throw new Error('Không tìm thấy bài viết.');
}

function listStats_() {
  var table = readTable_(ensureTable_(STATS_SHEET_NAME, STATS_HEADERS));
  var items = [];
  table.rows.forEach(function (record) {
    var value = cellText_(record['Giá trị']).trim();
    var label = cellText_(record['Nhãn']).trim();
    if (value === '' || label === '') {
      return;
    }
    items.push({ order: Number(record['Thứ tự']) || 0, value: value, label: label });
  });
  items.sort(function (a, b) {
    return a.order - b.order;
  });
  return items.map(function (item) {
    return { value: item.value, label: item.label };
  });
}

function saveStats_(items) {
  if (!Array.isArray(items) || items.length > 8) {
    throw new Error('Danh sách số liệu không hợp lệ.');
  }
  var sheet = ensureTable_(STATS_SHEET_NAME, STATS_HEADERS);
  var table = readTable_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  items.forEach(function (item, index) {
    var row = index + 2;
    sheet.getRange(row, table.columns['Thứ tự']).setNumberFormat('@').setValue(index + 1);
    sheet.getRange(row, table.columns['Giá trị']).setNumberFormat('@').setValue(String(item.value));
    sheet.getRange(row, table.columns['Nhãn']).setNumberFormat('@').setValue(String(item.label));
  });
  SpreadsheetApp.flush();
  return { ok: true };
}

function aboutImagesFolder_(props) {
  var folderId = props.getProperty('FOLDER_ID');
  if (!folderId) {
    throw new Error('Chưa cấu hình FOLDER_ID trong Script Properties.');
  }
  var root = DriveApp.getFolderById(folderId);
  var existing = root.getFoldersByName(ABOUT_IMAGES_FOLDER_NAME);
  return existing.hasNext() ? existing.next() : root.createFolder(ABOUT_IMAGES_FOLDER_NAME);
}

function uploadAboutImage_(image, props) {
  if (!image || typeof image !== 'object') {
    throw new Error('Thiếu dữ liệu ảnh.');
  }
  var extension = ABOUT_IMAGE_TYPES[image.mimeType];
  if (!extension) {
    throw new Error('Ảnh phải là JPG, PNG hoặc WEBP.');
  }
  var bytes = Utilities.base64Decode(String(image.base64 || ''));
  if (bytes.length === 0 || bytes.length > MAX_ABOUT_IMAGE_BYTES) {
    throw new Error('Ảnh rỗng hoặc lớn hơn 3 MB.');
  }
  var folder = aboutImagesFolder_(props);
  var stamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd-HHmmss');
  var file = folder.createFile(Utilities.newBlob(bytes, image.mimeType, stamp + '-' + randomCode_(4) + '.' + extension));
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    file.setTrashed(true);
    throw new Error('Không bật được chế độ chia sẻ công khai cho ảnh. Kiểm tra chính sách chia sẻ của Drive.');
  }
  return { ok: true, url: 'https://lh3.googleusercontent.com/d/' + file.getId() + '=w1600' };
}

function saveLogo_(reportCode, logo, props) {
  var extension = ALLOWED_LOGO_TYPES[logo.mimeType];
  if (!extension) {
    throw new Error('Định dạng logo không được hỗ trợ.');
  }
  var folderId = props.getProperty('FOLDER_ID');
  if (!folderId) {
    throw new Error('Chưa cấu hình FOLDER_ID trong Script Properties.');
  }
  var bytes = Utilities.base64Decode(logo.base64);
  if (bytes.length > MAX_LOGO_BYTES) {
    throw new Error('Logo lớn hơn 2 MB.');
  }

  var root = DriveApp.getFolderById(folderId);
  var existing = root.getFoldersByName(reportCode);
  var folder = existing.hasNext() ? existing.next() : root.createFolder(reportCode);

  var old = folder.getFiles();
  while (old.hasNext()) {
    var file = old.next();
    if (/^logo\./.test(file.getName())) {
      file.setTrashed(true);
    }
  }

  var blob = Utilities.newBlob(bytes, logo.mimeType, 'logo.' + extension);
  folder.createFile(blob);
  return folder.getUrl();
}

function translateTexts_(body) {
  var source = String(body.source || 'vi');
  var target = String(body.target || '');
  if (!TRANSLATE_LANGUAGES[source] || !TRANSLATE_LANGUAGES[target] || source === target) {
    throw new Error('Ngôn ngữ dịch không hợp lệ.');
  }
  var texts = body.texts;
  if (!Array.isArray(texts) || texts.length === 0 || texts.length > TRANSLATE_MAX_TEXTS) {
    throw new Error('Danh sách chuỗi cần dịch không hợp lệ.');
  }
  var translations = texts.map(function (text) {
    var value = String(text);
    if (value.length > TRANSLATE_MAX_CHARS) {
      throw new Error('Chuỗi cần dịch quá dài.');
    }
    if (value.trim() === '') {
      return value;
    }
    return LanguageApp.translate(value, source, target, { contentType: 'html' });
  });
  return { ok: true, translations: translations };
}

function translationLocale_(body) {
  var locale = String(body.locale || '');
  if (!TRANSLATION_LOCALES[locale]) {
    throw new Error('Ngôn ngữ bản dịch không hợp lệ.');
  }
  return locale;
}

function listTranslations_(body) {
  var locale = translationLocale_(body);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRANSLATION_SHEET_NAME);
  var items = {};
  if (!sheet || sheet.getLastRow() < 2) {
    return { ok: true, items: items };
  }
  var table = readTable_(sheet);
  table.rows.forEach(function (record) {
    var hash = cellText_(record['Mã băm']).trim();
    var manual = cellText_(record[locale + ' (sửa tay)']).trim();
    var auto = cellText_(record[locale]).trim();
    var text = manual || auto;
    if (hash && text) {
      items[hash] = text;
    }
  });
  return { ok: true, items: items };
}

function saveTranslations_(body) {
  var locale = translationLocale_(body);
  var items = body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > TRANSLATION_MAX_ITEMS) {
    throw new Error('Danh sách bản dịch không hợp lệ.');
  }
  var sheet = ensureTable_(TRANSLATION_SHEET_NAME, TRANSLATION_HEADERS);
  var table = readTable_(sheet);
  var rowByHash = {};
  table.rows.forEach(function (record) {
    rowByHash[cellText_(record['Mã băm']).trim()] = record;
  });
  var localeColumn = table.columns[locale];
  var now = new Date();
  var appended = [];
  var saved = 0;
  items.forEach(function (item) {
    var hash = String(item.hash || '');
    var text = String(item.text || '');
    if (!TRANSLATION_HASH_PATTERN.test(hash) || text === '' || text.length > TRANSLATE_MAX_CHARS) {
      return;
    }
    var existing = rowByHash[hash];
    if (existing) {
      if (cellText_(existing[locale]).trim() === '') {
        sheet.getRange(existing._row, localeColumn).setValue(text);
        sheet.getRange(existing._row, table.columns['Cập nhật lúc']).setValue(now);
        saved += 1;
      }
      return;
    }
    var row = TRANSLATION_HEADERS.map(function () { return ''; });
    row[0] = hash;
    row[1] = String(item.source || '').slice(0, TRANSLATE_MAX_CHARS);
    row[TRANSLATION_HEADERS.indexOf(locale)] = text;
    row[TRANSLATION_HEADERS.indexOf('Cập nhật lúc')] = now;
    appended.push(row);
    rowByHash[hash] = { _row: -1 };
    saved += 1;
  });
  if (appended.length > 0) {
    var start = Math.max(sheet.getLastRow(), 1) + 1;
    if (sheet.getMaxRows() < start + appended.length - 1) {
      sheet.insertRowsAfter(sheet.getMaxRows(), appended.length);
    }
    var range = sheet.getRange(start, 1, appended.length, TRANSLATION_HEADERS.length);
    range.setNumberFormat('@');
    range.setValues(appended);
  }
  return { ok: true, saved: saved };
}

function pruneTranslations_(body) {
  var keep = body.keep;
  if (!Array.isArray(keep) || keep.length === 0 || keep.length > TRANSLATION_PRUNE_MAX_KEEP) {
    throw new Error('Danh sách bản dịch cần giữ không hợp lệ.');
  }
  var keepSet = {};
  keep.forEach(function (hash) {
    if (TRANSLATION_HASH_PATTERN.test(String(hash))) {
      keepSet[String(hash)] = true;
    }
  });
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRANSLATION_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return { ok: true, removed: 0, keptManual: 0 };
  }
  var table = readTable_(sheet);
  var doomed = [];
  var keptManual = 0;
  table.rows.forEach(function (record) {
    var hash = cellText_(record['Mã băm']).trim();
    if (!hash || keepSet[hash]) {
      return;
    }
    var hasManual = Object.keys(TRANSLATION_LOCALES).some(function (locale) {
      return cellText_(record[locale + ' (sửa tay)']).trim() !== '';
    });
    if (hasManual) {
      keptManual += 1;
      return;
    }
    doomed.push(record._row);
  });
  doomed.sort(function (a, b) { return b - a; });
  var index = 0;
  while (index < doomed.length) {
    var last = doomed[index];
    var first = last;
    index += 1;
    while (index < doomed.length && doomed[index] === first - 1) {
      first = doomed[index];
      index += 1;
    }
    sheet.deleteRows(first, last - first + 1);
  }
  return { ok: true, removed: doomed.length, keptManual: keptManual };
}

function installTranslationTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    var handler = trigger.getHandlerFunction();
    if (handler === 'runScheduledTranslationSync' || handler === 'onTranslationSourceEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('runScheduledTranslationSync')
    .timeBased()
    .everyMinutes(TRANSLATION_SYNC_INTERVAL_MINUTES)
    .create();
  ScriptApp.newTrigger('onTranslationSourceEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  PropertiesService.getScriptProperties().setProperty('TRANSLATION_DIRTY', '1');
}

function onTranslationSourceEdit(e) {
  var name = e && e.range ? e.range.getSheet().getName() : '';
  if (name === TRANSLATION_SHEET_NAME) {
    return;
  }
  PropertiesService.getScriptProperties().setProperty('TRANSLATION_DIRTY', '1');
}

function runScheduledTranslationSync() {
  var props = PropertiesService.getScriptProperties();
  var last = Number(props.getProperty('TRANSLATION_LAST_FULL_RUN') || '0');
  var dirty = props.getProperty('TRANSLATION_DIRTY') === '1';
  if (!dirty && Date.now() - last < TRANSLATION_SYNC_FULL_EVERY_MS) {
    return;
  }
  runTranslationSync();
}

function runTranslationSync() {
  var props = PropertiesService.getScriptProperties();
  var baseUrl = String(props.getProperty('WEB_BASE_URL') || '').replace(/\/+$/, '');
  var secret = props.getProperty('WEB_CRON_SECRET');
  if (!baseUrl || !secret) {
    throw new Error('Thiếu WEB_BASE_URL hoặc WEB_CRON_SECRET trong Script Properties.');
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return;
  }
  try {
    props.deleteProperty('TRANSLATION_DIRTY');
    var started = Date.now();
    var previous = -1;
    var finished = false;
    for (var round = 0; round < TRANSLATION_SYNC_MAX_ROUNDS; round += 1) {
      var response = UrlFetchApp.fetch(baseUrl + '/api/cron/translations?prune=1', {
        method: 'get',
        headers: { Authorization: 'Bearer ' + secret },
        muteHttpExceptions: true,
      });
      if (response.getResponseCode() !== 200) {
        throw new Error('Web trả về mã ' + response.getResponseCode() + ': ' + response.getContentText());
      }
      var data = JSON.parse(response.getContentText());
      if (data.done) {
        finished = true;
        break;
      }
      if (previous >= 0 && data.remaining >= previous) {
        break;
      }
      previous = data.remaining;
      if (Date.now() - started > TRANSLATION_SYNC_MAX_MS) {
        break;
      }
    }
    if (finished) {
      props.setProperty('TRANSLATION_LAST_FULL_RUN', String(Date.now()));
    } else {
      props.setProperty('TRANSLATION_DIRTY', '1');
    }
  } finally {
    lock.releaseLock();
  }
}

function reportTempFolder_(props) {
  var folderId = props.getProperty('FOLDER_ID');
  if (!folderId) {
    throw new Error('Chưa cấu hình FOLDER_ID trong Script Properties.');
  }
  var root = DriveApp.getFolderById(folderId);
  var existing = root.getFoldersByName(REPORT_TEMP_FOLDER_NAME);
  return existing.hasNext() ? existing.next() : root.createFolder(REPORT_TEMP_FOLDER_NAME);
}

function reportsRootFolder_(props, folderId) {
  var explicitId = props.getProperty('REPORTS_FOLDER_ID');
  if (explicitId) {
    return DriveApp.getFolderById(explicitId);
  }
  var logoRoot = DriveApp.getFolderById(folderId);
  var base = logoRoot;
  var parents = logoRoot.getParents();
  if (parents.hasNext()) {
    base = parents.next();
  }
  var found = base.getFoldersByName(REPORT_EXPORTS_FOLDER_NAME);
  if (found.hasNext()) {
    return found.next();
  }
  if (base.getId() !== logoRoot.getId()) {
    var legacy = logoRoot.getFoldersByName(REPORT_EXPORTS_FOLDER_NAME);
    try {
      if (legacy.hasNext()) {
        var moved = legacy.next();
        moved.moveTo(base);
        return moved;
      }
      return base.createFolder(REPORT_EXPORTS_FOLDER_NAME);
    } catch (err) {
      console.log('Không tạo được thư mục báo cáo ngang cấp thư mục logo: ' + err);
    }
  }
  var inside = logoRoot.getFoldersByName(REPORT_EXPORTS_FOLDER_NAME);
  return inside.hasNext() ? inside.next() : logoRoot.createFolder(REPORT_EXPORTS_FOLDER_NAME);
}

function reportFolder_(reportCode, props) {
  var folderId = props.getProperty('FOLDER_ID');
  if (!folderId) {
    throw new Error('Chưa cấu hình FOLDER_ID trong Script Properties.');
  }
  var exportsRoot = reportsRootFolder_(props, folderId);
  var existing = exportsRoot.getFoldersByName(reportCode);
  return existing.hasNext() ? existing.next() : exportsRoot.createFolder(reportCode);
}

function reportCodeExists_(reportCode) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    return false;
  }
  var layout = findLayout_(sheet);
  var rowCount = sheet.getLastRow() - layout.headerRow;
  if (rowCount <= 0) {
    return false;
  }
  var keys = sheet.getRange(layout.headerRow + 1, layout.columns[KEY_COLUMN], rowCount, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0]).trim() === reportCode) {
      return true;
    }
  }
  return false;
}

function chunkFileName_(uploadId, format, index) {
  return uploadId + '.' + format + '.' + index;
}

function uploadReportChunk_(body, props) {
  var uploadId = String(body.uploadId || '');
  var format = String(body.format || '');
  var index = Number(body.index);
  var data = String(body.data || '');
  if (!UPLOAD_ID_PATTERN.test(uploadId)) {
    throw new Error('Mã tải lên không hợp lệ.');
  }
  if (!REPORT_FORMATS[format]) {
    throw new Error('Định dạng báo cáo không được hỗ trợ.');
  }
  if (!(index >= 0 && index < REPORT_MAX_CHUNKS) || Math.floor(index) !== index) {
    throw new Error('Số thứ tự mảnh không hợp lệ.');
  }
  if (data.length === 0 || data.length > REPORT_MAX_CHUNK_CHARS) {
    throw new Error('Mảnh dữ liệu rỗng hoặc quá lớn.');
  }
  var folder = reportTempFolder_(props);
  var name = chunkFileName_(uploadId, format, index);
  var existing = folder.getFilesByName(name);
  if (existing.hasNext()) {
    existing.next().setContent(data);
  } else {
    folder.createFile(name, data, MimeType.PLAIN_TEXT);
  }
  return { ok: true };
}

function assembleReportFile_(folder, uploadId, spec) {
  var base64 = '';
  for (var i = 0; i < spec.chunks; i++) {
    var files = folder.getFilesByName(chunkFileName_(uploadId, spec.format, i));
    if (!files.hasNext()) {
      throw new Error('Thiếu mảnh ' + (i + 1) + '/' + spec.chunks + ' của file ' + spec.format + '.');
    }
    var part = files.next().getBlob().getDataAsString();
    if (i < spec.chunks - 1 && (part.length % 4 !== 0 || part.indexOf('=') !== -1)) {
      throw new Error('Mảnh ' + (i + 1) + ' của file ' + spec.format + ' có độ dài không hợp lệ.');
    }
    base64 += part;
  }
  var bytes = Utilities.base64Decode(base64);
  if (bytes.length !== spec.bytes || bytes.length > REPORT_MAX_FILE_BYTES) {
    throw new Error('Kích thước file ' + spec.format + ' không khớp.');
  }
  var signature = REPORT_FORMATS[spec.format].signature;
  for (var j = 0; j < signature.length; j++) {
    if ((bytes[j] & 255) !== signature[j]) {
      throw new Error('File ' + spec.format + ' không đúng định dạng.');
    }
  }
  return bytes;
}

function safeReportFileName_(name, format) {
  var cleaned = String(name || '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .substring(0, 120);
  var suffix = '.' + format;
  if (cleaned === '') {
    return 'bao-cao-esg' + suffix;
  }
  return cleaned.toLowerCase().slice(-suffix.length) === suffix ? cleaned : cleaned + suffix;
}

function createExportId_() {
  var date = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  return 'RX-' + date + '-' + randomCode_(6);
}

function appendColumns_(sheet, startRow, records) {
  if (!records.length) {
    return;
  }
  var table = readTable_(sheet);
  var needed = startRow + records.length - 1;
  var missing = needed - sheet.getMaxRows();
  if (missing > 0) {
    sheet.insertRowsAfter(sheet.getMaxRows(), missing);
  }
  Object.keys(records[0]).forEach(function (name) {
    var column = table.columns[name];
    if (!column) {
      throw new Error('Thiếu cột "' + name + '" trong tab "' + sheet.getName() + '".');
    }
    sheet.getRange(startRow, column, records.length, 1)
      .setNumberFormat('@')
      .setValues(records.map(function (record) {
        return [record[name]];
      }));
  });
}

function writeSnapshotRows_(exportId, snapshot) {
  var sheet = ensureTable_(SNAPSHOT_SHEET_NAME, SNAPSHOT_HEADERS);
  var records = [];
  for (var start = 0; start < snapshot.length; start += SNAPSHOT_CHUNK_SIZE) {
    records.push({
      'Mã lần xuất': exportId,
      'Phần': records.length + 1,
      'Nội dung': snapshot.substring(start, start + SNAPSHOT_CHUNK_SIZE)
    });
  }
  appendColumns_(sheet, Math.max(sheet.getLastRow(), 1) + 1, records);
}

function removeSnapshotRows_(exportId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SNAPSHOT_SHEET_NAME);
  if (!sheet) {
    return;
  }
  var rows = readTable_(sheet).rows;
  for (var i = rows.length - 1; i >= 0; i--) {
    if (cellText_(rows[i][EXPORT_KEY]) === exportId) {
      sheet.deleteRow(rows[i]._row);
    }
  }
}

function trashReportExportFiles_(record, removeEmptyParent) {
  var exportId = cellText_(record[EXPORT_KEY]);
  var exportFolder = null;
  ['Id file PDF', 'Id file Word'].forEach(function (column) {
    var id = cellText_(record[column]);
    if (id === '') {
      return;
    }
    try {
      var file = DriveApp.getFileById(id);
      var parents = file.getParents();
      if (parents.hasNext()) {
        var parent = parents.next();
        if (parent.getName() === exportId) {
          exportFolder = parent;
        }
      }
      file.setTrashed(true);
    } catch (err) {
      console.log('Không xóa được file báo cáo ' + id + ': ' + err);
    }
  });
  if (exportFolder === null) {
    return;
  }
  var codeFolder = null;
  try {
    var upper = exportFolder.getParents();
    codeFolder = upper.hasNext() ? upper.next() : null;
    exportFolder.setTrashed(true);
  } catch (err) {
    console.log('Không xóa được thư mục báo cáo ' + exportId + ': ' + err);
    return;
  }
  if (removeEmptyParent && codeFolder !== null) {
    try {
      if (!codeFolder.getFiles().hasNext() && !codeFolder.getFolders().hasNext()) {
        codeFolder.setTrashed(true);
      }
    } catch (err) {
      console.log('Không xóa được thư mục mã báo cáo: ' + err);
    }
  }
}

function pruneReportExports_(reportCode) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EXPORT_SHEET_NAME);
  if (!sheet) {
    return 0;
  }
  var mine = readTable_(sheet).rows.filter(function (record) {
    return cellText_(record['Mã báo cáo']) === reportCode && cellText_(record[EXPORT_KEY]) !== '';
  });
  if (mine.length <= REPORT_KEEP_EXPORTS) {
    return 0;
  }
  mine.sort(function (a, b) {
    var left = cellText_(a['Thời gian']);
    var right = cellText_(b['Thời gian']);
    if (left !== right) {
      return left < right ? -1 : 1;
    }
    return a._row - b._row;
  });
  var dropped = mine.slice(0, mine.length - REPORT_KEEP_EXPORTS);
  dropped.forEach(function (record) {
    trashReportExportFiles_(record, false);
    removeSnapshotRows_(cellText_(record[EXPORT_KEY]));
  });
  dropped
    .map(function (record) {
      return record._row;
    })
    .sort(function (a, b) {
      return b - a;
    })
    .forEach(function (row) {
      sheet.deleteRow(row);
    });
  return dropped.length;
}

function discardReportChunks_(folder, uploadId, specs) {
  specs.forEach(function (spec) {
    for (var i = 0; i < spec.chunks; i++) {
      var files = folder.getFilesByName(chunkFileName_(uploadId, spec.format, i));
      while (files.hasNext()) {
        files.next().setTrashed(true);
      }
    }
  });
}

function fillReportLinks_(sheet) {
  var table = readTable_(sheet);
  EXPORT_LINKS.forEach(function (target) {
    var column = table.columns[target.linkColumn];
    if (!column || !table.columns[target.idColumn]) {
      return;
    }
    table.rows.forEach(function (record) {
      var id = cellText_(record[target.idColumn]);
      if (id === '' || cellText_(record[target.linkColumn]) === target.label) {
        return;
      }
      var richText = SpreadsheetApp.newRichTextValue()
        .setText(target.label)
        .setLinkUrl('https://drive.google.com/file/d/' + id + '/view')
        .build();
      sheet.getRange(record._row, column).setNumberFormat('@').setRichTextValue(richText);
    });
  });
}

function backfillReportLinks() {
  var sheet = ensureTable_(EXPORT_SHEET_NAME, EXPORT_HEADERS);
  fillReportLinks_(sheet);
  Logger.log('Đã ghi link file báo cáo cho các dòng còn thiếu.');
}

function commitReportExport_(exportId, body, record) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    writeSnapshotRows_(exportId, String(body.snapshot));
    try {
      var sheet = ensureTable_(EXPORT_SHEET_NAME, EXPORT_HEADERS);
      var values = {};
      values[EXPORT_KEY] = exportId;
      values['Mã báo cáo'] = String(body.reportCode);
      values['Thời gian'] = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
      values['Ngôn ngữ'] = String(body.locale);
      values['Trạng thái'] = REPORT_STATUS_LABELS[body.status];
      values['Doanh nghiệp'] = String(body.companyName || '').substring(0, 200);
      values['Giao diện'] = REPORT_THEME_LABELS[body.theme];
      Object.keys(record).forEach(function (name) {
        values[name] = record[name];
      });
      appendColumns_(sheet, Math.max(sheet.getLastRow(), 1) + 1, [values]);
      try {
        fillReportLinks_(sheet);
      } catch (linkError) {
        console.log('Không ghi được link file báo cáo: ' + linkError);
      }
    } catch (err) {
      removeSnapshotRows_(exportId);
      throw err;
    }
    var pruned = 0;
    try {
      pruned = pruneReportExports_(String(body.reportCode));
    } catch (err) {
      console.log('Không dọn được lần xuất cũ: ' + err);
    }
    SpreadsheetApp.flush();
    return pruned;
  } finally {
    lock.releaseLock();
  }
}

function finishReport_(body, props) {
  var reportCode = String(body.reportCode || '');
  var uploadId = String(body.uploadId || '');
  if (!REPORT_CODE_PATTERN.test(reportCode)) {
    throw new Error('Mã báo cáo không hợp lệ.');
  }
  if (!UPLOAD_ID_PATTERN.test(uploadId)) {
    throw new Error('Mã tải lên không hợp lệ.');
  }
  if (!REPORT_LOCALES[body.locale] || !REPORT_STATUS_LABELS[body.status] || !REPORT_THEME_LABELS[body.theme]) {
    throw new Error('Thông tin báo cáo không hợp lệ.');
  }
  var snapshot = String(body.snapshot || '');
  if (snapshot.length < 2 || snapshot.length > REPORT_MAX_SNAPSHOT_CHARS) {
    throw new Error('Dữ liệu khảo sát rỗng hoặc quá lớn.');
  }
  JSON.parse(snapshot);
  var specs = body.files;
  if (!Array.isArray(specs) || specs.length < 1 || specs.length > 2) {
    throw new Error('Thiếu danh sách file báo cáo.');
  }
  var seen = {};
  specs.forEach(function (spec) {
    var valid = spec && REPORT_FORMATS[spec.format] && !seen[spec.format] &&
      spec.bytes > 0 && spec.bytes <= REPORT_MAX_FILE_BYTES &&
      spec.chunks >= 1 && spec.chunks <= REPORT_MAX_CHUNKS;
    if (!valid) {
      throw new Error('Thông tin file báo cáo không hợp lệ.');
    }
    seen[spec.format] = true;
  });
  if (!reportCodeExists_(reportCode)) {
    throw new Error('Chưa có hồ sơ doanh nghiệp cho mã báo cáo này.');
  }

  var ownerEmail = body.email ? normalizeEmail_(body.email) : '';
  var tempFolder = reportTempFolder_(props);
  var folder = reportFolder_(reportCode, props);
  var exportId = createExportId_();
  var exportFolder = null;
  var record = {};
  if (ownerEmail !== '') {
    record[OWNER_COLUMN] = ownerEmail;
  }
  var pruned = 0;
  try {
    specs.forEach(function (spec) {
      var format = REPORT_FORMATS[spec.format];
      var bytes = assembleReportFile_(tempFolder, uploadId, spec);
      if (exportFolder === null) {
        exportFolder = folder.createFolder(exportId);
      }
      var fileName = exportId + '_' + safeReportFileName_(spec.name, spec.format);
      var file = exportFolder.createFile(Utilities.newBlob(bytes, format.mime, fileName));
      record[format.idColumn] = file.getId();
      record[format.nameColumn] = fileName;
    });
    pruned = commitReportExport_(exportId, body, record);
  } catch (err) {
    if (exportFolder !== null) {
      try {
        exportFolder.setTrashed(true);
      } catch (trashError) {
        console.log('Không xóa được thư mục dở dang: ' + trashError);
      }
    }
    throw err;
  }
  try {
    discardReportChunks_(tempFolder, uploadId, specs);
    cleanupReportUploads_(props);
  } catch (err) {
    console.log('Không dọn được tệp tạm: ' + err);
  }
  if (ownerEmail !== '') {
    try {
      writeCustomerEmail_(reportCode, ownerEmail);
    } catch (err) {
      console.log('Không ghi được email vào Data khách hàng: ' + err);
    }
  }
  var fileIds = {};
  specs.forEach(function (spec) {
    fileIds[spec.format] = record[REPORT_FORMATS[spec.format].idColumn];
  });
  return { ok: true, exportId: exportId, fileIds: fileIds, pruned: pruned };
}

function normalizeEmail_(value) {
  var email = String(value || '').trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new Error('Email không hợp lệ.');
  }
  return email;
}

function bytesToHex_(bytes) {
  return bytes
    .map(function (value) {
      var hex = (value < 0 ? value + 256 : value).toString(16);
      return hex.length < 2 ? '0' + hex : hex;
    })
    .join('');
}

function hmacHex_(value, props) {
  return bytesToHex_(Utilities.computeHmacSha256Signature(value, props.getProperty('SECRET')));
}

function readJsonCache_(cache, key) {
  var raw = cache.get(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    cache.remove(key);
    return null;
  }
}

function generateOtpCode_() {
  var hex = Utilities.getUuid().replace(/-/g, '').substring(0, 12);
  var number = parseInt(hex, 16) % 1000000;
  return ('000000' + number).slice(-6);
}

function otpRequest_(body, props) {
  var email = normalizeEmail_(body.email);
  var subject = String(body.subject || '').trim();
  var text = String(body.text || '');
  if (subject === '' || subject.length > 200 || text.length < 10 || text.length > 3000 || text.indexOf('{code}') === -1) {
    throw new Error('Nội dung email xác nhận không hợp lệ.');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var cache = CacheService.getScriptCache();
    var emailKey = hmacHex_(email, props);
    var now = Date.now();
    var state = readJsonCache_(cache, 'otp:' + emailKey);
    if (state && now - state.sentAt < OTP_RESEND_SECONDS * 1000) {
      return { ok: true, status: 'wait', retryAfter: Math.ceil((OTP_RESEND_SECONDS * 1000 - (now - state.sentAt)) / 1000) };
    }
    var hourly = readJsonCache_(cache, 'otph:' + emailKey);
    var hourlyActive = hourly && now - hourly.start < 3600000;
    if (hourlyActive && hourly.count >= OTP_PER_EMAIL_PER_HOUR) {
      return { ok: true, status: 'hourly-limit', retryAfter: Math.ceil((3600000 - (now - hourly.start)) / 1000) };
    }
    var today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
    var day = String(props.getProperty('OTP_DAY') || '').split(':');
    var used = day[0] === today ? Number(day[1]) || 0 : 0;
    if (used >= OTP_DAILY_LIMIT || MailApp.getRemainingDailyQuota() < OTP_MIN_MAIL_QUOTA) {
      return { ok: true, status: 'daily-limit' };
    }
    var code = generateOtpCode_();
    MailApp.sendEmail(email, subject, text.split('{code}').join(code), { name: OTP_SENDER_NAME });
    cache.put(
      'otp:' + emailKey,
      JSON.stringify({ h: hmacHex_(code + ':' + emailKey, props), tries: 0, sentAt: now }),
      OTP_TTL_SECONDS
    );
    cache.put(
      'otph:' + emailKey,
      JSON.stringify(hourlyActive ? { start: hourly.start, count: hourly.count + 1 } : { start: now, count: 1 }),
      3600
    );
    props.setProperty('OTP_DAY', today + ':' + (used + 1));
    return { ok: true, status: 'sent', expiresIn: OTP_TTL_SECONDS, resendAfter: OTP_RESEND_SECONDS };
  } finally {
    lock.releaseLock();
  }
}

function otpVerify_(body, props) {
  var email = normalizeEmail_(body.email);
  var code = String(body.code || '');
  if (!OTP_CODE_PATTERN.test(code)) {
    throw new Error('Mã xác nhận không hợp lệ.');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var cache = CacheService.getScriptCache();
    var emailKey = hmacHex_(email, props);
    var key = 'otp:' + emailKey;
    var state = readJsonCache_(cache, key);
    if (!state) {
      return { ok: true, status: 'expired' };
    }
    if (state.tries >= OTP_MAX_TRIES) {
      cache.remove(key);
      return { ok: true, status: 'locked' };
    }
    if (hmacHex_(code + ':' + emailKey, props) === state.h) {
      cache.remove(key);
      return { ok: true, status: 'verified' };
    }
    state.tries += 1;
    if (state.tries >= OTP_MAX_TRIES) {
      cache.remove(key);
      return { ok: true, status: 'locked' };
    }
    var remaining = Math.max(1, OTP_TTL_SECONDS - Math.floor((Date.now() - state.sentAt) / 1000));
    cache.put(key, JSON.stringify(state), remaining);
    return { ok: true, status: 'invalid', triesLeft: OTP_MAX_TRIES - state.tries };
  } finally {
    lock.releaseLock();
  }
}

function writeCustomerEmail_(reportCode, email) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    return;
  }
  var layout = findLayout_(sheet);
  var column = layout.columns[OWNER_COLUMN];
  if (!column) {
    return;
  }
  var rowCount = sheet.getLastRow() - layout.headerRow;
  if (rowCount <= 0) {
    return;
  }
  var keys = sheet.getRange(layout.headerRow + 1, layout.columns[KEY_COLUMN], rowCount, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0]).trim() === reportCode) {
      sheet.getRange(layout.headerRow + 1 + i, column).setNumberFormat('@').setValue(email);
      return;
    }
  }
}

function setReportOwner_(body) {
  var exportId = String(body.exportId || '');
  var email = normalizeEmail_(body.email);
  if (!EXPORT_ID_PATTERN.test(exportId)) {
    throw new Error('Mã lần xuất không hợp lệ.');
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var reportCode = '';
  var status = 'missing';
  try {
    if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EXPORT_SHEET_NAME)) {
      return { ok: true, status: 'missing' };
    }
    var sheet = ensureTable_(EXPORT_SHEET_NAME, EXPORT_HEADERS);
    var table = readTable_(sheet);
    var column = table.columns[OWNER_COLUMN];
    var record = null;
    table.rows.forEach(function (candidate) {
      if (cellText_(candidate[EXPORT_KEY]) === exportId) {
        record = candidate;
      }
    });
    if (!record || !column) {
      return { ok: true, status: 'missing' };
    }
    reportCode = cellText_(record['Mã báo cáo']);
    var current = cellText_(record[OWNER_COLUMN]).toLowerCase();
    if (current === email) {
      status = 'already';
    } else if (current !== '') {
      return { ok: true, status: 'conflict' };
    } else {
      sheet.getRange(record._row, column).setNumberFormat('@').setValue(email);
      status = 'attached';
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  try {
    writeCustomerEmail_(reportCode, email);
  } catch (err) {
    console.log('Không ghi được email vào Data khách hàng: ' + err);
  }
  return { ok: true, status: status };
}

function ownedExportRows_(email) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EXPORT_SHEET_NAME);
  if (!sheet) {
    return { sheet: null, rows: [] };
  }
  var wanted = normalizeEmail_(email);
  var rows = readTable_(sheet).rows.filter(function (record) {
    return cellText_(record[EXPORT_KEY]) !== '' && cellText_(record[OWNER_COLUMN]).toLowerCase() === wanted;
  });
  return { sheet: sheet, rows: rows };
}

function findOwnedExport_(email, exportId) {
  if (!EXPORT_ID_PATTERN.test(exportId)) {
    throw new Error('Mã lần xuất không hợp lệ.');
  }
  var found = null;
  ownedExportRows_(email).rows.forEach(function (record) {
    if (cellText_(record[EXPORT_KEY]) === exportId) {
      found = record;
    }
  });
  return found;
}

function listOwnerReports_(body) {
  var reports = ownedExportRows_(body.email).rows.map(function (record) {
    return {
      exportId: cellText_(record[EXPORT_KEY]),
      reportCode: cellText_(record['Mã báo cáo']),
      time: cellText_(record['Thời gian']),
      locale: cellText_(record['Ngôn ngữ']),
      status: cellText_(record['Trạng thái']) === REPORT_STATUS_LABELS.complete ? 'complete' : 'draft',
      company: cellText_(record['Doanh nghiệp']),
      theme: cellText_(record['Giao diện']) === REPORT_THEME_LABELS.brand ? 'brand' : 'default',
      pdf: cellText_(record['Id file PDF']) !== '',
      docx: cellText_(record['Id file Word']) !== ''
    };
  });
  reports.sort(function (a, b) {
    if (a.time !== b.time) {
      return a.time < b.time ? 1 : -1;
    }
    return a.exportId < b.exportId ? 1 : -1;
  });
  return { ok: true, reports: reports };
}

function getOwnerReportFile_(body) {
  var format = String(body.format || '');
  var spec = REPORT_FORMATS[format];
  if (!spec) {
    throw new Error('Định dạng file không hợp lệ.');
  }
  var index = Number(body.index);
  if (!isFinite(index) || index < 0 || Math.floor(index) !== index) {
    throw new Error('Số thứ tự mảnh không hợp lệ.');
  }
  var record = findOwnedExport_(String(body.email || ''), String(body.exportId || ''));
  if (!record) {
    return { ok: true, status: 'missing' };
  }
  var id = cellText_(record[spec.idColumn]);
  if (id === '') {
    return { ok: true, status: 'missing' };
  }
  var file;
  try {
    file = DriveApp.getFileById(id);
    if (file.isTrashed()) {
      return { ok: true, status: 'missing' };
    }
  } catch (err) {
    return { ok: true, status: 'missing' };
  }
  var bytes = file.getBlob().getBytes();
  var total = Math.max(1, Math.ceil(bytes.length / REPORT_DOWNLOAD_CHUNK_BYTES));
  if (index >= total) {
    return { ok: true, status: 'range' };
  }
  var part = bytes.slice(index * REPORT_DOWNLOAD_CHUNK_BYTES, (index + 1) * REPORT_DOWNLOAD_CHUNK_BYTES);
  return {
    ok: true,
    status: 'ok',
    name: cellText_(record[spec.nameColumn]),
    size: bytes.length,
    total: total,
    data: Utilities.base64Encode(part)
  };
}

function getOwnerSnapshot_(body) {
  var record = findOwnedExport_(String(body.email || ''), String(body.exportId || ''));
  if (!record) {
    return { ok: true, status: 'missing' };
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SNAPSHOT_SHEET_NAME);
  if (!sheet) {
    return { ok: true, status: 'missing' };
  }
  var exportId = cellText_(record[EXPORT_KEY]);
  var parts = readTable_(sheet).rows.filter(function (row) {
    return cellText_(row[EXPORT_KEY]) === exportId;
  });
  if (!parts.length) {
    return { ok: true, status: 'missing' };
  }
  parts.sort(function (a, b) {
    return Number(a['Phần']) - Number(b['Phần']);
  });
  var text = parts.map(function (row) {
    return cellText_(row['Nội dung']);
  }).join('');
  return { ok: true, status: 'ok', snapshot: text };
}

function deleteOwnerReport_(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var record = findOwnedExport_(String(body.email || ''), String(body.exportId || ''));
    if (!record) {
      return { ok: true, status: 'missing' };
    }
    var exportId = cellText_(record[EXPORT_KEY]);
    trashReportExportFiles_(record, true);
    removeSnapshotRows_(exportId);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EXPORT_SHEET_NAME);
    var fresh = readTable_(sheet).rows.filter(function (row) {
      return cellText_(row[EXPORT_KEY]) === exportId;
    });
    fresh.forEach(function (row) {
      sheet.deleteRow(row._row);
    });
    SpreadsheetApp.flush();
    return { ok: true, status: 'deleted' };
  } finally {
    lock.releaseLock();
  }
}

function logMailQuota() {
  var props = PropertiesService.getScriptProperties();
  Logger.log('Hạn mức email còn lại hôm nay: ' + MailApp.getRemainingDailyQuota());
  Logger.log('Số mã OTP đã gửi (ngày:số lượng): ' + (props.getProperty('OTP_DAY') || 'chưa có'));
}

function cleanupReportUploads_(props) {
  var folder = reportTempFolder_(props);
  var files = folder.getFiles();
  var cutoff = new Date().getTime() - REPORT_TEMP_MAX_AGE_MS;
  var removed = 0;
  while (files.hasNext()) {
    var file = files.next();
    if (file.getDateCreated().getTime() < cutoff) {
      file.setTrashed(true);
      removed++;
    }
  }
  return removed;
}

function cleanupReportOrphans_() {
  var snapshotSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SNAPSHOT_SHEET_NAME);
  if (!snapshotSheet) {
    return 0;
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var known = {};
    var exportSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EXPORT_SHEET_NAME);
    if (exportSheet) {
      readTable_(exportSheet).rows.forEach(function (record) {
        known[cellText_(record[EXPORT_KEY])] = true;
      });
    }
    var rows = readTable_(snapshotSheet).rows;
    var removed = 0;
    for (var i = rows.length - 1; i >= 0; i--) {
      var id = cellText_(rows[i][EXPORT_KEY]);
      if (id !== '' && !known[id]) {
        snapshotSheet.deleteRow(rows[i]._row);
        removed++;
      }
    }
    SpreadsheetApp.flush();
    return removed;
  } finally {
    lock.releaseLock();
  }
}

function cleanupReportUploads() {
  var removed = cleanupReportUploads_(PropertiesService.getScriptProperties());
  Logger.log('Đã xóa ' + removed + ' tệp tải lên tạm quá hạn.');
  var orphans = cleanupReportOrphans_();
  Logger.log('Đã xóa ' + orphans + ' dòng nội dung khảo sát mồ côi.');
}

function installReportCleanupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'cleanupReportUploads') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('cleanupReportUploads')
    .timeBased()
    .everyDays(1)
    .atHour(REPORT_CLEANUP_TRIGGER_HOUR)
    .create();
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Yêu cầu rỗng.');
  }
  return JSON.parse(e.postData.contents);
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function authorize() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('FOLDER_ID');
  if (!folderId) {
    throw new Error('Hãy khai báo FOLDER_ID trong Script Properties trước.');
  }
  var folder = DriveApp.getFolderById(folderId);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Không tìm thấy tab "' + SHEET_NAME + '".');
  }
  var layout = findLayout_(sheet);
  Logger.log('Thư mục logo: ' + folder.getName());
  Logger.log('Dòng tiêu đề: ' + layout.headerRow);
  Logger.log('Các cột: ' + Object.keys(layout.columns).join(', '));
  Logger.log('Thử dịch: ' + LanguageApp.translate('Xin chào', 'vi', 'en'));
}
