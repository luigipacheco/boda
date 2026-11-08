// RSVP front end. Each invitation has a code (the id column in the Sheet).
// Guests type it, see their names, tick who is coming, and can come back to change it.
// Backend: tools/apps-script/Code.gs. All strings are bilingual via T[lang].
(function () {
  var form = document.getElementById('rsvp');
  if (!form) return;
  var endpoint = form.getAttribute('data-endpoint');

  var T = {
    es: {
      codeNeeded: 'Escribe el código que viene en tu invitación.',
      codeBad: 'No encontramos ese código. Revísalo en tu invitación o escríbenos abajo.',
      checking: 'Buscando…',
      people: function (n) { return n === 1 ? '1 persona' : n + ' personas'; },
      pickOne: 'Marca al menos una persona.',
      saving: 'Guardando…',
      savedYes: '¡Gracias! Quedó confirmada su asistencia. Pueden volver con su código y cambiarlo cuando quieran.',
      savedNo: 'Gracias por avisarnos. Si cambian de planes, vuelvan aquí con su código y actualícenlo.',
      error: 'Algo falló. Intenta de nuevo o escríbenos.',
      offline: 'El registro aún no está activo. Vuelve pronto.',
      previous: function (s, c) {
        if (s === 'si') return 'Ya habían confirmado a ' + (c === 1 ? '1 persona' : c + ' personas') + '. Pueden cambiarlo abajo.';
        if (s === 'no') return 'Habían indicado que no podrían asistir. Pueden cambiarlo abajo.';
        return '';
      }
    },
    en: {
      codeNeeded: 'Enter the code printed on your invitation.',
      codeBad: 'We could not find that code. Check your invitation or write to us below.',
      checking: 'Looking it up…',
      people: function (n) { return n === 1 ? '1 person' : n + ' people'; },
      pickOne: 'Tick at least one person.',
      saving: 'Saving…',
      savedYes: 'Thank you! Your attendance is confirmed. You can come back with your code and change it any time.',
      savedNo: 'Thanks for letting us know. If plans change, come back here with your code and update it.',
      error: 'Something went wrong. Try again or write to us.',
      offline: 'RSVP is not open yet. Please check back soon.',
      previous: function (s, c) {
        if (s === 'si') return 'You had confirmed ' + (c === 1 ? '1 person' : c + ' people') + '. You can change it below.';
        if (s === 'no') return 'You had told us you could not attend. You can change it below.';
        return '';
      }
    }
  };
  function t(key) { var l = (window.getLang && window.getLang()) || 'es'; var v = T[l][key]; return typeof v === 'function' ? v.apply(null, [].slice.call(arguments, 1)) : v; }

  var codeWrap = form.querySelector('#code-wrap');
  var codeInput = form.querySelector('#code');
  var codeHint = form.querySelector('#code-hint');
  var codeGo = form.querySelector('#code-go');
  var codeChange = form.querySelector('#code-change');
  var card = form.querySelector('#selected');
  var nameEl = card.querySelector('.name');
  var prevEl = card.querySelector('.previous');
  var namesWrap = form.querySelector('#names-wrap');
  var namesEl = form.querySelector('#names');
  var note = form.querySelector('#note');
  var submit = form.querySelector('#submit');
  var status = form.querySelector('#status');
  var selected = null;

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }
  function setStatus(msg, cls) { status.textContent = msg; status.className = 'status ' + (cls || ''); if (!msg) hide(status); else show(status); }

  if (!endpoint) {
    codeInput.disabled = true; codeGo.disabled = true;
    codeHint.textContent = t('offline');
    return;
  }

  // --- code -----------------------------------------------------------------
  var code = '';
  try { code = localStorage.getItem('rsvp_code') || ''; } catch (e) {}
  var cm = location.search.match(/[?&](?:c|code|k)=([^&]+)/);
  if (cm) code = decodeURIComponent(cm[1].replace(/\+/g, ' '));

  function remember(c) {
    code = String(c || '').trim();
    try { if (code) localStorage.setItem('rsvp_code', code); else localStorage.removeItem('rsvp_code'); } catch (e) {}
  }
  function askCode(msg) {
    selected = null;
    hide(card); show(codeWrap); setStatus('');
    codeInput.value = code; codeHint.textContent = msg || '';
    codeInput.focus();
  }
  function lookup(c) {
    c = String(c || '').trim();
    if (c.length < 3) { codeHint.textContent = t('codeNeeded'); return; }
    codeHint.textContent = t('checking'); codeGo.disabled = true;
    fetch(endpoint + '?code=' + encodeURIComponent(c), { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        codeGo.disabled = false;
        if (!data.invitation) { codeHint.textContent = t('codeBad'); return; }
        remember(c);
        select(data.invitation);
      })
      .catch(function () { codeGo.disabled = false; codeHint.textContent = t('error'); });
  }
  codeGo.addEventListener('click', function () { lookup(codeInput.value); });
  codeInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); lookup(codeInput.value); } });
  codeChange.addEventListener('click', function (e) { e.preventDefault(); remember(''); askCode(''); });

  // --- invitation card ------------------------------------------------------
  function select(m) {
    selected = m;
    hide(codeWrap); codeHint.textContent = '';
    nameEl.textContent = m.invitacion;
    prevEl.textContent = t('previous', m.asistencia, (m.asisten || []).length);
    namesEl.innerHTML = '';
    var tick = m.asistencia === 'si' ? (m.asisten || []) : (m.nombres || []);
    (m.nombres || []).forEach(function (n, i) {
      var id = 'p' + i;
      var wrap = document.createElement('div'); wrap.className = 'name-row';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.name = 'asisten'; cb.value = n; cb.checked = tick.indexOf(n) !== -1;
      var lb = document.createElement('label'); lb.htmlFor = id; lb.textContent = n;
      wrap.appendChild(cb); wrap.appendChild(lb); namesEl.appendChild(wrap);
    });
    note.value = m.nota || '';
    form.querySelectorAll('input[name="asistencia"]').forEach(function (r) { r.checked = false; });
    var pre = form.querySelector('input[name="asistencia"][value="' + m.asistencia + '"]');
    if (pre) pre.checked = true;
    toggleNames();
    show(card);
  }
  function toggleNames() {
    var v = form.querySelector('input[name="asistencia"]:checked');
    if (v && v.value === 'si') show(namesWrap); else hide(namesWrap);
  }
  form.querySelectorAll('input[name="asistencia"]').forEach(function (r) { r.addEventListener('change', toggleNames); });

  // --- submit ---------------------------------------------------------------
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!selected) return;
    var choice = form.querySelector('input[name="asistencia"]:checked');
    if (!choice) return;
    var asisten = [].map.call(form.querySelectorAll('input[name="asisten"]:checked'), function (c) { return c.value; });
    if (choice.value === 'si' && asisten.length === 0) { setStatus(t('pickOne'), 'err'); return; }
    var payload = {
      id: selected.id,
      asistencia: choice.value,
      asisten: choice.value === 'si' ? asisten : [],
      nota: note.value.trim().slice(0, 300)
    };
    submit.disabled = true;
    setStatus(t('saving'));
    fetch(endpoint, {
      method: 'POST',
      // text/plain avoids a CORS preflight, which Apps Script cannot answer.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error || 'error');
        setStatus(payload.asistencia === 'si' ? t('savedYes') : t('savedNo'), 'ok');
        selected.asistencia = payload.asistencia; selected.asisten = payload.asisten;
        prevEl.textContent = t('previous', selected.asistencia, selected.asisten.length);
      })
      .catch(function () { setStatus(t('error'), 'err'); })
      .then(function () { submit.disabled = false; });
  });

  // Re-render dynamic strings when the language flips.
  document.addEventListener('langchange', function () {
    if (selected) prevEl.textContent = t('previous', selected.asistencia, (selected.asisten || []).length);
  });

  if (code) { codeInput.value = code; lookup(code); } else { askCode(''); }
})();
