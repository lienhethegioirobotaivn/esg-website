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
