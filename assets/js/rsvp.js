// RSVP front end. Talks to the Apps Script web app described in
// tools/apps-script/README.md. All strings are bilingual via T[lang].
(function () {
  var form = document.getElementById('rsvp');
  if (!form) return;
  var endpoint = form.getAttribute('data-endpoint');

  var T = {
    es: {
      typing: 'Escribe al menos 3 letras.',
      searching: 'Buscando…',
      none: 'No encontramos ese nombre. Prueba con el apellido, o escríbenos abajo.',
      seats: function (n) { return n === 1 ? '1 persona' : n + ' personas'; },
      pickOne: 'Marca al menos una persona.',
      saving: 'Guardando…',
      savedYes: '¡Gracias! Quedó confirmada tu asistencia. Puedes volver a esta página y cambiarlo cuando quieras.',
      savedNo: 'Gracias por avisarnos. Si cambias de planes, vuelve aquí y actualízalo.',
      error: 'Algo falló al guardar. Intenta de nuevo o escríbenos.',
      offline: 'El registro aún no está activo. Vuelve pronto.',
      previous: function (s, c) {
        if (s === 'si') return 'Ya habías confirmado a ' + (c === 1 ? '1 persona' : c + ' personas') + '. Puedes cambiarlo abajo.';
        if (s === 'no') return 'Habías indicado que no podrías asistir. Puedes cambiarlo abajo.';
        return '';
      }
    },
    en: {
      typing: 'Type at least 3 letters.',
      searching: 'Searching…',
      none: 'We could not find that name. Try a last name, or write to us below.',
      seats: function (n) { return n === 1 ? '1 person' : n + ' people'; },
      pickOne: 'Tick at least one person.',
      saving: 'Saving…',
      savedYes: 'Thank you! Your attendance is confirmed. You can come back to this page and change it any time.',
      savedNo: 'Thanks for letting us know. If plans change, come back here and update it.',
      error: 'Something went wrong while saving. Try again or write to us.',
      offline: 'RSVP is not open yet. Please check back soon.',
      previous: function (s, c) {
        if (s === 'si') return 'You had confirmed ' + (c === 1 ? '1 person' : c + ' people') + '. You can change it below.';
        if (s === 'no') return 'You had told us you could not attend. You can change it below.';
        return '';
      }
    }
  };
  function t(key) { var l = (window.getLang && window.getLang()) || 'es'; var v = T[l][key]; return typeof v === 'function' ? v.apply(null, [].slice.call(arguments, 1)) : v; }

  var q = form.querySelector('#q');
  var hint = form.querySelector('#hint');
  var matches = form.querySelector('#matches');
  var card = form.querySelector('#selected');
  var nameEl = card.querySelector('.name');
  var prevEl = card.querySelector('.previous');
  var namesWrap = form.querySelector('#names-wrap');
  var namesEl = form.querySelector('#names');
  var note = form.querySelector('#note');
  var submit = form.querySelector('#submit');
  var status = form.querySelector('#status');
  var selected = null;
  var timer = null;

  if (!endpoint) {
    q.disabled = true;
    hint.textContent = t('offline');
    return;
  }

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }
  function setStatus(msg, cls) { status.textContent = msg; status.className = 'status ' + (cls || ''); if (!msg) hide(status); else show(status); }

  // --- search -----------------------------------------------------------
  q.addEventListener('input', function () {
    clearTimeout(timer);
    var v = q.value.trim();
    hide(card); selected = null; setStatus('');
    if (v.length < 3) { matches.innerHTML = ''; hint.textContent = t('typing'); return; }
    hint.textContent = t('searching');
    timer = setTimeout(function () { search(v); }, 300);
  });

  function search(v) {
    fetch(endpoint + '?q=' + encodeURIComponent(v), { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        matches.innerHTML = '';
        if (!data.matches || !data.matches.length) { hint.textContent = t('none'); return; }
        hint.textContent = '';
        data.matches.forEach(function (m) {
          var li = document.createElement('li');
          var b = document.createElement('button');
          b.type = 'button';
          b.innerHTML = '<span>' + esc(m.invitacion) + '</span><span class="seats">' + t('seats', (m.nombres || []).length) + '</span>';
          b.addEventListener('click', function () { select(m); });
          li.appendChild(b);
          matches.appendChild(li);
        });
      })
      .catch(function () { hint.textContent = t('error'); });
  }

  function select(m) {
    selected = m;
    matches.innerHTML = '';
    q.value = m.invitacion;
    hint.textContent = '';
    nameEl.textContent = m.invitacion;
    prevEl.textContent = t('previous', m.asistencia, (m.asisten || []).length);
    // one checkbox per person; pre-tick previous answer, or everyone if no answer yet
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
    var pre = form.querySelector('input[name="asistencia"][value="' + m.asistencia + '"]');
    form.querySelectorAll('input[name="asistencia"]').forEach(function (r) { r.checked = false; });
    if (pre) pre.checked = true;
    toggleNames();
    show(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleNames() {
    var v = form.querySelector('input[name="asistencia"]:checked');
    if (v && v.value === 'si') show(namesWrap); else hide(namesWrap);
  }
  form.querySelectorAll('input[name="asistencia"]').forEach(function (r) { r.addEventListener('change', toggleNames); });

  // --- submit -----------------------------------------------------------
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
      })
      .catch(function () { setStatus(t('error'), 'err'); })
      .then(function () { submit.disabled = false; });
  });

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  // Re-render dynamic strings when the language flips.
  document.addEventListener('langchange', function () {
    if (q.value.trim().length < 3 && !selected) hint.textContent = t('typing');
    if (selected) { prevEl.textContent = t('previous', selected.asistencia, (selected.asisten || []).length); }
  });
  hint.textContent = t('typing');
})();
