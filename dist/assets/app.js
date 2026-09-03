(function () {
  "use strict";

  const data = window.NAQADA_DATA;
  if (!data) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const number = new Intl.NumberFormat("ar-EG");

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeArabic(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/[ـ]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function safeExternalUrl(url) {
    return /^https:\/\//i.test(String(url ?? "")) ? String(url) : null;
  }

  function cleanPhone(phone) {
    return String(phone ?? "").replace(/[^+\d]/g, "");
  }

  function categoryMark(category) {
    const marks = {
      "الطب والصحة": "ص",
      "التعليم": "ع",
      "المطاعم والأطعمة": "م",
      "التجزئة والتسوق": "ت",
      "الخدمات الحكومية": "ح",
      "الخدمات المهنية": "خ",
      "السيارات والنقل": "ن",
      "الإلكترونيات والهواتف": "إ",
      "المقاولات والصيانة": "ب",
      "المساجد ودور العبادة": "د",
    };
    return marks[category] || String(category || "ن").trim().charAt(0) || "ن";
  }

  function statusLabel(status) {
    const labels = {
      ready: "جاهز للنشر",
      historical_ready: "سجل تاريخي موثق",
      ready_with_caution: "موثق بحدود",
    };
    return labels[status] || status || "موثق";
  }

  function recordTypeLabel(type) {
    const labels = {
      current_family: "عائلة حالية",
      current_family_partial: "عائلة حالية — تفاصيل جزئية",
      historical_branch: "فرع تاريخي",
      historical_family: "سجل عائلي تاريخي",
      historical_origin_outmigration: "أصل تاريخي وانتقال",
      family_presence_signal: "حضور عائلي",
      family_core: "عائلة",
    };
    return labels[type] || String(type || "سجل عائلي").replaceAll("_", " ");
  }

  function fillGlobalCounts() {
    $$('[data-count="businesses"]').forEach((el) => { el.textContent = number.format(data.meta.businessCount); });
    $$('[data-count="localities"]').forEach((el) => { el.textContent = number.format(data.meta.localityCount); });
    $$('[data-count="families"]').forEach((el) => { el.textContent = number.format(data.meta.familyCount); });
    $$('[data-count="heritage"]').forEach((el) => { el.textContent = number.format(data.meta.peopleCount + data.meta.landmarkCount); });
    $$('[data-updated]').forEach((el) => { el.textContent = data.meta.updatedAt; });
  }

  function optionMarkup(items, allLabel) {
    return `<option value="">${escapeHTML(allLabel)}</option>${items.map((item) => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`).join("")}`;
  }

  function businessCard(item) {
    const rating = typeof item.rating === "number"
      ? `<span class="rating" aria-label="التقييم ${escapeHTML(item.rating)} من 5">${escapeHTML(item.rating)}${item.reviews ? ` <small>(${number.format(item.reviews)})</small>` : ""}</span>`
      : "";
    const call = item.phone
      ? `<a class="button" href="tel:${escapeHTML(cleanPhone(item.phone))}" aria-label="اتصال بـ ${escapeHTML(item.name)}">اتصال</a>`
      : "";
    const maps = safeExternalUrl(item.mapsUrl)
      ? `<a class="button-secondary" href="${escapeHTML(item.mapsUrl)}" target="_blank" rel="noopener noreferrer">الخريطة</a>`
      : "";
    const actionCount = 1 + Number(Boolean(call)) + Number(Boolean(maps));
    return `
      <article class="business-card">
        <div class="card-top">
          <span class="category-sign" aria-hidden="true">${escapeHTML(categoryMark(item.category))}</span>
          <div class="card-title">
            <h3>${escapeHTML(item.name)}</h3>
            <p>${escapeHTML(item.subcategory || item.category)}</p>
          </div>
          ${rating}
        </div>
        <p class="card-address">${escapeHTML(item.address || item.locality || "مركز نقادة")}</p>
        <div class="card-meta">
          <span class="meta-pill">${escapeHTML(item.locality || "نقادة")}</span>
          <span class="status-pill">موثق ${escapeHTML(item.verification || "")}</span>
        </div>
        <div class="card-actions${actionCount <= 1 ? " one-action" : ""}">
          ${call || maps || ""}
          ${call && maps ? maps : ""}
          <button class="button-secondary" type="button" data-business="${escapeHTML(item.id)}">التفاصيل</button>
        </div>
      </article>`;
  }

  function openBusinessDialog(item) {
    const dialog = $("#business-dialog");
    if (!dialog) return;
    const mapUrl = safeExternalUrl(item.mapsUrl);
    const phone = item.phone ? cleanPhone(item.phone) : null;
    $("#dialog-body", dialog).innerHTML = `
      <h2>${escapeHTML(item.name)}</h2>
      <p>${escapeHTML(item.subcategory || item.category)} · ${escapeHTML(item.locality || "مركز نقادة")}</p>
      <div class="detail-list">
        ${item.address ? `<div class="detail-row"><span>العنوان</span><span>${escapeHTML(item.address)}</span></div>` : ""}
        ${item.phone ? `<div class="detail-row"><span>الهاتف</span><span dir="ltr">${escapeHTML(item.phone)}</span></div>` : ""}
        ${item.hours ? `<div class="detail-row"><span>ساعات العمل</span><span>${escapeHTML(item.hours)}</span></div>` : ""}
        ${typeof item.rating === "number" ? `<div class="detail-row"><span>التقييم</span><span>${escapeHTML(item.rating)} من 5${item.reviews ? ` — ${number.format(item.reviews)} مراجعة` : ""}</span></div>` : ""}
        <div class="detail-row"><span>التحقق</span><span>درجة ${escapeHTML(item.verification || "A")} · آخر مراجعة ${escapeHTML(item.checked || data.meta.updatedAt)}</span></div>
      </div>
      <div class="card-actions${phone && mapUrl ? "" : " one-action"}">
        ${phone ? `<a class="button" href="tel:${escapeHTML(phone)}">اتصال الآن</a>` : ""}
        ${mapUrl ? `<a class="button-secondary" href="${escapeHTML(mapUrl)}" target="_blank" rel="noopener noreferrer">فتح في الخرائط</a>` : ""}
      </div>`;
    dialog.showModal();
  }

  function setupDialog() {
    const dialog = $("#business-dialog");
    if (!dialog) return;
    $("[data-close-dialog]", dialog)?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  function setupHome() {
    const grid = $("#business-grid");
    if (!grid) return;
    const queryInput = $("#directory-search");
    const categorySelect = $("#category-filter");
    const localitySelect = $("#locality-filter");
    const reset = $("#reset-filters");
    const resultCount = $("#result-count");
    const pagination = $("#pagination");
    const quick = $("#quick-categories");
    const params = new URLSearchParams(location.search);
    const state = {
      query: params.get("q") || "",
      category: params.get("category") || "",
      locality: params.get("locality") || "",
      page: Math.max(1, Number(params.get("page")) || 1),
      pageSize: 12,
    };

    categorySelect.innerHTML = optionMarkup(data.categoryCounts.map((item) => item.name), "كل التصنيفات");
    localitySelect.innerHTML = optionMarkup(data.localityCounts.map((item) => item.name), "كل المناطق");
    queryInput.value = state.query;
    categorySelect.value = state.category;
    localitySelect.value = state.locality;

    quick.innerHTML = data.categoryCounts.slice(0, 8).map((item) => `
      <button class="category-chip${state.category === item.name ? " is-active" : ""}" type="button" data-category="${escapeHTML(item.name)}">
        ${escapeHTML(item.name)} <span>(${number.format(item.count)})</span>
      </button>`).join("");

    function filtered() {
      const query = normalizeArabic(state.query);
      const tokens = query.split(" ").filter(Boolean);
      return data.businesses.filter((item) => {
        if (state.category && item.category !== state.category) return false;
        if (state.locality && item.locality !== state.locality) return false;
        if (!tokens.length) return true;
        const haystack = normalizeArabic([item.name, item.normalizedName, item.category, item.subcategory, item.locality, item.address].filter(Boolean).join(" "));
        return tokens.every((token) => haystack.includes(token));
      }).sort((a, b) => (Number(b.reviews) || 0) - (Number(a.reviews) || 0) || (Number(b.rating) || 0) - (Number(a.rating) || 0) || a.name.localeCompare(b.name, "ar"));
    }

    function syncUrl() {
      const next = new URLSearchParams();
      if (state.query) next.set("q", state.query);
      if (state.category) next.set("category", state.category);
      if (state.locality) next.set("locality", state.locality);
      if (state.page > 1) next.set("page", String(state.page));
      const suffix = next.toString();
      history.replaceState(null, "", `${location.pathname}${suffix ? `?${suffix}` : ""}`);
    }

    function renderPagination(total) {
      const pages = Math.max(1, Math.ceil(total / state.pageSize));
      state.page = Math.min(state.page, pages);
      if (pages <= 1) {
        pagination.innerHTML = "";
        return;
      }
      const start = Math.max(1, Math.min(state.page - 2, pages - 4));
      const end = Math.min(pages, start + 4);
      const buttons = [];
      buttons.push(`<button class="page-button" type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="الصفحة السابقة">‹</button>`);
      for (let page = start; page <= end; page += 1) {
        buttons.push(`<button class="page-button${page === state.page ? " is-active" : ""}" type="button" data-page="${page}" aria-label="الصفحة ${page}" ${page === state.page ? 'aria-current="page"' : ""}>${number.format(page)}</button>`);
      }
      buttons.push(`<button class="page-button" type="button" data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""} aria-label="الصفحة التالية">›</button>`);
      pagination.innerHTML = buttons.join("");
    }

    function render() {
      const matches = filtered();
      const start = (state.page - 1) * state.pageSize;
      const pageItems = matches.slice(start, start + state.pageSize);
      resultCount.textContent = `${number.format(matches.length)} نتيجة`;
      grid.innerHTML = pageItems.length
        ? pageItems.map(businessCard).join("")
        : `<div class="empty-state"><strong>لا توجد نتيجة مطابقة</strong><p>جرّب اسمًا أقصر أو اختر منطقة وتصنيفًا مختلفين.</p></div>`;
      $$("[data-category]", quick).forEach((button) => button.classList.toggle("is-active", button.dataset.category === state.category));
      renderPagination(matches.length);
      syncUrl();
    }

    let inputTimer;
    queryInput.addEventListener("input", () => {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(() => {
        state.query = queryInput.value.trim();
        state.page = 1;
        render();
      }, 140);
    });
    categorySelect.addEventListener("change", () => { state.category = categorySelect.value; state.page = 1; render(); });
    localitySelect.addEventListener("change", () => { state.locality = localitySelect.value; state.page = 1; render(); });
    reset.addEventListener("click", () => {
      state.query = "";
      state.category = "";
      state.locality = "";
      state.page = 1;
      queryInput.value = "";
      categorySelect.value = "";
      localitySelect.value = "";
      queryInput.focus();
      render();
    });
    quick.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category]");
      if (!button) return;
      state.category = state.category === button.dataset.category ? "" : button.dataset.category;
      categorySelect.value = state.category;
      state.page = 1;
      render();
    });
    pagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) return;
      state.page = Number(button.dataset.page);
      render();
      $("#results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-business]");
      if (!button) return;
      const item = data.businesses.find((record) => record.id === button.dataset.business);
      if (item) openBusinessDialog(item);
    });

    setupDialog();
    render();
  }

  function setupVillages() {
    const grid = $("#locality-grid");
    if (!grid) return;
    const input = $("#locality-search");
    const count = $("#locality-result-count");
    const businessCounts = new Map(data.localityCounts.map((item) => [item.name, item.count]));
    const localityMap = new Map();
    data.localities.forEach((item) => {
      if (!localityMap.has(item.name)) localityMap.set(item.name, item);
    });
    const items = [...localityMap.values()].sort((a, b) => (businessCounts.get(b.name) || 0) - (businessCounts.get(a.name) || 0) || a.name.localeCompare(b.name, "ar"));

    function render() {
      const query = normalizeArabic(input.value);
      const filtered = items.filter((item) => normalizeArabic([item.name, item.type, item.scope, item.classification].filter(Boolean).join(" ")).includes(query));
      count.textContent = `${number.format(filtered.length)} موضعًا`;
      grid.innerHTML = filtered.length ? filtered.map((item) => {
        const businessCount = businessCounts.get(item.name) || 0;
        return `
          <article class="info-card">
            <div class="card-top">
              <span class="category-sign" aria-hidden="true">م</span>
              <div class="card-title"><h2>${escapeHTML(item.name)}</h2><p>${escapeHTML(item.type || item.classification || "موضع محلي")}</p></div>
              <span class="grade-pill">${number.format(businessCount)}</span>
            </div>
            <p>${escapeHTML(item.scope || item.center || "مركز نقادة")}</p>
            <div class="card-meta"><span class="status-pill">${escapeHTML(item.verification || "موثق")}</span></div>
            <div class="card-actions one-action">
              <a class="button-secondary" href="./?locality=${encodeURIComponent(item.name)}">عرض ${number.format(businessCount)} سجل</a>
            </div>
          </article>`;
      }).join("") : `<div class="empty-state"><strong>لا يوجد موضع بهذا الاسم</strong><p>جرّب كتابة جزء من الاسم.</p></div>`;
    }
    input.addEventListener("input", render);
    render();
  }

  function setupFamilies() {
    const grid = $("#family-grid");
    if (!grid) return;
    const input = $("#family-search");
    const locality = $("#family-locality");
    const grade = $("#family-grade");
    const count = $("#family-result-count");
    const localities = [...new Set(data.families.map((item) => item.locality).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
    locality.innerHTML = optionMarkup(localities, "كل المواضع");

    function render() {
      const query = normalizeArabic(input.value);
      const filtered = data.families.filter((item) => {
        if (locality.value && item.locality !== locality.value) return false;
        if (grade.value && item.grade !== grade.value) return false;
        return !query || normalizeArabic([item.name, item.alias, item.locality, item.landmark, item.historical].filter(Boolean).join(" ")).includes(query);
      });
      count.textContent = `${number.format(filtered.length)} سجلًا`;
      grid.innerHTML = filtered.length ? filtered.map((item) => {
        const source = safeExternalUrl(item.source1);
        return `
          <article class="family-card">
            <div class="card-top">
              <span class="category-sign" aria-hidden="true">ع</span>
              <div class="card-title"><h2>${escapeHTML(item.name)}</h2><p>${escapeHTML(item.alias || recordTypeLabel(item.type))}</p></div>
              <span class="grade-pill">${escapeHTML(item.grade)}</span>
            </div>
            <div class="card-meta">
              <span class="meta-pill">${escapeHTML(item.locality)}</span>
              <span class="status-pill">${escapeHTML(statusLabel(item.status))}</span>
            </div>
            <p>${escapeHTML(item.scope || item.evidence || "سجل عائلي موثق بحدود المصدر.")}</p>
            ${item.landmark ? `<div class="evidence-block"><strong>المعلم/الديوان:</strong> ${escapeHTML(item.landmark)}</div>` : ""}
            ${item.caution ? `<div class="caution-note">${escapeHTML(item.caution)}</div>` : ""}
            ${source ? `<div class="card-actions one-action"><a class="button-secondary" href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer">المصدر الأساسي</a></div>` : ""}
          </article>`;
      }).join("") : `<div class="empty-state"><strong>لا يوجد سجل مطابق</strong><p>غيّر الاسم أو الموضع أو درجة الدليل.</p></div>`;
    }
    input.addEventListener("input", render);
    locality.addEventListener("change", render);
    grade.addEventListener("change", render);
    render();
  }

  function heritageCard(item, kind) {
    const source = safeExternalUrl(item.source1);
    const isPerson = kind === "people";
    return `
      <article class="heritage-card">
        <div class="card-top">
          <span class="category-sign" aria-hidden="true">${isPerson ? "ش" : "م"}</span>
          <div class="card-title"><h2>${escapeHTML(item.name)}</h2><p>${escapeHTML(isPerson ? item.role : item.type)}</p></div>
          <span class="grade-pill">${escapeHTML(item.grade)}</span>
        </div>
        <div class="card-meta">
          <span class="meta-pill">${escapeHTML(isPerson ? "أسمنت" : item.locality)}</span>
          <span class="status-pill">${escapeHTML(statusLabel(item.status))}</span>
        </div>
        <p>${escapeHTML(item.summary)}</p>
        ${isPerson && item.family ? `<div class="evidence-block"><strong>الرابط العائلي الصريح:</strong> ${escapeHTML(item.family)}</div>` : ""}
        ${!isPerson && item.person ? `<div class="evidence-block"><strong>شخصية مرتبطة:</strong> ${escapeHTML(item.person)}</div>` : ""}
        ${item.caution ? `<div class="caution-note">${escapeHTML(item.caution)}</div>` : ""}
        ${source ? `<div class="card-actions one-action"><a class="button-secondary" href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer">فتح المصدر</a></div>` : ""}
      </article>`;
  }

  function setupHeritage() {
    const grid = $("#heritage-grid");
    if (!grid) return;
    const buttons = $$('[role="tab"]');
    const count = $("#heritage-result-count");
    let active = "landmarks";

    function render() {
      const items = active === "landmarks" ? data.landmarks : data.people;
      count.textContent = `${number.format(items.length)} سجلًا`;
      grid.innerHTML = items.map((item) => heritageCard(item, active)).join("");
      buttons.forEach((button) => button.setAttribute("aria-selected", String(button.dataset.tab === active)));
    }

    buttons.forEach((button) => button.addEventListener("click", () => { active = button.dataset.tab; render(); }));
    render();
  }

  function setupAbout() {
    const activitySources = data.businesses.filter((item) => item.placeId).length;
    const el = $("#place-id-count");
    if (el) el.textContent = number.format(activitySources);
  }

  fillGlobalCounts();
  setupHome();
  setupVillages();
  setupFamilies();
  setupHeritage();
  setupAbout();
})();
