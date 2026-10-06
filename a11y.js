/**
 * a11y.js - keyboard and screen-reader support for ViewAlign's menus and
 * windows, added on top of the mouse-driven UI in script.js:
 *  - menu headers are focusable buttons: Enter, Space or Down opens the menu
 *    and moves focus into it, Esc closes it and returns focus to the header,
 *    and moving focus out of a menu closes it;
 *  - the windows (dialogs) take focus when they open, keep Tab inside while
 *    they are modal, close on Esc, and give focus back to where it was;
 *  - controls named only by a tooltip get that text as their accessible
 *    name, and the status line is announced to screen readers.
 */
(function () {
    'use strict';

    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const isShown = node => !!node && node.style.display !== 'none' && getComputedStyle(node).display !== 'none' && node.getClientRects().length > 0;
    const focusables = root => Array.from(root.querySelectorAll(FOCUSABLE)).filter(n => n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden');

    // ---------------- menus ----------------
    function sectionOf(header) { return header.closest('.menu-section'); }
    function groupOf(section) { return section.querySelector(':scope > .control-group'); }

    function openMenuFromKeyboard(section) {
        if (typeof openMenuSection === 'function') openMenuSection(section);
        else section.classList.add('menu-open');
        const group = groupOf(section);
        const first = group && focusables(group).find(n => !n.closest('.panel-detach-handle'));
        if (first) first.focus();
    }

    function closeMenuFromKeyboard(section, returnFocus) {
        if (typeof clearMenuCloseDelay === 'function') clearMenuCloseDelay(section);
        section.classList.remove('menu-open', 'hover-active');
        if (returnFocus) section.querySelector(':scope > .section-header')?.focus();
    }

    function setupMenus() {
        document.querySelectorAll('.menu-section > .section-header').forEach((header, i) => {
            const section = sectionOf(header);
            const group = groupOf(section);
            const label = (header.querySelector('span')?.textContent || header.textContent || 'Menu').trim();
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');
            header.setAttribute('aria-haspopup', 'true');
            header.setAttribute('aria-expanded', 'false');
            header.setAttribute('aria-label', label + ' menu');
            if (group) {
                if (!group.id) group.id = `menu-group-${i}`;
                header.setAttribute('aria-controls', group.id);
                group.setAttribute('role', 'group');
                group.setAttribute('aria-label', label);
            }
            header.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                    openMenuFromKeyboard(section);
                }
            });
            section.addEventListener('focusout', e => {
                if (e.relatedTarget && section.contains(e.relatedTarget)) return;
                if (group && group.classList.contains('detached')) return;
                if (section.matches(':hover')) return;
                if (!e.relatedTarget) return; // focus left the page or went to body: keep the hover behaviour
                closeMenuFromKeyboard(section, false);
            });
            // aria-expanded follows the menu's open state, however it was opened
            new MutationObserver(() => {
                header.setAttribute('aria-expanded', section.classList.contains('menu-open') ? 'true' : 'false');
            }).observe(section, { attributes: true, attributeFilter: ['class'] });
        });
    }

    // ---------------- windows (dialogs) ----------------
    const DIALOGS = {
        // id: { modal, close: selector of the button that closes it }
        infoModal: { modal: true, close: null },
        addSeqModal: { modal: true, close: '#addSeqCancelButton' },
        clusteringModal: { modal: false, close: '#clusteringModalClose' },
        colourInspectorModal: { modal: false, close: '.win-close[title="Close"]' },
        dotPlotModal: { modal: false, close: '#dotPlotCloseBtn' },
        repeatFinderModal: { modal: false, close: '#repeatFinderCloseBtn' },
        seqEditModal: { modal: true, close: '#seqEditCloseBtn' },
        // Esc first clears a column selection in the matrix (script.js)
        statsModal: { modal: false, close: '#statsCloseBtn', escapeFirst: () => typeof state !== 'undefined' && !!(state._statsSelCols && state._statsSelCols.size) },
        treeBuilderModal: { modal: false, close: '#treeBuilderCloseBtn' },
    };
    const openOrder = []; // dialogs in the order they were shown
    const returnFocusTo = new Map();

    function closeDialog(id) {
        const node = document.getElementById(id);
        const sel = DIALOGS[id].close;
        const btn = sel && node.querySelector(sel);
        if (btn) btn.click();
        else node.style.display = 'none';
    }

    function topDialog() {
        for (let i = openOrder.length - 1; i >= 0; i--) {
            const node = document.getElementById(openOrder[i]);
            if (isShown(node)) return node;
        }
        return null;
    }

    function setupDialogs() {
        for (const [id, cfg] of Object.entries(DIALOGS)) {
            const node = document.getElementById(id);
            if (!node) continue;
            node.setAttribute('role', 'dialog');
            if (cfg.modal) node.setAttribute('aria-modal', 'true');
            const heading = node.querySelector('h1, h2, h3, .win-title, [class*="title"]');
            if (heading) {
                if (!heading.id) heading.id = `${id}-title`;
                node.setAttribute('aria-labelledby', heading.id);
            } else {
                node.setAttribute('aria-label', id.replace(/Modal$/, '').replace(/([A-Z])/g, ' $1').trim());
            }
            if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
            let wasShown = isShown(node);
            new MutationObserver(() => {
                const shown = isShown(node);
                if (shown === wasShown) return;
                wasShown = shown;
                const k = openOrder.indexOf(id);
                if (k >= 0) openOrder.splice(k, 1);
                if (shown) {
                    openOrder.push(id);
                    const prev = document.activeElement;
                    if (prev && prev !== document.body && !node.contains(prev)) returnFocusTo.set(id, prev);
                    // after the opener has filled the window
                    setTimeout(() => {
                        if (!isShown(node) || node.contains(document.activeElement)) return;
                        const first = focusables(node).find(n => !n.matches('.win-close, .win-maxbtn, .ge-win-btn'));
                        (first || node).focus({ preventScroll: true });
                    }, 0);
                } else {
                    const back = returnFocusTo.get(id);
                    returnFocusTo.delete(id);
                    if (back && document.contains(back) && (!document.activeElement || document.activeElement === document.body || node.contains(document.activeElement))) {
                        back.focus({ preventScroll: true });
                    }
                }
            }).observe(node, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
        }

        // Window capture runs before script.js's document-level key handler,
        // which on Esc blurs the focused element and would lose our place.
        window.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                const section = document.activeElement?.closest?.('#controls .menu-section.menu-open');
                if (section && !document.activeElement.classList.contains('seq-name-edit')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    closeMenuFromKeyboard(section, true);
                    return;
                }
            }
            const dialog = topDialog();
            if (!dialog) return;
            if (e.key === 'Escape') {
                // Esc inside a menu, popover, rename box or text field is handled there
                // first, and a window's own Esc action (clearing a selection) comes
                // before closing it
                const ae = document.activeElement;
                if (ae?.classList?.contains('seq-name-edit')) return;
                if (ae?.closest?.('.menu-section.menu-open')) return;
                if (ae && dialog.contains(ae) && (ae.tagName === 'TEXTAREA' || ae.isContentEditable
                    || (ae.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|color|range|file|image)$/i.test(ae.type || '')))) return;
                if (DIALOGS[dialog.id]?.escapeFirst?.()) return;
                if (!dialog.contains(document.activeElement) && DIALOGS[dialog.id] && !DIALOGS[dialog.id].modal) {
                    // a non-modal window only closes on Esc when it has focus
                    return;
                }
                e.preventDefault();
                e.stopImmediatePropagation();
                closeDialog(dialog.id);
                return;
            }
            if (e.key === 'Tab' && dialog.getAttribute('aria-modal') === 'true') {
                const items = focusables(dialog);
                if (!items.length) { e.preventDefault(); dialog.focus(); return; }
                const first = items[0], last = items[items.length - 1];
                if (!dialog.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
                else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }, true);
    }

    // ---------------- names and announcements ----------------
    function hasAccessibleName(n) {
        if (n.getAttribute('aria-label') || n.getAttribute('aria-labelledby')) return true;
        if (n.id && document.querySelector(`label[for="${CSS.escape(n.id)}"]`)) return true;
        // a <label> names only its first control
        const label = n.closest('label');
        if (label && label.control === n && label.textContent.trim()) return true;
        if ((n.tagName === 'BUTTON' || n.tagName === 'A') && n.textContent.trim().length > 1) return true;
        return false;
    }

    function nameControls(root = document) {
        root.querySelectorAll('button, input:not([type="hidden"]), select, textarea, a[href]').forEach(n => {
            if (hasAccessibleName(n)) return;
            const label = n.getAttribute('title') || n.getAttribute('placeholder') || n.dataset.label;
            if (label) n.setAttribute('aria-label', label.trim());
        });
    }

    function setupLiveRegions() {
        const status = document.getElementById('statusMessage');
        if (status) {
            status.setAttribute('role', 'status');
            status.setAttribute('aria-live', 'polite');
        }
    }

    function init() {
        setupMenus();
        setupDialogs();
        setupLiveRegions();
        nameControls();
        // Controls added later (windows filled on open, menus built on demand).
        // Only the menus, the windows and top-level popups are watched: the
        // alignment itself creates thousands of nodes per render.
        let pending = false;
        const rename = () => {
            if (pending) return;
            pending = true;
            setTimeout(() => { pending = false; nameControls(); }, 200);
        };
        const mo = new MutationObserver(rename);
        const controls = document.getElementById('controls');
        if (controls) mo.observe(controls, { childList: true, subtree: true });
        for (const id of Object.keys(DIALOGS)) {
            const node = document.getElementById(id);
            if (node) mo.observe(node, { childList: true, subtree: true });
        }
        mo.observe(document.body, { childList: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
