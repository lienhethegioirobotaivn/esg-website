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

function doPost(e) {
  try {
    var body = parseBody_(e);
    var props = PropertiesService.getScriptProperties();
    var expected = props.getProperty('SECRET');
    if (!expected || body.secret !== expected) {
      return json_({ ok: false, error: 'Sai khóa xác thực.' });
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

function findLayout_(sheet) {
  var width = Math.max(sheet.getLastColumn(), 1);
  var rows = Math.min(HEADER_SCAN_ROWS, Math.max(sheet.getLastRow(), 1));
  var data = sheet.getRange(1, 1, rows, width).getValues();
  for (var r = 0; r < data.length; r++) {
    for (var c = 0; c < data[r].length; c++) {
      if (String(data[r][c]).trim() === KEY_COLUMN) {
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
  throw new Error('Không tìm thấy cột "' + KEY_COLUMN + '" trong tab "' + SHEET_NAME + '".');
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
