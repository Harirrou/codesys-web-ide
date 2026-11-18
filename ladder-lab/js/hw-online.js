/* Ladder Lab — Online simulator: compile, download, go online, compare, upload, force. Mounted in lessons through [[hw:online]]. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  LL.HW.online = function (ph) {
    const box = document.createElement('div');
    box.className = 'hw-box hw-online';
    box.textContent = 'Online simulator: compile, download, go online, compare, upload, force (coming)';
    ph.replaceWith(box);
  };
})();
