/* Ladder Lab — Network simulator: IP addresses, subnets, device names, device files. Mounted in lessons through [[hw:net]]. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  LL.HW.net = function (ph) {
    const box = document.createElement('div');
    box.className = 'hw-box hw-net';
    box.textContent = 'Network simulator: IP addresses, subnets, device names, device files (coming)';
    ph.replaceWith(box);
  };
})();
