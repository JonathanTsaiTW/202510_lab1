(function(){
	// cookie helpers
	function setCookie(name, value, days) {
		const d = new Date();
		d.setTime(d.getTime() + (days*24*60*60*1000));
		document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${d.toUTCString()};SameSite=Lax`;
	}
	function getCookie(name) {
		const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
		return v ? decodeURIComponent(v.pop()) : null;
	}
	function eraseCookie(name) {
		setCookie(name, '', -1);
	}

	const keys = { player: 'ttt_player', computer: 'ttt_computer', draw: 'ttt_draw' };

	function toInt(v){ const n = parseInt(v,10); return isNaN(n)?0:n; }

	function loadScoresFromCookie(){
		const p = toInt(getCookie(keys.player));
		const c = toInt(getCookie(keys.computer));
		const d = toInt(getCookie(keys.draw));
		const elP = document.getElementById('playerScore');
		const elC = document.getElementById('computerScore');
		const elD = document.getElementById('drawScore');
		if(elP) elP.textContent = p;
		if(elC) elC.textContent = c;
		if(elD) elD.textContent = d;
	}

	function saveScoresToCookie(){
		const elP = document.getElementById('playerScore');
		const elC = document.getElementById('computerScore');
		const elD = document.getElementById('drawScore');
		if(elP) setCookie(keys.player, toInt(elP.textContent), 365);
		if(elC) setCookie(keys.computer, toInt(elC.textContent), 365);
		if(elD) setCookie(keys.draw, toInt(elD.textContent), 365);
	}

	function resetScoresOnPageAndCookie(){
		const elP = document.getElementById('playerScore');
		const elC = document.getElementById('computerScore');
		const elD = document.getElementById('drawScore');
		if(elP) elP.textContent = '0';
		if(elC) elC.textContent = '0';
		if(elD) elD.textContent = '0';
		eraseCookie(keys.player);
		eraseCookie(keys.computer);
		eraseCookie(keys.draw);
	}

	// 監聽分數 DOM 變更，自動儲存（防止需修改原有遊戲邏輯）
	function observeScoreChanges(){
		const targets = ['playerScore','computerScore','drawScore'].map(id=>document.getElementById(id)).filter(Boolean);
		if(!targets.length) return;
		const obs = new MutationObserver(function(muts){
			// 簡單 debounce：只要有變動就儲存
			saveScoresToCookie();
		});
		targets.forEach(t => obs.observe(t, { characterData: true, childList: true, subtree: true }));
		// 當頁面卸載時保險儲存一次
		window.addEventListener('beforeunload', saveScoresToCookie);
	}

	document.addEventListener('DOMContentLoaded', function(){
		loadScoresFromCookie();
		observeScoreChanges();

		// 綁定「重置分數」按鈕
		const resetScoreBtn = document.getElementById('resetScoreBtn');
		if(resetScoreBtn){
			resetScoreBtn.addEventListener('click', function(){
				resetScoresOnPageAndCookie();
			});
		}

		// 提供全域函式，供原有遊戲邏輯在更新分數後呼叫（若需要）
		window.__ttt_saveScoresToCookie = saveScoresToCookie;
		window.__ttt_loadScoresFromCookie = loadScoresFromCookie;
		window.__ttt_resetScores = resetScoresOnPageAndCookie;
	});
})();
