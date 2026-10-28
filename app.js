/* ZEF storefront — no account, cookies, payment or third party tracking. */
(() => {
  'use strict';
  const products = window.ZEF_PRODUCTS || [];
  const byId = new Map(products.map(p => [p.id, p]));
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const money = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = s => String(s).toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim();
  let storageWarning = false;
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { if (!storageWarning) { storageWarning = true; toast('Браузер не сохраняет подборку. Она доступна до закрытия страницы.'); } }
  }
  const savedFavorites = read('zef:favorites', []);
  const favorites = new Set((Array.isArray(savedFavorites) ? savedFavorites : []).filter(id => byId.has(id)));
  const savedCart = read('zef:cart', []);
  let cart = (Array.isArray(savedCart) ? savedCart : []).filter(item => item && byId.has(item.id) && byId.get(item.id).sizes.includes(item.size) && Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 10);
  let category = 'all', query = '', maxPrice = 'all', selectedSize = 'all', sort = 'new', visibleCount = 12, onlyFavorites = false;
  let currentProduct = null, currentImage = 0, toastTimer;
  let lastFocus = null;

  function toast(message, action, callback) {
    clearTimeout(toastTimer);
    const el = $('#toast');
    el.replaceChildren(document.createTextNode(message));
    if (action) {
      const button = document.createElement('button');
      button.textContent = action;
      button.addEventListener('click', () => { callback(); el.hidden = true; });
      el.append(button);
    }
    el.hidden = false;
    toastTimer = setTimeout(() => { el.hidden = true; }, action ? 8500 : 5000);
  }

  function openDialog(id) {
    lastFocus = document.activeElement;
    const dialog = $(id);
    $$('dialog[open]').filter(d => d !== dialog).forEach(d => d.close());
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    requestAnimationFrame(() => {
      const target = dialog.querySelector('[autofocus],input:not([type=radio]),.size-option input,.detail-add,.search-result,button:not([data-close]),a') || dialog.querySelector('button');
      target?.focus({ preventScroll: true });
    });
  }
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('click', e => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (!dialog.open && dialog.id === 'product-dialog' && location.hash.startsWith('#product/')) history.replaceState(null, '', '#catalog');
      if (dialog.id === 'menu-dialog') $('.menu-toggle').setAttribute('aria-expanded', 'false');
      requestAnimationFrame(() => { if (!$('dialog[open]') && lastFocus?.isConnected) lastFocus.focus({ preventScroll: true }); });
    });
  });

  function productCard(p) {
    const saved = favorites.has(p.id);
    const range = p.sizes.length > 1 ? `${p.sizes[0]}–${p.sizes.at(-1)}` : (p.sizes[0] === 'Уточнить' ? 'Размер уточняется' : p.sizes[0]);
    return `<article class="product-card" data-id="${p.id}"><div class="product-image-wrap"><button class="product-open" data-product="${p.id}" aria-label="${esc(p.name)}, ${money(p.price)}"><img class="product-image" src="${p.images[0]}" alt="${esc(p.name)} — фото ZEF" width="540" height="720" loading="lazy" decoding="async">${p.images[1] ? `<img class="product-image product-image-alt" src="${p.images[1]}" alt="" width="540" height="720" loading="lazy" decoding="async">` : ''}<span class="quick-view">Рассмотреть ${icon('up-right')}</span></button>${p.tag ? `<span class="product-tag ${p.tag === 'NEW' ? 'tag-new' : ''}">${p.tag}</span>` : ''}<button class="favorite-button icon-button" data-favorite="${p.id}" aria-label="${saved ? 'Убрать из избранного' : 'Сохранить'}: ${esc(p.name)}" aria-pressed="${saved}">${icon('heart')}</button></div><div class="product-info"><span class="product-meta">${esc(p.brand)}</span><h3><button class="product-name" data-product="${p.id}">${esc(p.name)}</button></h3><span class="product-price">${money(p.price)}</span><span class="product-sizes">${range === 'Размер уточняется' ? range : 'Размеры: ' + range}</span></div></article>`;
  }

  function filteredProducts() {
    let result = products.filter(p => (category === 'all' || p.category === category) && (!onlyFavorites || favorites.has(p.id)) && (maxPrice === 'all' || p.price <= Number(maxPrice)) && (selectedSize === 'all' || p.sizes.includes(selectedSize)) && (!query || normalize(`${p.name} ${p.brand} ${p.categoryName} ${p.description}`).includes(normalize(query))));
    if (sort === 'price-asc') result.sort((a,b) => a.price-b.price);
    if (sort === 'price-desc') result.sort((a,b) => b.price-a.price);
    return result;
  }
  function renderCatalog() {
    const list = filteredProducts();
    $('#product-grid').innerHTML = list.length ? list.slice(0,visibleCount).map(productCard).join('') : `<div class="empty-state">${icon('search')}<h3>Пока не нашлось</h3><p>Попробуй другую категорию или убери часть фильтров.</p><button class="button button-outline" data-action="reset">Сбросить фильтры ${icon('arrow')}</button></div>`;
    const count = Math.min(visibleCount, list.length);
    $('#catalog-progress').textContent = `Показано ${count} из ${list.length}`;
    $('#load-more').hidden = count >= list.length;
    $('#catalog-status').textContent = `Найдено вещей: ${list.length}. Показано: ${count}.`;
    $$('.category-tab').forEach(tab => {
      const active = tab.dataset.category === category;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', String(active));
    });
    const chips = [];
    if (query) chips.push({name:`Поиск: ${query}`,key:'query'});
    if (maxPrice !== 'all') chips.push({name:`До ${money(Number(maxPrice))}`,key:'price'});
    if (selectedSize !== 'all') chips.push({name:`Размер ${selectedSize}`,key:'size'});
    if (onlyFavorites) chips.push({name:'Только избранное',key:'favorites'});
    $('#active-filters').innerHTML = chips.map(c => `<button class="filter-chip" data-remove-filter="${c.key}">${esc(c.name)} ${icon('close')}</button>`).join('');
    $('#active-filters').hidden = !chips.length;
    $('#filter-count').textContent = chips.length;
    $('#filter-count').hidden = !chips.length;
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }
  function resetFilters() {
    category='all';query='';maxPrice='all';selectedSize='all';sort='new';onlyFavorites=false;visibleCount=12;
    $('#catalog-search').value='';$('#price-filter').value='all';$('#size-filter').value='all';$('#sort-filter').value='new';
    renderCatalog();
  }
  function updateCounts() {
    const count = cart.reduce((n,item) => n+item.qty,0);
    $$('.cart-count').forEach(el => { el.textContent = count; });
    $('.bag-button').setAttribute('aria-label',`Корзина, вещей: ${count}`);
    $$('.favorite-count').forEach(el => { el.textContent = favorites.size; el.hidden = !favorites.size; });
  }
  function toggleFavorite(id) {
    if (!byId.has(id)) return;
    if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
    save('zef:favorites',[...favorites]);
    $$(`[data-favorite="${id}"]`).forEach(button => {
      button.setAttribute('aria-pressed',String(favorites.has(id)));
      button.setAttribute('aria-label',`${favorites.has(id) ? 'Убрать из избранного' : 'Сохранить'}: ${byId.get(id).name}`);
      button.classList.toggle('is-saved',favorites.has(id));
    });
    updateCounts();
    if ($('#favorites-dialog').open) renderFavorites();
    if (onlyFavorites) renderCatalog();
  }

  function openProduct(id, updateHash = true) {
    const p = byId.get(id);
    if (!p) return;
    currentProduct=p;currentImage=0;
    $('#product-detail').innerHTML = `<div class="product-detail"><div class="detail-gallery"><img id="detail-main-image" class="detail-main-image" src="${p.images[0]}" alt="${esc(p.name)} — фото 1" width="1080" height="1350"><div class="gallery-controls">${p.images.length>1 ? `<button class="icon-button" data-gallery-step="-1" aria-label="Предыдущее фото">${icon('arrow').replace('class="icon"','class="icon reverse"')}</button>` : ''}<div class="gallery-thumbs">${p.images.map((src,i) => `<button class="gallery-thumb ${i===0?'is-active':''}" data-gallery-index="${i}" aria-label="Фото ${i+1}" aria-pressed="${i===0}"><img src="${src}" alt="" width="48" height="64"></button>`).join('')}</div>${p.images.length>1 ? `<button class="icon-button" data-gallery-step="1" aria-label="Следующее фото">${icon('arrow')}</button>` : ''}</div></div><div class="detail-copy"><span class="detail-brand">${esc(p.brand)} / ZEF SELECTION</span><h2 id="product-name">${esc(p.name)}</h2><p class="detail-price">${money(p.price)}</p><p class="detail-description">${esc(p.description)}</p><fieldset class="size-fieldset"><legend>Выбери размер для запроса</legend><div class="size-options">${p.sizes.map(size=>`<label class="size-option"><input type="radio" name="product-size" value="${esc(size)}" ${size==='Уточнить'?'checked':''} aria-describedby="size-help"><span>${esc(size)}</span></label>`).join('')}</div></fieldset><p class="size-help" id="size-help" role="status">${p.sizes[0]==='Уточнить'?'Размер подберём с менеджером.':'Размерный ряд из публикации.'}</p><div class="detail-actions"><button class="button button-accent detail-add" id="add-to-cart">В мой выбор ${icon('plus')}</button><button class="icon-button ${favorites.has(id)?'is-saved':''}" data-favorite="${id}" aria-label="Сохранить: ${esc(p.name)}" aria-pressed="${favorites.has(id)}">${icon('heart')}</button></div><div class="detail-facts"><p>Цена и размеры указаны по публикации. Актуальную стоимость, наличие, состав и замеры уточнит менеджер.</p><p>Самара, Центральная, 26 · Каждый день 11:00–20:00<br>Доставка по Самаре и России — по согласованию.</p><a class="detail-source" href="${p.source}" target="_blank" rel="noopener noreferrer">Смотреть публикацию ZEF ${icon('up-right')}</a></div></div></div>`;
    openDialog('#product-dialog');
    if (updateHash) history.pushState({product:id},'',`#product/${id}`);
  }
  function setGallery(index) {
    if (!currentProduct) return;
    currentImage=(index+currentProduct.images.length)%currentProduct.images.length;
    const image=$('#detail-main-image');
    image.src=currentProduct.images[currentImage];
    image.alt=`${currentProduct.name} — фото ${currentImage+1}`;
    $$('.gallery-thumb').forEach((b,i) => { b.classList.toggle('is-active',i===currentImage);b.setAttribute('aria-pressed',String(i===currentImage)); });
    if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo(image,{opacity:.4},{opacity:1,duration:.3,overwrite:true});
  }
  function addToCart() {
    const radio=$('input[name=product-size]:checked');
    if (!radio) {
      $('#size-help').textContent='Выбери размер — мы уточним его наличие.';
      $('#size-help').classList.add('is-error');
      $('input[name=product-size]')?.focus({preventScroll:true});
      return;
    }
    const p=currentProduct,size=radio.value;
    const item=cart.find(item=>item.id===p.id&&item.size===size);
    if (item && item.qty>=10) { toast('В подборке уже 10 таких вещей. Большее количество уточни у менеджера.');return; }
    if (item) item.qty++; else cart.push({id:p.id,size,qty:1});
    save('zef:cart',cart);updateCounts();
    const button=$('#add-to-cart');
    button.innerHTML=`Добавлено ${icon('check')}`;
    button.disabled=true;
    setTimeout(()=>{ if (button.isConnected) {button.innerHTML=`В мой выбор ${icon('plus')}`;button.disabled=false;} },1000);
    $('#size-help').classList.remove('is-error');
    $('#size-help').textContent=`В подборке: размер ${size}.`;
    toast('Вещь добавлена в твой выбор','Открыть',()=>{renderCart();openDialog('#cart-dialog');});
  }

  function renderCart() {
    const content=$('#cart-content');
    if (!cart.length) { content.innerHTML=`<div class="empty-state">${icon('bag')}<h3>Здесь будет твой выбор</h3><p>Собери вещи, которые нравятся. Размеры и наличие уточним вместе.</p><button class="button button-light" data-action="browse">Выбрать вещь ${icon('arrow')}</button></div>`;return; }
    const total=cart.reduce((n,item)=>n+byId.get(item.id).price*item.qty,0);
    content.innerHTML=`<div class="cart-list">${cart.map((item,index)=>{const p=byId.get(item.id);return `<article class="cart-item"><button data-product="${p.id}" aria-label="${esc(p.name)}"><img src="${p.images[0]}" alt="${esc(p.name)}" width="80" height="112"></button><div class="cart-item-info"><button class="cart-item-name" data-product="${p.id}">${esc(p.name)}</button><span class="cart-item-size">Размер: ${esc(item.size)}</span><span class="cart-item-price">${money(p.price*item.qty)}</span><div class="quantity-control"><button data-quantity="-1" data-index="${index}" aria-label="Уменьшить количество: ${esc(p.name)}">${icon('minus')}</button><span aria-label="Количество">${item.qty}</span><button data-quantity="1" data-index="${index}" ${item.qty>=10?'disabled':''} aria-label="Увеличить количество: ${esc(p.name)}">${icon('plus')}</button></div></div><button class="cart-remove icon-button" data-remove-cart="${index}" aria-label="Убрать: ${esc(p.name)}">${icon('close')}</button></article>`;}).join('')}</div><div class="cart-summary"><div class="cart-total"><span>Предварительно</span><strong>${money(total)}</strong></div><button class="button button-accent" id="prepare-order">Уточнить и заказать ${icon('telegram')}</button><p class="cart-disclaimer">Подготовим сообщение менеджеру в Telegram. Наличие, итоговую стоимость и доставку подтвердит магазин. Онлайн оплаты на сайте нет.</p></div>`;
  }
  function changeCart(index,delta) {
    const item=cart[index];if(!item)return;
    if(item.qty+delta<=0){removeCart(index);return;}
    item.qty=Math.min(10,item.qty+delta);
    save('zef:cart',cart);updateCounts();renderCart();
    const control=$(`#cart-content [data-index="${index}"][data-quantity="${delta}"]`);
    control?.focus({preventScroll:true});
  }
  function removeCart(index) {
    const [removed]=cart.splice(index,1);if(!removed)return;
    save('zef:cart',cart);updateCounts();renderCart();
    toast('Вещь убрана из подборки','Вернуть',()=>{
      const same=cart.find(i=>i.id===removed.id&&i.size===removed.size);
      if(same)same.qty=Math.min(10,same.qty+removed.qty);else cart.splice(Math.min(index,cart.length),0,removed);
      save('zef:cart',cart);updateCounts();if($('#cart-dialog').open)renderCart();
    });
  }
  function prepareOrder() {
    if(!cart.length)return;
    const total=cart.reduce((n,i)=>n+byId.get(i.id).price*i.qty,0);
    const message='Привет, ZEF! Хочу уточнить наличие и заказать:\n\n'+cart.map((item,i)=>{const p=byId.get(item.id);return `${i+1}. ${p.name}\nРазмер: ${item.size}, количество: ${item.qty}\nЦена из публикации: ${money(p.price)}\n${p.source}`;}).join('\n\n')+`\n\nПредварительная сумма: ${money(total)}.\nПодскажите актуальные цены, размеры и варианты получения.`;
    $('#cart-content').innerHTML=`<div class="order-preview"><button class="text-button" id="back-to-cart">← Вернуться к подборке</button><h3>Осталось написать</h3><p>Мы подготовили список. Проверь его и открой чат с менеджером. Если текст не подставится, скопируй сообщение.</p><label for="order-message">Твоё сообщение</label><textarea id="order-message" readonly></textarea><button class="button button-outline" id="copy-order">Скопировать список ${icon('copy')}</button><a class="button button-accent" id="telegram-order" href="https://t.me/admzef" target="_blank" rel="noopener noreferrer">Открыть Telegram ${icon('up-right')}</a><p class="cart-disclaimer">Сообщение отправляешь ты. Менеджер подтвердит наличие, стоимость и условия получения.</p></div>`;
    $('#order-message').value=message;
    $('#telegram-order').href='https://t.me/admzef?text='+encodeURIComponent(message);
    $('#back-to-cart').focus({preventScroll:true});
    $('#copy-order').addEventListener('click',async()=>{
      try {
        if(!navigator.clipboard)throw new Error('clipboard unavailable');
        await navigator.clipboard.writeText(message);
        $('#copy-order').innerHTML=`Список скопирован ${icon('check')}`;
      } catch {
        $('#order-message').focus();$('#order-message').select();
        toast('Текст выделен. Скопируй его через меню браузера или Ctrl+C.');
      }
    });
  }
  function renderFavorites() {
    $('#favorites-content').innerHTML=favorites.size?`<div class="product-grid">${products.filter(p=>favorites.has(p.id)).map(productCard).join('')}</div>`:`<div class="empty-state">${icon('heart')}<h3>Для вещей, которые зацепили</h3><p>Нажми на сердечко в каталоге. Избранное сохранится в этом браузере.</p><button class="button button-light" data-action="browse">Найти своё ${icon('arrow')}</button></div>`;
  }
  function renderSearch() {
    const q=normalize($('#global-search').value);
    const list=q?products.filter(p=>normalize(`${p.name} ${p.brand} ${p.categoryName}`).includes(q)):products.slice(0,4);
    $('#search-results').innerHTML=`<p class="search-hint" role="status">${q?`Найдено: ${list.length}`:'Начни с названия или посмотри свежую подборку'}</p>`+list.slice(0,16).map(p=>`<button class="search-result" data-product="${p.id}"><img src="${p.images[0]}" alt="" width="56" height="72"><span>${esc(p.name)}<small>${esc(p.categoryName)} / ${money(p.price)}</small></span>${icon('up-right')}</button>`).join('')+(q&&!list.length?'<p class="search-hint">Попробуй «куртка», «джинсы» или название марки.</p>':'');
  }
  function openInfo(type) {
    const privacy=type==='privacy';
    $('#info-title').textContent=privacy?'Твои данные':'Как работает заказ';
    $('#info-content').innerHTML=privacy?'<p>Избранное и подборка сохраняются в локальном хранилище твоего браузера. Сайт не использует аналитику, рекламные cookies и формы сбора персональных данных.</p><p>Твой список передаётся в Telegram только когда ты открываешь соответствующую ссылку. Сообщение отправляешь самостоятельно. Сторонние сервисы обрабатывают данные по своим правилам.</p><p>Можно удалить избранное и корзину кнопкой ниже. Данные также удаляются при очистке хранилища браузера.</p><button class="button button-outline" id="clear-local-data">Удалить мои подборки</button>':'<p>Сайт помогает выбрать вещи из опубликованных подборок ZEF и подготовить сообщение менеджеру. Добавление в корзину не резервирует товар и не подтверждает покупку.</p><p>Цены, фотографии и размерные ряды взяты из публикаций магазина. Наличие, итоговую стоимость, состав, условия оплаты, доставки и возврата согласуй с менеджером до покупки.</p><p>Контакт магазина: <a href="https://t.me/admzef" target="_blank" rel="noopener noreferrer">@admzef</a>. Самара, ул. Центральная, 26. Каждый день с 11:00 до 20:00.</p>';
    openDialog('#info-dialog');
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest('button,a');if(!button)return;
    if(button.hasAttribute('data-close')){button.closest('dialog').close();return;}
    if(button.dataset.product){e.preventDefault();openProduct(button.dataset.product);return;}
    if(button.dataset.favorite){toggleFavorite(button.dataset.favorite);return;}
    if(button.dataset.category){category=button.dataset.category;visibleCount=12;renderCatalog();return;}
    if(button.dataset.collection){category=button.dataset.collection;query='';maxPrice='all';selectedSize='all';visibleCount=12;onlyFavorites=false;$('#catalog-search').value='';$('#price-filter').value='all';$('#size-filter').value='all';renderCatalog();}
    if(button.dataset.galleryIndex!==undefined){setGallery(Number(button.dataset.galleryIndex));return;}
    if(button.dataset.galleryStep){setGallery(currentImage+Number(button.dataset.galleryStep));return;}
    if(button.dataset.quantity){changeCart(Number(button.dataset.index),Number(button.dataset.quantity));return;}
    if(button.dataset.removeCart!==undefined){removeCart(Number(button.dataset.removeCart));return;}
    if(button.dataset.removeFilter){
      const key=button.dataset.removeFilter;
      if(key==='query'){query='';$('#catalog-search').value='';}
      if(key==='price'){maxPrice='all';$('#price-filter').value='all';}
      if(key==='size'){selectedSize='all';$('#size-filter').value='all';}
      if(key==='favorites')onlyFavorites=false;
      visibleCount=12;renderCatalog();return;
    }
    const action=button.dataset.action;
    if(action==='search'){renderSearch();openDialog('#search-dialog');}
    if(action==='favorites'){renderFavorites();openDialog('#favorites-dialog');}
    if(action==='cart'){renderCart();openDialog('#cart-dialog');}
    if(action==='menu'){openDialog('#menu-dialog');$('.menu-toggle').setAttribute('aria-expanded','true');}
    if(action==='reset'){resetFilters();}
    if(action==='privacy'||action==='terms')openInfo(action);
    if(action==='browse'){$$('dialog[open]').forEach(d=>d.close());$('#catalog').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
    if(button.id==='add-to-cart')addToCart();
    if(button.id==='prepare-order')prepareOrder();
    if(button.id==='back-to-cart')renderCart();
    if(button.id==='clear-local-data'){
      const previous={cart:[...cart],favorites:[...favorites]};cart=[];favorites.clear();
      save('zef:cart',[]);save('zef:favorites',[]);updateCounts();renderCatalog();
      button.textContent='Подборки удалены';button.disabled=true;
      toast('Подборки удалены','Вернуть',()=>{cart=previous.cart;previous.favorites.forEach(id=>favorites.add(id));save('zef:cart',cart);save('zef:favorites',[...favorites]);updateCounts();renderCatalog();button.disabled=false;button.textContent='Удалить мои подборки';});
    }
    if(button.closest('#menu-dialog')&&button.matches('a[href^="#"]'))$('#menu-dialog').close();
  });
  $('#filter-toggle').addEventListener('click',()=>{
    const open=$('#filter-panel').hidden;$('#filter-panel').hidden=!open;$('#filter-toggle').setAttribute('aria-expanded',String(open));
    if(open)$('#catalog-search').focus({preventScroll:true});
    window.ScrollTrigger?.refresh();
  });
  $('#load-more').addEventListener('click',()=>{
    const previous=visibleCount;visibleCount+=12;renderCatalog();
    const next=$$('#product-grid .product-open')[previous];next?.focus({preventScroll:true});
  });
  $('#reset-filters').addEventListener('click',resetFilters);
  let searchTimer;
  $('#catalog-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{query=$('#catalog-search').value;visibleCount=12;renderCatalog();},200);});
  $('#price-filter').addEventListener('change',e=>{maxPrice=e.target.value;visibleCount=12;renderCatalog();});
  $('#size-filter').addEventListener('change',e=>{selectedSize=e.target.value;visibleCount=12;renderCatalog();});
  $('#sort-filter').addEventListener('change',e=>{sort=e.target.value;renderCatalog();});
  let globalSearchTimer;
  $('#global-search').addEventListener('input',()=>{clearTimeout(globalSearchTimer);globalSearchTimer=setTimeout(renderSearch,180);});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && $('dialog[open]')){e.preventDefault();$('dialog[open]').close();return;}
    if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();renderSearch();openDialog('#search-dialog');}
    if($('#product-dialog').open&&e.target.tagName!=='INPUT'){
      if(e.key==='ArrowRight')setGallery(currentImage+1);
      if(e.key==='ArrowLeft')setGallery(currentImage-1);
    }
  });
  document.addEventListener('change',e=>{if(e.target.name==='product-size'){$('#size-help').classList.remove('is-error');$('#size-help').textContent='Наличие выбранного размера уточнит менеджер.';}});
  const sizeOptions=[...new Set(products.flatMap(p=>p.sizes))].filter(s=>s!=='Уточнить').sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}));
  $('#size-filter').insertAdjacentHTML('beforeend',sizeOptions.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join(''));
  function handleHash(){const m=location.hash.match(/^#product\/(\d+)$/);if(m&&byId.has(m[1]))openProduct(m[1],false);else if($('#product-dialog').open)$('#product-dialog').close();}
  window.addEventListener('hashchange',handleHash);
  window.addEventListener('popstate',handleHash);
  window.addEventListener('storage',e=>{if(e.key==='zef:cart'||e.key==='zef:favorites')toast('Подборка изменена в другой вкладке. Обнови страницу, чтобы увидеть её.');});
  const sections=$$('main>section[id]');
  const navObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){$$('.desktop-nav a').forEach(link=>link.classList.toggle('is-current',link.hash==='#'+entry.target.id));}},{rootMargin:'-10% 0px -65% 0px'});
  sections.forEach(section=>navObserver.observe(section));
  $$('svg.icon').forEach(svg=>svg.setAttribute('aria-hidden','true'));
  renderCatalog();updateCounts();handleHash();
  // A broken photograph must keep its caption and usable product link.
  document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement){e.target.alt+=' — фото не загрузилось';e.target.classList.add('image-error');}},true);
  window.ZEF={products,openProduct,renderCatalog};
})();
