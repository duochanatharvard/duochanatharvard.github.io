// main.js

// === 0. 全局配置 (Global Configuration) ===
// 在这里统一管理所有需要折叠的 Section ID 和对应的按钮文字
const TOGGLE_CONFIG = {
    'publications': { expand: 'Full Publication List', collapse: 'Highlighted Publications' },
    'dcentstory':   { expand: 'Read The Full Story',   collapse: 'Read Less' },
    'past':         { expand: 'Read More',             collapse: 'Read Less' }
    // 如果未来 outreach 也需要折叠，只需在这里加一行即可：
    // 'outreach': { expand: 'Show Outreach', collapse: 'Hide Outreach' }
};

// === 1. 文献渲染工具函数 ===
function renderReferences(scope = document) {
    if (typeof refs === 'undefined') {
        console.warn("references.js is not loaded yet.");
        return;
    }
    scope.querySelectorAll("[data-ref]").forEach(el => {
        const key = el.getAttribute("data-ref");
        if (refs[key] && el.innerHTML.trim() === "") {
            el.innerHTML = refs[key];
        }
    });
}

// === 2. 页面加载核心逻辑 (Include Loader) ===
document.addEventListener("DOMContentLoaded", () => {
    
    // 2.1 先尝试渲染主页面上原本就有的文献引用
    renderReferences();

    // 2.2 处理动态引入 (include-html)
    const elements = document.querySelectorAll('[include-html]');

    elements.forEach(el => {
        const file = el.getAttribute('include-html');
        
        if (file) {
            fetch(file)
            .then(response => {
                if (response.ok) return response.text();
                throw new Error('Page not found');
            })
            .then(text => {
                // 填入内容
                el.innerHTML = text;
                el.removeAttribute('include-html'); 
                
                // A. 重新渲染引用
                renderReferences(el); 

                // B. 【全局修复】尝试初始化折叠功能
                // 检查被加载内容的父级 ID 是否在配置表中
                if (el.parentElement && TOGGLE_CONFIG[el.parentElement.id]) {
                    setupToggle(el.parentElement, TOGGLE_CONFIG[el.parentElement.id]);
                }
            })
            .catch(err => {
                el.innerHTML = "Could not load file: " + file;
                console.error(err);
            });
        }
    });

    // 2.3 【全局修复】处理页面上已有的静态内容 (非 include 加载的部分)
    // 遍历配置表，如果元素存在且还没初始化，就进行初始化
    Object.keys(TOGGLE_CONFIG).forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            setupToggle(section, TOGGLE_CONFIG[id]);
        }
    });
});

// === 3. 辅助函数 (Offset & Scroll) ===
function getTopOffset(){
    return window.innerWidth <= 640 ? 70 : 0; 
}

function smoothScrollTo(sel){
    const el = document.querySelector(sel); if(!el) return;
    openParentDetails(el);                         
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const y = el.getBoundingClientRect().top + window.pageYOffset - getTopOffset();
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
}

// === 4. 导航栏交互逻辑 ===
var btn = document.querySelector('.menu-toggle');
if (btn) {
    btn.addEventListener('click', function(){
        document.body.classList.toggle('nav-open');
        btn.setAttribute('aria-expanded', document.body.classList.contains('nav-open'));
    });
}

var links = document.querySelectorAll('.sidenav ul a');
for (var i = 0; i < links.length; i++){
    links[i].addEventListener('click', function(e){
        e.preventDefault();
        var target = this.getAttribute('href');
        smoothScrollTo(target);
        var id = target && target.charAt(0)==='#' ? target.slice(1) : null;
        if (id) setActive(id);
        if (window.innerWidth <= 640){ 
            document.body.classList.remove('nav-open'); 
            if(btn) btn.setAttribute('aria-expanded','false'); 
        }
    });
}

// === 5. Scroll Spy (滚动监听) ===
var sections = document.querySelectorAll('section.panel');
var byId = {}, bySection = {};
for(var i = 0; i < links.length; i++){
    var l = links[i];
    var href = l.getAttribute('href');
    if(href && href.charAt(0) === '#'){ byId[href.slice(1)] = l; }
    if(l.dataset.section){ bySection[l.dataset.section] = l; }
}

var currentId = null;
function setActive(id){
    if(id === currentId) return;
    currentId = id;
    for (var m = 0; m < links.length; m++) links[m].removeAttribute('aria-current');
    var link = byId[id];
    if (!link) return;
    link.setAttribute('aria-current','true');
    var parentKey = link.dataset.parent;
    if (parentKey && bySection[parentKey]) bySection[parentKey].setAttribute('aria-current','true');
}

function updateActive(){
    const offset = getTopOffset() + 5;
    let bestId = null;
    for (let s = 0; s < sections.length; s++){
        const r = sections[s].getBoundingClientRect();
        if (r.top <= offset && r.bottom > offset){ bestId = sections[s].id; break; }
    }
    if (!bestId && sections.length > 0) bestId = sections[0].id;
    setActive(bestId);
}

var ticking = false;
function onScroll(){ 
    if(!ticking){ 
        requestAnimationFrame(function(){ updateActive(); ticking = false; }); 
        ticking = true; 
    } 
}

window.addEventListener('scroll', onScroll, {passive:true});
window.addEventListener('resize', onScroll);
window.addEventListener('load', updateActive);

// === 6. Hash 处理 & Details 展开 ===
function openParentDetails(el){
    for (var p = el && el.parentElement; p; p = p.parentElement){
        if (p.tagName === 'DETAILS') p.open = true;
    }
}
window.addEventListener('hashchange', function(){
    if (!location.hash) return;
    var el = document.getElementById(location.hash.slice(1));
    if (el){ openParentDetails(el); el.scrollIntoView({behavior:'smooth', block:'start'}); }
});
updateActive();

// === 7. Toggle (折叠面板逻辑) ===
function setupToggle(section, labels){
    if (!section) return; 

    // 【防重锁】检查是否已经初始化过，防止重复绑定事件
    if (section.dataset.toggleInitialized === 'true') {
        return; 
    }

    const btn = section.querySelector('.toggle-btn');
    const summary = section.querySelector('.summary');
    const detail = section.querySelector('.detail');
    
    // 如果找不到必要的 DOM 元素，说明 HTML 结构还没准备好（或者结构有误），直接返回
    if(!btn || !summary || !detail) return;

    // 标记为已初始化
    section.dataset.toggleInitialized = 'true';

    if(!detail.id){ detail.id = section.id + '-detail'; }
    btn.setAttribute('aria-controls', detail.id);

    function setExpanded(expanded){
        btn.setAttribute('aria-expanded', expanded);
        summary.hidden = expanded;
        detail.hidden = !expanded;
        btn.textContent = expanded ? labels.collapse : labels.expand;
    }

    // Initial state
    setExpanded(false);

    btn.addEventListener('click', function(){
        const next = btn.getAttribute('aria-expanded') !== 'true';
        setExpanded(next);
    });
}