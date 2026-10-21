/* Shared web / native WebView navigation. No authentication or storage side effects. */
(function (root) {
  'use strict';
  const groups = [
    ['매매 정보', [['trading-today','오늘의 판단'],['market-movers','오늘의 급등·급하락'],['market-news','뉴스·이슈'],['watch-stocks','관심종목'],['my-stocks','내 보유종목'],['stock-search','종목검색']]],
    ['리서치', [['overview', '홈'], ['trade-recommendations', '매수·매도 판단'], ['investment-signals', '투자 신호'], ['global-influence', '영향력 인물'], ['research-results', '연구 결과'], ['market-analysis', '시장 분석'], ['candidates', '후보'], ['stock-analysis', '종목 분석'], ['peer-validation', '동종기업 비교']]],
    ['모의 기록·성과', [['paper-portfolio', '모의 포트폴리오'], ['performance', '보고서·성과']]],
    ['데이터·설정·이용 안내', [['agent-dashboard', '검증 운영'], ['holdings', '미국 공시'], ['sources', '공식 데이터 출처'], ['settings', '설정·서버 연결']]]
  ];
  function availableGroups(document) {
    return groups.map(([label, items]) => [label, items.filter(([id]) => document.getElementById(id === 'overview' ? 'research-home' : id) || (id === 'overview' && document.getElementById('overview')))]).filter(([, items]) => items.length);
  }
  function install(document, window) {
    const rail = document.querySelector('.rail');
    const header = document.querySelector('.topbar');
    if (!rail || !header) return;
    // Older web shells receive the same menu with only their existing destinations.
    if (!document.getElementById('overview')) {
      const main = document.querySelector('main'); if (main) main.id = 'overview';
    }
    let menu = document.querySelector('.workspace-menu');
    if (!menu) {
      menu = document.createElement('details'); menu.className = 'workspace-menu';
      const summary = document.createElement('summary'); summary.textContent = '전체 메뉴';
      const nav = document.createElement('nav'); nav.setAttribute('aria-label', '전체 화면');
      menu.append(summary, nav); header.append(menu);
    }
    const full = menu.querySelector('nav');
    let bottom = document.querySelector('.bottom-nav');
    if (!bottom) { bottom = document.createElement('nav'); bottom.className = 'bottom-nav'; bottom.setAttribute('aria-label', '모바일 주요 메뉴'); document.body.append(bottom); }
    const hasPrivacy = Boolean(document.querySelector('a[href="/privacy.html"]'));
    if (!full) return;
    const available = availableGroups(document);
    function link(id, label, railLink) {
      const node = document.createElement('a'); node.href = '#' + id; node.textContent = label;
      if (railLink) node.className = 'rail-link';
      return node;
    }
    function fill(target, railLinks) {
      for (const [label, items] of available) {
        const title = document.createElement('p'); title.className = 'navigation-group'; title.textContent = label; target.append(title);
        for (const [id, label] of items) target.append(link(id, label, railLinks));
      }
      if (!hasPrivacy) return;
      const privacy = document.createElement('a'); privacy.href = '/privacy.html'; privacy.textContent = '개인정보·이용 안내 (검토본)';
      if (railLinks) privacy.className = 'rail-link';
      target.append(privacy);
    }
    const railNav = document.createElement('nav'); railNav.setAttribute('aria-label', '전체 기능'); fill(railNav, true);
    for (const node of rail.querySelectorAll('.rail-label, .rail-link')) node.remove();
    rail.insertBefore(railNav, rail.querySelector('.rail-bottom'));
    full.replaceChildren(); fill(full, false);
    menu.id = 'workspace-navigation';
    const summary = menu.querySelector('summary'); summary.setAttribute('aria-label', '전체 메뉴 열기');
    bottom.replaceChildren();
    const primary=document.getElementById('trading-today')?[['trading-today','오늘의 판단'],['watch-stocks','관심종목'],['my-stocks','보유종목'],['stock-search','종목검색']]:[['overview', '홈'], ['investment-signals', '신호'], ['paper-portfolio', '모의 기록'], ['research-results', '연구']];
    for (const [id, label] of primary) {
      if (available.some(([, items]) => items.some(([key]) => key === id))) bottom.append(link(id, label));
    }
    const more = document.createElement('button'); more.type = 'button'; more.textContent = '전체 메뉴'; more.setAttribute('aria-controls', menu.id);
    bottom.append(more);
    function expanded() { more.setAttribute('aria-expanded', String(menu.open)); }
    function active() {
      const id = window.location.hash.slice(1) || 'overview';
      const section = document.getElementById(id)?.closest('.main > section');
      for (const node of document.querySelectorAll('.rail nav a, .workspace-menu nav a, .bottom-nav a')) {
        const key = node.getAttribute('href').slice(1);
        const selected = key === id || (key === 'overview' && id === 'research-home') || (section && key === section.id);
        node.classList.toggle('active', Boolean(selected));
        if (selected) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current');
      }
    }
    more.addEventListener('click', event => { event.stopPropagation(); menu.open = !menu.open; expanded(); if (menu.open) { menu.scrollIntoView({block:'nearest'}); summary.focus(); } });
    menu.addEventListener('toggle', expanded);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.open) { menu.open = false; expanded(); summary.focus(); } });
    document.addEventListener('click', event => { if (!menu.contains(event.target) && event.target !== more) { menu.open = false; expanded(); } });
    full.addEventListener('click', event => {
      const anchor = event.target.closest('a');
      if (!anchor || !anchor.getAttribute('href').startsWith('#')) return;
      menu.open = false; expanded();
      // Even selecting the already active route closes the menu and restores useful focus.
      window.setTimeout(() => {
        const id = anchor.getAttribute('href').slice(1);
        const target = document.getElementById(id === 'overview' ? 'research-home' : id);
        if (target) { target.setAttribute('tabindex', '-1'); target.focus({preventScroll:true}); }
      }, 0);
    });
    window.addEventListener('hashchange', active); active(); expanded();
  }
  if (typeof module !== 'undefined') module.exports = {availableGroups, install};
  if (root.document) install(root.document, root);
})(typeof window === 'undefined' ? globalThis : window);
