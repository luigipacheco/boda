// Days / hours until the wedding. Reads the ISO date from data-date.
(function () {
  var el = document.querySelector('[data-countdown]');
  if (!el) return;
  var target = new Date(el.getAttribute('data-date') + 'T00:00:00');
  function tick() {
    var ms = target - new Date();
    if (ms <= 0) { el.classList.add('hidden'); return; }
    var days = Math.floor(ms / 864e5);
    var hours = Math.floor((ms % 864e5) / 36e5);
    el.querySelector('[data-days]').textContent = days;
    el.querySelector('[data-hours]').textContent = hours;
  }
  tick();
  setInterval(tick, 60 * 1000);
})();
