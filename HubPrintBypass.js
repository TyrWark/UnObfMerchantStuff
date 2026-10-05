// ==UserScript==
// @name         Label Override Hub
// @namespace    https://github.com/TyrWark/TheMasterKeyLightspeed
// @version      1.0.0
// @description  Adds override label buttons to the Item and Purchase Order views
// @match        https://us.merchantos.com/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function () {
	'use strict';

	const ITEM_BTN_ID = 'loh-item-label-btn';
	const PO_BTN_ID = 'loh-po-label-btn';

	const getAccountId = () => unsafeWindow.merchantos && unsafeWindow.merchantos.account && unsafeWindow.merchantos.account.id;
	const getRecordId = () => location.href.split('=')[3].split('&')[0];

	function currentPage() {
		const params = new URLSearchParams(location.search);
		if (params.get('form_name') !== 'view') return null;
		const name = params.get('name');
		if (name === 'item.views.item') return 'item';
		if (name === 'purchase.views.purchase') return 'po';
		return null;
	}

	function itemUrl() {
		return `https://us.merchantos.com/API/Account/${getAccountId()}/DisplayTemplate/ItemAsLabel/${getRecordId()}.html?template=ItemLabel&print=1&shopID=1&labelSize=2.00x1.00`;
	}

	function poUrl() {
		return `https://us.merchantos.com/API/Account/${getAccountId()}/DisplayTemplate/OrderLineAsLabel.html?template=ItemLabel&print=1&shopID=1&labelSize=2.00x1.00&all_labels=1&orderID=${getRecordId()}`;
	}

	function openUrl(buildUrl) {
		return (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (!getAccountId()) {
				alert('Label Override Hub: account ID not available yet.');
				return;
			}
			window.open(buildUrl(), '_blank');
		};
	}

	function ensureItemButton() {
		if (document.getElementById(ITEM_BTN_ID)) return;
		const anchor = document.getElementById('printLabelButton');
		if (!anchor) return;
		const btn = document.createElement('button');
		btn.id = ITEM_BTN_ID;
		btn.type = 'button';
		btn.className = anchor.className;
		btn.textContent = 'Print Label (Override)';
		btn.title = 'Print Label (Override)';
		btn.addEventListener('click', openUrl(itemUrl));
		anchor.insertAdjacentElement('afterend', btn);
	}

	function ensurePoButton() {
		if (document.getElementById(PO_BTN_ID)) return;
		const anchor = document.querySelector('[data-react-root="PrintDropDown"]');
		if (!anchor) return;
		const btn = document.createElement('button');
		btn.id = PO_BTN_ID;
		btn.type = 'button';
		btn.className = 'gui-def-button';
		btn.style.cssText = 'float:left;height:34px;margin-left:6px;';
		btn.textContent = 'Print Labels (Override)';
		btn.title = 'Print Labels (Override)';
		btn.addEventListener('click', openUrl(poUrl));
		anchor.insertAdjacentElement('afterend', btn);
	}

	function removeStale(page) {
		if (page !== 'item') document.getElementById(ITEM_BTN_ID)?.remove();
		if (page !== 'po') document.getElementById(PO_BTN_ID)?.remove();
	}

	function check() {
		const page = currentPage();
		removeStale(page);
		if (page === 'item') ensureItemButton();
		else if (page === 'po') ensurePoButton();
	}

	// LS is an SPA: hook history + popstate, and observe DOM since views render async after route changes.
	let scheduled = false;
	function scheduleCheck() {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(() => {
			scheduled = false;
			check();
		});
	}

	['pushState', 'replaceState'].forEach((name) => {
		const original = history[name];
		history[name] = function (...args) {
			const result = original.apply(this, args);
			queueMicrotask(scheduleCheck);
			return result;
		};
	});
	window.addEventListener('popstate', scheduleCheck);
	window.addEventListener('hashchange', scheduleCheck);

	function startObserver() {
		new MutationObserver(scheduleCheck).observe(document.body, { childList: true, subtree: true });
		scheduleCheck();
	}

	if (document.body) startObserver();
	else document.addEventListener('DOMContentLoaded', startObserver, { once: true });
})();
