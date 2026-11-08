/**
 * RSVP backend for the wedding site — Google Apps Script bound to a Sheet.
 *
 * Sheet "Invitados" columns (row 1 = headers, created by setup()):
 *   id | invitacion | nombres | asistencia | asisten | confirmados | nota | actualizado
 *
 *   id          short code, generated automatically (leave blank, run assignIds)
 *   invitacion  name as printed on the invitation, e.g. "Familia Pacheco Alcalá"
 *   nombres     people in that invitation, separated by commas:
 *               "Luis Pacheco, Angela Pérez, Sofía Pacheco"
 *   asistencia  "" | "si" | "no"            (written by the site)
 *   asisten     names that confirmed, comma-separated (written by the site)
 *   confirmados number attending            (written by the site)
 *   nota        guest message               (written by the site)
 *   actualizado last update time            (written by the site)
 *
 * GET  ?q=text&k=CODE  -> { matches: [{id, invitacion, nombres:[...], asistencia, asisten:[...], nota}] }
 * POST {id, asistencia, asisten:[...], nota, k: CODE} -> { ok: true, ... }
 *
 * Access code: set a Script Property named ACCESS_CODE (Project Settings →
 * Script Properties). Every request must carry it as "k". If the property is
 * empty or missing, the check is skipped.
 */

var SCRIPT_VERSION = 3;   // bump when the script changes; visible at ?diag=1
var SHEET_NAME = 'Invitados';
var HEADERS = ['id', 'invitacion', 'nombres', 'asistencia', 'asisten', 'confirmados', 'nota', 'actualizado'];
var MAX_MATCHES = 8;

function doGet(e) {
  if (e && e.parameter && e.parameter.diag) {
    // Health check: which version is deployed and whether an access code is configured.
    var code = PropertiesService.getScriptProperties().getProperty('ACCESS_CODE');
    return json_({ version: SCRIPT_VERSION, codeSet: !!code, codeLength: code ? code.length : 0 });
  }
  if (!authorized_(e && e.parameter && e.parameter.k)) return json_({ matches: [], error: 'unauthorized' });
  var q = (e && e.parameter && e.parameter.q) ? String(e.parameter.q) : '';
  q = norm_(q);
  if (q.length < 3) return json_({ matches: [] });
  var terms = q.split(/\s+/).filter(Boolean);
  var rows = readRows_();
  var matches = rows.filter(function (r) {
    var n = norm_(r.invitacion);
    return terms.every(function (t) { return n.indexOf(t) !== -1; });
  }).slice(0, MAX_MATCHES).map(function (r) {
    return { id: r.id, invitacion: r.invitacion, nombres: splitNames_(r.nombres),
             asistencia: r.asistencia || '', asisten: splitNames_(r.asisten), nota: r.nota || '' };
  });
  return json_({ matches: matches });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (!authorized_(body.k)) return json_({ ok: false, error: 'unauthorized' });
    var id = String(body.id || '').trim();
    var asistencia = String(body.asistencia || '').toLowerCase();
    var asisten = Array.isArray(body.asisten) ? body.asisten.map(function (n) { return String(n).trim(); }) : [];
    var nota = String(body.nota || '').slice(0, 300);

    if (!id) return json_({ ok: false, error: 'missing id' });
    if (asistencia !== 'si' && asistencia !== 'no') return json_({ ok: false, error: 'bad asistencia' });

    var sheet = sheet_();
    var data = sheet.getDataRange().getValues();
    var col = colIndex_(data[0]);
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][col.id]) === id) {
        var nombres = splitNames_(data[i][col.nombres]);
        // keep only names that belong to this invitation, in sheet order
        var ok = nombres.filter(function (n) { return asisten.indexOf(n) !== -1; });
        if (asistencia === 'no') ok = [];
        if (asistencia === 'si' && ok.length === 0) return json_({ ok: false, error: 'no names' });
        var row = i + 1;
        sheet.getRange(row, col.asistencia + 1).setValue(asistencia);
        sheet.getRange(row, col.asisten + 1).setValue(ok.join(', '));
        sheet.getRange(row, col.confirmados + 1).setValue(ok.length);
        sheet.getRange(row, col.nota + 1).setValue(nota);
        sheet.getRange(row, col.actualizado + 1).setValue(new Date());
        return json_({ ok: true, id: id, asistencia: asistencia, asisten: ok, confirmados: ok.length });
      }
    }
    return json_({ ok: false, error: 'not found' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// One-time setup helpers (run from the Apps Script editor)
// ---------------------------------------------------------------------------

/** Creates the sheet with headers and two sample rows if it does not exist. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.appendRow(['', 'Familia Ejemplo Pérez', 'Mamá Ejemplo, Papá Ejemplo, Hija Ejemplo', '', '', '', '', '']);
    sheet.appendRow(['', 'Juan Prueba', 'Juan Prueba', '', '', '', '', '']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  assignIds();
  addSummary_();
}

/** Gives every row without an id a short random code. Run again after adding guests. */
function assignIds() {
  var sheet = sheet_();
  var data = sheet.getDataRange().getValues();
  var col = colIndex_(data[0]);
  var used = {};
  data.slice(1).forEach(function (r) { if (r[col.id]) used[r[col.id]] = true; });
  for (var i = 1; i < data.length; i++) {
    if (!data[i][col.id] && data[i][col.invitacion]) {
      var id;
      do { id = randomId_(); } while (used[id]);
      used[id] = true;
      sheet.getRange(i + 1, col.id + 1).setValue(id);
    }
  }
}

/** Adds a "Resumen" sheet with live totals. */
function addSummary_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName('Resumen')) return;
  var s = ss.insertSheet('Resumen');
  s.getRange('A1:B6').setValues([
    ['Invitaciones', '=COUNTA(Invitados!B2:B)'],
    ['Personas invitadas', '=SUMPRODUCT(LEN(Invitados!C2:C)-LEN(SUBSTITUTE(Invitados!C2:C,",",""))+(Invitados!C2:C<>""))'],
    ['Confirmaron sí', '=COUNTIF(Invitados!D2:D,"si")'],
    ['Confirmaron no', '=COUNTIF(Invitados!D2:D,"no")'],
    ['Sin responder', '=COUNTA(Invitados!B2:B)-COUNTIF(Invitados!D2:D,"si")-COUNTIF(Invitados!D2:D,"no")'],
    ['Personas que asisten', '=SUM(Invitados!F2:F)']
  ]);
  s.getRange('A1:A6').setFontWeight('bold');
  s.autoResizeColumn(1);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function sheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" not found. Run setup().');
  return sheet;
}

function readRows_() {
  var data = sheet_().getDataRange().getValues();
  if (data.length < 2) return [];
  var col = colIndex_(data[0]);
  return data.slice(1).filter(function (r) { return r[col.invitacion]; }).map(function (r) {
    var o = {};
    HEADERS.forEach(function (h) { o[h] = r[col[h]]; });
    return o;
  });
}

function colIndex_(headerRow) {
  var idx = {};
  HEADERS.forEach(function (h) {
    var i = headerRow.map(function (x) { return String(x).trim().toLowerCase(); }).indexOf(h);
    if (i === -1) throw new Error('Missing column: ' + h);
    idx[h] = i;
  });
  return idx;
}

/** True when the request carries the access code (or no code is configured). */
function authorized_(k) {
  var code = PropertiesService.getScriptProperties().getProperty('ACCESS_CODE');
  if (!code) return true;
  return norm_(k || '') === norm_(code);
}

function splitNames_(v) {
  return String(v || '').split(',').map(function (n) { return n.trim(); }).filter(Boolean);
}

function norm_(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function randomId_() {
  var chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  var out = '';
  for (var i = 0; i < 6; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
