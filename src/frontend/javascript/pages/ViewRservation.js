    xLuIncludeFile();

    function handleVeto(btn) {
    const row = btn.closest('.user-row');
    if (btn.classList.contains('veto-btn--done')) return;
    btn.textContent = '✓ Vetado';
    btn.classList.add('veto-btn--done');
    btn.disabled = true;
    row.classList.add('user-row--vetoed');
}
