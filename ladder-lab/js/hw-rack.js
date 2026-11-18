/* Ladder Lab — Rack simulator: modules, slots and I/O addresses. Mounted in lessons through [[hw:rack]]. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  LL.HW.rack = function (ph) {
    const box = document.createElement('div');
    box.className = 'hw-box hw-rack';
    box.textContent = 'Rack simulator: modules, slots and I/O addresses (coming)';
    ph.replaceWith(box);
  };
})();
