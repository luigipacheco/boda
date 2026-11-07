// Language toggle: flips <html data-lang> between es/en and remembers it.
(function () {
  var root = document.documentElement;
  function setLang(l) {
    root.setAttribute('data-lang', l);
    root.setAttribute('lang', l);
    try { localStorage.setItem('lang', l); } catch (e) {}
    document.dispatchEvent(new CustomEvent('langchange', { detail: l }));
  }
  document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setLang(root.getAttribute('data-lang') === 'es' ? 'en' : 'es');
    });
  });
  // ?lang=en in a shared link forces a language once.
  var m = location.search.match(/[?&]lang=(es|en)\b/);
  if (m) setLang(m[1]);
  window.getLang = function () { return root.getAttribute('data-lang') || 'es'; };
})();
