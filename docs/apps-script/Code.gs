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

function doPost(e) {
  try {
    var body = parseBody_(e);
    var props = PropertiesService.getScriptProperties();
    var expected = props.getProperty('SECRET');
    if (!expected || body.secret !== expected) {
      return json_({ ok: false, error: 'Sai khóa xác thực.' });
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
}
